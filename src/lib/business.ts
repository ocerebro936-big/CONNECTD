// ============================================================================
// Connected Business — perfis empresariais, parceiros/contratos e tesouraria
// ----------------------------------------------------------------------------
// Backend real em Firestore. Separa receita comercial (anúncios, patrocínios,
// contratos) da economia de jogo/pontos/BlueCoin.
// ============================================================================
import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit as qLimit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';

export type ContractType =
  | 'publicidade'
  | 'patrocinio'
  | 'creator'
  | 'connected_tv'
  | 'music'
  | 'jobs';

export type ContractStatus = 'pendente' | 'ativo' | 'concluido' | 'cancelado';

export interface BusinessProfile {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  category: string;
  description: string;
  website?: string;
  email?: string;
  whatsapp?: string;
  createdAt: any;
}

export interface PartnerContract {
  id: string;
  businessId: string;
  businessName: string;
  type: ContractType;
  value: number;
  period: string;
  services: string;
  status: ContractStatus;
  createdAt: any;
}

export type TreasuryKind = 'income' | 'expense';

export interface TreasuryEntry {
  id: string;
  kind: TreasuryKind;
  category: string;
  amount: number;
  description: string;
  createdAt: any;
  relatedId?: string;
}

export async function createBusinessProfile(input: {
  ownerId: string;
  ownerName: string;
  name: string;
  category: string;
  description: string;
  website?: string;
  email?: string;
  whatsapp?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'businessProfiles'), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listBusinessProfiles(ownerId?: string, lim = 50): Promise<BusinessProfile[]> {
  const q = ownerId
    ? query(collection(db, 'businessProfiles'), where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'), qLimit(lim))
    : query(collection(db, 'businessProfiles'), orderBy('createdAt', 'desc'), qLimit(lim));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as BusinessProfile);
}

export async function createContract(input: {
  businessId: string;
  businessName: string;
  type: ContractType;
  value: number;
  period: string;
  services: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'partnerContracts'), {
    ...input,
    status: 'pendente' as ContractStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listContracts(businessId?: string, lim = 50): Promise<PartnerContract[]> {
  const q = businessId
    ? query(collection(db, 'partnerContracts'), where('businessId', '==', businessId), orderBy('createdAt', 'desc'), qLimit(lim))
    : query(collection(db, 'partnerContracts'), orderBy('createdAt', 'desc'), qLimit(lim));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as PartnerContract);
}

export async function addTreasuryEntry(input: {
  kind: TreasuryKind;
  category: string;
  amount: number;
  description: string;
  relatedId?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'treasury'), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listTreasuryEntries(lim = 100): Promise<TreasuryEntry[]> {
  const q = query(collection(db, 'treasury'), orderBy('createdAt', 'desc'), qLimit(lim));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as TreasuryEntry);
}

export function treasuryBalance(entries: TreasuryEntry[]): number {
  return entries.reduce((acc, e) => acc + (e.kind === 'income' ? e.amount : -e.amount), 0);
}
