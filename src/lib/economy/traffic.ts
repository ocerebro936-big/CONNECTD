// ============================================================================
// Connected Economy — Traffic Meter (base para Connected Cloud Billing)
// ----------------------------------------------------------------------------
// Cada asset já guarda sizeBytes/owner/status (PR #12). Aqui contabilizamos
// upload/download/requests/views por período, para mais tarde alimentar o
// Billing Engine com receita efetiva e custos de banda.
// ============================================================================
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  getDocs,
  query,
  where,
  orderBy,
  collection,
  limit as qLimit,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { TrafficUsage } from './types';

const TRAFFIC = 'trafficUsage';

function periodNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

export async function recordUsage(input: {
  userId: string;
  assetId: string;
  uploadBytes?: number;
  downloadBytes?: number;
  requests?: number;
  views?: number;
}): Promise<void> {
  const period = periodNow();
  const id = `${input.userId}_${input.assetId}_${period}`;
  const ref = doc(db, TRAFFIC, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const init: TrafficUsage = {
      userId: input.userId,
      assetId: input.assetId,
      uploadBytes: 0,
      downloadBytes: 0,
      requests: 0,
      views: 0,
      period,
    };
    await setDoc(ref, init);
  }
  const patch: any = {};
  if (input.uploadBytes) patch.uploadBytes = increment(input.uploadBytes);
  if (input.downloadBytes) patch.downloadBytes = increment(input.downloadBytes);
  if (input.requests) patch.requests = increment(input.requests);
  if (input.views) patch.views = increment(input.views);
  if (Object.keys(patch).length) await updateDoc(ref, patch);
}

export async function getUsage(userId: string): Promise<TrafficUsage[]> {
  const snap = await getDocs(
    query(
      collection(db, TRAFFIC),
      where('userId', '==', userId),
      orderBy('period', 'desc'),
      qLimit(50)
    )
  );
  return snap.docs.map((d) => d.data() as TrafficUsage);
}
