// ============================================================================
// DIVINO IA — Audit Log
// ----------------------------------------------------------------------------
// Regista cada decisão/execução de ferramenta para transparência e segurança.
// ============================================================================
import { db } from '../../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface AuditEvent {
  actorUid?: string;
  role: string;
  action: string;
  allowed: boolean;
  plugin?: string;
  detail?: string;
}

export async function audit(event: AuditEvent): Promise<void> {
  try {
    await addDoc(collection(db, 'divinoAudit'), {
      ...event,
      at: serverTimestamp(),
    });
  } catch {
    /* auditoria é melhor-esforço */
  }
}
