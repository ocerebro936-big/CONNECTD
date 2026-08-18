import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export type TxType =
  | 'purchase_created'
  | 'purchase_confirmed'
  | 'purchase_rejected'
  | 'gift_sent'
  | 'plan_subscribed'
  | 'campaign_paid'
  | 'product_sold';

export interface FinanceEntry {
  userId: string;
  type: TxType;
  description: string;
  amount?: number;
  currency?: string;
  refId?: string;
  actorId?: string;
  createdAt: number;
}

export const recordTransaction = async (entry: Omit<FinanceEntry, 'createdAt'> & { createdAt?: number }) => {
  try {
    await addDoc(collection(db, 'finance_transactions'), {
      ...entry,
      createdAt: entry.createdAt ?? Date.now(),
    });
  } catch (e) {
    console.error('Error recording finance transaction:', e);
  }
};