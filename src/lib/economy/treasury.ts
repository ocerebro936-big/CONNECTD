// ============================================================================
// Connected Economy — Treasury (receita da plataforma)
// ----------------------------------------------------------------------------
// A receita (publicidade, marketplace, premium, tráfego, jogos, TV...) entra na
// Treasury, NUNCA diretamente na carteira do utilizador. Da Treasury saem custos
// e o Pool de Recompensas que, após validação, credita pendingCash ao utilizador
// elegível. Isto mantém sustentabilidade e separação contabilística.
// ============================================================================
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { creditPendingCash } from './wallet';
import { appendTransaction } from './ledger';

const TREASURY = 'economyTreasury';

export async function addPlatformRevenue(source: string, mzn: number): Promise<void> {
  if (mzn <= 0) return;
  const ref = doc(db, TREASURY, 'main');
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, { totalRevenue: 0, totalRewards: 0, totalWithdrawn: 0 });
  await updateDoc(ref, { totalRevenue: increment(mzn) });
  await appendTransaction({
    userId: 'platform',
    type: 'treasury',
    amount: mzn,
    currency: 'MZN',
    source: `revenue:${source}`,
    status: 'confirmed',
  });
}

// A plataforma destina uma parte da receita como recompensa a um utilizador
// elegível. Crédito fica em PENDING até validação antifraude/receita efetiva.
export async function creditUserEarnings(uid: string, mzn: number, source: string): Promise<void> {
  if (mzn <= 0) return;
  await creditPendingCash(uid, mzn);
  await appendTransaction({
    userId: uid,
    type: 'reward',
    amount: mzn,
    currency: 'MZN',
    source: `earnings:${source}`,
    status: 'pending',
  });
  const ref = doc(db, TREASURY, 'main');
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, { totalRevenue: 0, totalRewards: 0, totalWithdrawn: 0 });
  await updateDoc(ref, { totalRewards: increment(mzn) });
}
