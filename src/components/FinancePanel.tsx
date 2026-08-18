import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Wallet, TrendingUp, CheckCircle2, XCircle, Gift, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '../firebase';

export interface FinanceTx {
  id: string;
  userId: string;
  type: string;
  description: string;
  amount?: number;
  currency?: string;
  refId?: string;
  createdAt: number;
}

export function FinancePanel() {
  const [txs, setTxs] = useState<FinanceTx[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'finance_transactions'), orderBy('createdAt', 'desc'), firestoreLimit(120)),
      (snap) => setTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceTx))),
      (e) => console.error(e)
    );
    return () => unsub();
  }, []);

  const confirmed = txs.filter((t) => t.type === 'purchase_confirmed');
  const pending = txs.filter((t) => t.type === 'purchase_created');
  const rejected = txs.filter((t) => t.type === 'purchase_rejected');
  const gifts = txs.filter((t) => t.type === 'gift_sent');
  const volume = confirmed.reduce((acc, t) => acc + (t.amount || 0), 0);

  const typeMeta = (t: string) => {
    switch (t) {
      case 'purchase_confirmed': return { label: 'Compra confirmada', color: 'text-emerald-700 bg-emerald-100', icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
      case 'purchase_created': return { label: 'Compra criada (pendente)', color: 'text-amber-700 bg-amber-100', icon: <ArrowDownCircle className="h-3.5 w-3.5" /> };
      case 'purchase_rejected': return { label: 'Compra rejeitada', color: 'text-rose-700 bg-rose-100', icon: <XCircle className="h-3.5 w-3.5" /> };
      case 'gift_sent': return { label: 'Presente enviado', color: 'text-pink-700 bg-pink-100', icon: <Gift className="h-3.5 w-3.5" /> };
      case 'plan_subscribed': return { label: 'Subscrição Premium', color: 'text-violet-700 bg-violet-100', icon: <TrendingUp className="h-3.5 w-3.5" /> };
      case 'campaign_paid': return { label: 'Campanha paga', color: 'text-blue-700 bg-blue-100', icon: <TrendingUp className="h-3.5 w-3.5" /> };
      case 'product_sold': return { label: 'Produto vendido', color: 'text-indigo-700 bg-indigo-100', icon: <TrendingUp className="h-3.5 w-3.5" /> };
      default: return { label: t, color: 'text-slate-700 bg-slate-100', icon: <ArrowUpCircle className="h-3.5 w-3.5" /> };
    }
  };

  const stat = (label: string, value: string, sub: string, icon: React.ReactNode, color: string) => (
    <Card className="glass-card border-white/30 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={color}>{icon}</span>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{label}</p>
        </div>
        <p className="text-xl font-black text-slate-900">{value}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stat('Volume confirmado', `${volume.toFixed(0)} MZN`, 'compras confirmadas (auditável)', <Wallet className="h-4 w-4" />, 'text-emerald-600')}
        {stat('Pendentes', `${pending.length}`, 'aguardam confirmação do admin', <ArrowDownCircle className="h-4 w-4" />, 'text-amber-600')}
        {stat('Rejeitadas', `${rejected.length}`, 'compras recusadas', <XCircle className="h-4 w-4" />, 'text-rose-600')}
        {stat('Presentes', `${gifts.length}`, 'presentes enviados em lives/TV', <Gift className="h-4 w-4" />, 'text-pink-600')}
      </div>

      <div className="bg-white/50 border border-white/40 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-white/40">
          <p className="font-bold text-slate-900 text-sm">📒 Registo Financeiro (Ledger)</p>
          <p className="text-[10px] text-slate-500 font-medium">Todas as transações ficam registadas de forma imutável — auditoria completa da plataforma.</p>
        </div>
        <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
          {txs.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8 font-medium">Sem transações registadas ainda.</p>
          )}
          {txs.map((t) => {
            const meta = typeMeta(t.type);
            return (
              <div key={t.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/60 transition-colors">
                <span className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900">{meta.label}</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{t.description}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {new Date(t.createdAt).toLocaleString('pt-PT')} · user <span className="font-mono">{t.userId.slice(0, 10)}…</span>
                    {t.refId ? ` · ref ${t.refId.slice(0, 10)}…` : ''}
                  </p>
                </div>
                {t.amount !== undefined && (
                  <span className="text-xs font-black text-slate-900 shrink-0">{t.amount.toFixed(0)} {t.currency || 'MZN'}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-slate-500 font-medium">
        O ledger usa a coleção <span className="font-mono">finance_transactions</span> (append-only: criar permite, editar é negado pelas regras Firestore).
      </p>
    </div>
  );
}