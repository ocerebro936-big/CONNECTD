// Connected Audit — trilha imutável de quem fez o quê, quando, em qual serviço.
import { db } from '../../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export interface AuditEntry {
  actor: string;
  action: string;
  service: string;
  resource?: string;
  result: 'ok' | 'denied' | 'error';
  detail?: string;
  at?: any;
}

const localLog: AuditEntry[] = [];

export function recordAudit(e: AuditEntry): void {
  const entry: AuditEntry = {
    ...e,
    at: serverTimestamp(),
    actor: e.actor || getAuth().currentUser?.uid || 'system',
  };
  localLog.unshift(entry);
  if (localLog.length > 200) localLog.pop();
  // Persistência leve (não bloqueia a operação).
  addDoc(collection(db, 'audit'), entry).catch(() => undefined);
}

export function getAuditLog(): AuditEntry[] {
  return localLog;
}
