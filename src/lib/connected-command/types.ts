// ============================================================================
// Connected Command Bus — camada única de comandos da Control Center.
// ----------------------------------------------------------------------------
// Painel, DIVINO, manutenção e apps internas usam O MESMO barramento, com
// autoridade (role+permission) e auditoria. Operações destrutivas exigem
// confirmação obrigatória — nunca executam cegamente.
// ============================================================================
import type { DivinoAction } from "../divino/security/policy";

export type Authority = "read" | "execute" | "destructive";

export interface CommandContext {
  uid: string;
  role: string;
  token?: string;
  args?: Record<string, any>;
  reason?: string;
  ip?: string;
  session?: string;
}

export interface CommandResult {
  ok: boolean;
  summary: string;
  data?: any;
  requiresConfirmation?: boolean;
  token?: string;
}

export interface AuditEntry {
  ts: number;
  actor: string;
  role: string;
  action: string;
  resource: string;
  node?: string;
  result: "ok" | "denied" | "error";
  ip?: string;
  session?: string;
  reason?: string;
}

export interface CommandDef {
  id: string;
  action: DivinoAction;
  destructive?: boolean;
  run: (ctx: CommandContext) => Promise<CommandResult> | CommandResult;
}
