// ============================================================================
// Command Bus — autoridade + confirmação + auditoria.
// ============================================================================
import { DIVINO_POLICY, rankOf } from "../divino/security/policy";
import { cloudGateway } from "../connected-reactor/gateway";
import type { AuditEntry, CommandContext, CommandDef, CommandResult } from "./types";

const pending = new Map<string, string>(); // uid:id -> token
const auditLog: AuditEntry[] = [];

function record(e: AuditEntry) {
  auditLog.unshift(e);
  if (auditLog.length > 200) auditLog.pop();
  // persistência no Object Node (audit.log)
  try {
    fetch(`${cloudGateway.base}/v1/admin/audit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(e),
    }).catch(() => {});
  } catch { /* audit local mantém o registo */ }
}

export class CommandBus {
  private defs = new Map<string, CommandDef>();

  register(d: CommandDef) { this.defs.set(d.id, d); }

  list() {
    return [...this.defs.values()].map((d) => ({ id: d.id, action: d.action, destructive: !!d.destructive }));
  }

  getAudit(): AuditEntry[] { return [...auditLog]; }

  async execute(id: string, ctx: CommandContext): Promise<CommandResult> {
    const d = this.defs.get(id);
    if (!d) return { ok: false, summary: `Comando desconhecido: ${id}` };

    const pol = DIVINO_POLICY[d.action];
    if (rankOf(ctx.role as any) < rankOf(pol.minRole)) {
      record({ ts: Date.now(), actor: ctx.uid, role: ctx.role, action: id, resource: id, result: "denied", ip: ctx.ip, session: ctx.session, reason: "sem autoridade" });
      return { ok: false, summary: "Sem autoridade para este comando." };
    }

    // destrutivas / confirmáveis exigem confirmação
    if (d.destructive || pol.confirm) {
      const key = `${ctx.uid}:${id}`;
      const expected = pending.get(key);
      if (!ctx.token || ctx.token !== expected) {
        const t = Math.random().toString(36).slice(2, 10);
        pending.set(key, t);
        record({ ts: Date.now(), actor: ctx.uid, role: ctx.role, action: id, resource: id, result: "ok", ip: ctx.ip, session: ctx.session, reason: "pendente de confirmação" });
        return { ok: false, summary: `Confirma a operação "${id}"?`, requiresConfirmation: true, token: t };
      }
      pending.delete(key);
    }

    try {
      const r = await d.run(ctx);
      record({ ts: Date.now(), actor: ctx.uid, role: ctx.role, action: id, resource: id, result: r.ok ? "ok" : "error", ip: ctx.ip, session: ctx.session, reason: ctx.reason });
      return r;
    } catch (e: any) {
      record({ ts: Date.now(), actor: ctx.uid, role: ctx.role, action: id, resource: id, result: "error", ip: ctx.ip, session: ctx.session, reason: String(e?.message || e) });
      return { ok: false, summary: String(e?.message || e) };
    }
  }
}

export const commandBus = new CommandBus();
