// ============================================================================
// DIVINO IA — Mente Cognitiva (orquestrador)
// ----------------------------------------------------------------------------
// Pipeline: normalizar → idioma → intenção → contexto → entidades → sentimento
// → objetivo → especialista → router → autoridade → ferramenta → verificação →
// resposta. Usa LLM quando disponível; caso contrário, raciocínio determinístico.
// ============================================================================
import type { DivinoAnalysis, DivinoCognitiveReply, DivinoRole, DivinoToolResult, DivinoPendingAction } from '../types';
import { analyzeIntent } from './intent';
import { resolveContext } from './context';
import { buildSystemPrompt } from './response';
import { callGemini } from './reasoning';
import { memoryManager } from '../memory/memory-manager';
import { shortTerm } from '../memory/short-term';
import { knowledge } from '../memory/knowledge';
import { authority } from '../security/authority';
import { audit } from '../security/audit';
import { routeToCapability } from '../plugins/router';
import { CAPABILITY_ACTION } from '../plugins/permissions';
import { runCapability } from '../plugins/registry';

export interface BrainInput {
  uid: string;
  name?: string;
  role: DivinoRole;
  text: string;
  apiKey?: string;
  modelId?: string;
}

interface PendingCtx {
  uid: string;
  capability: string;
  term?: string;
}

export class DivinoBrain {
  private pending: DivinoPendingAction | null = null;
  private pendingCtx: PendingCtx | null = null;

  async think(input: BrainInput): Promise<DivinoCognitiveReply> {
    const analysis = analyzeIntent(input.text);
    resolveContext(input.uid, input.text);
    await memoryManager.storeInteraction(
      input.uid,
      'user',
      input.text,
    );

    // Atalho de conhecimento interno.
    const kb = knowledge.search(input.text);
    if (kb && (analysis.intent === 'explain' || analysis.intent === 'general')) {
      return this.finalize(input, analysis, [], kb.answer, 'knowledge');
    }

    // Encaminhamento para ferramenta real.
    const capability = routeToCapability(analysis);
    const toolsUsed: DivinoToolResult[] = [];
    if (capability) {
      const action = CAPABILITY_ACTION[capability] ?? 'read_public';
      const decision = authority.decide(input.role, action);
      await audit({ actorUid: input.uid, role: input.role, action, allowed: decision.allowed, plugin: capability });
      if (!decision.allowed) {
        return this.finalize(input, analysis, [], `Não posso executar isso: ${decision.reason}`, 'fallback');
      }
      if (decision.requiresConfirmation) {
        this.pending = {
          id: `pending_${Date.now()}`,
          action,
          label: 'Confirmar ação',
          detail: `A ação "${capability}" requer a tua confirmação.`,
          requiresConfirmation: true,
        };
        this.pendingCtx = { uid: input.uid, capability, term: this.extractTerm(input.text) };
        return {
          text: `Esta ação requer confirmação: ${this.pending.detail} Queres continuar?`,
          specialist: analysis.specialist,
          source: 'tool',
          modelUsed: input.modelId,
          toolsUsed: [],
          pending: this.pending,
          analysis,
        };
      }
      const result = await runCapability(capability, { uid: input.uid, role: input.role, term: this.extractTerm(input.text) });
      if (result) toolsUsed.push(result);
    }

    // Raciocínio + resposta.
    const toolSummary = toolsUsed.map((t) => t.summary).join(' ');
    let text: string | null = null;
    if (input.apiKey) {
      const system = buildSystemPrompt(input.role, analysis, input.name);
      const history = shortTerm.last(input.uid, 8).map((m) => ({ role: m.role, text: m.text }));
      text = await callGemini(
        input.apiKey,
        input.modelId || 'gemini-2.0-flash',
        system,
        history,
        toolSummary ? `${input.text}\nDados reais disponíveis: ${toolSummary}` : input.text
      );
    }
    if (!text) text = this.deterministicReply(analysis, toolSummary, input.name);
    return this.finalize(input, analysis, toolsUsed, text, text === toolSummary || (toolsUsed.length && !input.apiKey) ? 'tool' : 'model');
  }

  async confirm(): Promise<DivinoCognitiveReply | null> {
    if (!this.pending || !this.pendingCtx) return null;
    const result = await runCapability(this.pendingCtx.capability, {
      uid: this.pendingCtx.uid,
      role: 'user',
      term: this.pendingCtx.term,
    });
    const toolsUsed = result ? [result] : [];
    const text = result ? `Feito. ${result.summary}` : 'Ação concluída.';
    const analysis: DivinoAnalysis = {
      language: 'pt', intent: 'general', entities: [], sentiment: 'neutro', goal: '',
      specialist: 'connected-cloud', references: [], urgency: 'baixa',
    };
    this.pending = null;
    this.pendingCtx = null;
    return { text, specialist: analysis.specialist, source: 'tool', toolsUsed, analysis };
  }

  hasPending(): boolean {
    return !!this.pending;
  }

  private deterministicReply(analysis: DivinoAnalysis, toolSummary: string, name?: string): string {
    const n = name ? name.split(' ')[0] + ', ' : '';
    if (toolSummary) return `${n}${toolSummary}`;
    if (analysis.intent === 'storage_issue')
      return `${n}Entendi o problema de upload. Sugeres: 1) verifica a ligação; 2) reduz o tamanho do ficheiro; 3) o Connected Cloud retoma uploads automaticamente. Quer que eu faça um diagnóstico do CCS?`;
    if (analysis.intent === 'diagnostics')
      return `${n}Posso diagnosticar os serviços Connected. Diz se queres focar no Cloud, TV ou Games.`;
    return `${n}Estou aqui para ajudar a Connected King: diagnóstico, pesquisa de pessoas, ranking de jogos ou explicações. O que precisas?`;
  }

  private finalize(input: BrainInput, analysis: DivinoAnalysis, tools: DivinoToolResult[], text: string, source: DivinoCognitiveReply['source']): DivinoCognitiveReply {
    void memoryManager.storeInteraction(input.uid, 'assistant', text);
    return { text, specialist: analysis.specialist, source, modelUsed: input.modelId, toolsUsed: tools, analysis };
  }

  private extractTerm(text: string): string {
    const m = text.match(/(?:sobre|de|por|cham[aoá]|procur[ao]|encontr[ao])\s+([\wÀ-ÿ]{3,})/i);
    return m ? m[1] : '';
  }
}

const brains = new Map<string, DivinoBrain>();

export function getBrain(uid: string): DivinoBrain {
  let b = brains.get(uid);
  if (!b) {
    b = new DivinoBrain();
    brains.set(uid, b);
  }
  return b;
}
