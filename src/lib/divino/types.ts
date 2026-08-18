// Tipos partilhados do núcleo cognitivo DIVINO IA.
export type DivinoRole = 'public' | 'user' | 'moderator' | 'admin' | 'superadmin';

export type SpecialistId =
  | 'connected-cloud'
  | 'connected-social'
  | 'connected-tv'
  | 'connected-games'
  | 'connected-marketplace'
  | 'connected-wallet'
  | 'connected-ads'
  | 'connected-jobs'
  | 'connected-ai'
  | 'connected-security'
  | 'connected-analytics'
  | 'general-knowledge'
  | 'business'
  | 'technology'
  | 'creativity'
  | 'science';

export interface DivinoEntity {
  type: string;
  value: string;
}

export interface DivinoAnalysis {
  language: string;
  intent: string;
  entities: DivinoEntity[];
  sentiment: 'positivo' | 'neutro' | 'negativo';
  goal: string;
  specialist: SpecialistId;
  references: string[];
  urgency: 'baixa' | 'media' | 'alta';
}

export interface DivinoToolResult {
  plugin: string;
  capability: string;
  ok: boolean;
  summary: string;
  data?: any;
}

export interface DivinoPendingAction {
  id: string;
  action: string;
  label: string;
  detail: string;
  requiresConfirmation: boolean;
}

export interface DivinoCognitiveReply {
  text: string;
  specialist: SpecialistId;
  source: 'knowledge' | 'memory' | 'model' | 'tool' | 'fallback';
  modelUsed?: string;
  toolsUsed: DivinoToolResult[];
  pending?: DivinoPendingAction;
  analysis?: DivinoAnalysis;
}
