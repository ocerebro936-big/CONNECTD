import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Wallet, Receipt, Shield, ArrowUpRight, AlertTriangle, ExternalLink } from 'lucide-react';
import { divinoTreasury } from '../lib/divino-treasury';
import { formatCurrency } from '../lib/currency-utils';

export function DivinoTreasuryWidget() {
  const [balance, setBalance] = useState(divinoTreasury.getBalance());
  const [receipts, setReceipts] = useState(divinoTreasury.getReceipts());

  const refresh = () => {
    setBalance(divinoTreasury.getBalance());
    setReceipts(divinoTreasury.getReceipts());
  };

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  const percentUsed = (balance.spentToday / balance.dailyLimit) * 100;

  return (
    <Card className="bg-gradient-to-br from-blue-950/5 to-cyan-950/5 border-cyan-300/30 shadow-lg overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 border border-cyan-300 flex items-center justify-center text-xl shadow-md">
              💳
            </div>
            <div>
              <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-cyan-500" />
                Tesouraria Autônoma
              </CardTitle>
              <CardDescription className="text-cyan-600 font-medium text-xs">
                DIVINO IA • Gestão e liquidação automática de serviços
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(balance.balance, 'MZN')}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Saldo Ativo</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/50 border border-slate-200/50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 font-medium">Gasto Hoje</p>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(balance.spentToday, 'MZN')}</p>
          </div>
          <div className="bg-white/50 border border-slate-200/50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 font-medium">Limite Diário</p>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(balance.dailyLimit, 'MZN')}</p>
          </div>
          <div className="bg-white/50 border border-slate-200/50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 font-medium">Restante</p>
            <p className={`text-sm font-bold ${balance.remainingLimit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(balance.remainingLimit, 'MZN')}
            </p>
          </div>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentUsed > 80 ? 'bg-rose-500' : percentUsed > 50 ? 'bg-emerald-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>

        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-xs font-mono">
          <ExternalLink className="h-4 w-4 text-indigo-500 shrink-0" />
          <span className="text-slate-600 truncate">Wallet: {balance.wallet}</span>
          <span className="text-indigo-600 font-bold shrink-0">→ {balance.linkedMethods.primary}</span>
        </div>

        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-xs">
          <Shield className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 font-medium">
            Safety Lock ativo — 3% de cada transação recarrega automaticamente este fundo.
          </span>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5" />
            Últimas Faturas Liquidadas
          </h4>
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {receipts.map((tx) => (
              <div key={tx.id} className="p-3 bg-white/60 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs hover:bg-white/80 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{tx.service}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{tx.id}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-bold text-slate-800">{formatCurrency(tx.amount, 'MZN')}</p>
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full rounded-xl text-xs font-bold gap-2 bg-cyan-600 hover:bg-cyan-500 shadow-sm" onClick={() => {
          divinoTreasury.processAutomaticPayment('Recarga automática de segurança', 500).then(refresh).catch(console.error);
          refresh();
        }}>
          <ArrowUpRight className="h-4 w-4" /> Simular Pagamento Automático
        </Button>
      </CardContent>
    </Card>
  );
}
