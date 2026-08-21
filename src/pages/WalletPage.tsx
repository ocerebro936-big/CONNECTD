import React, { useEffect, useState } from 'react';
import { Wallet as WalletIcon, Coins, Gem, Ticket, Banknote, History, Gift, ShieldCheck, ShieldAlert, ArrowDownToLine, CheckCircle2, Loader2, Info } from 'lucide-react';
import {
  connectedEconomy,
  WITHDRAW_RULES,
  type WalletDoc,
  type WalletTx,
  type DailyMission,
  type WithdrawalRequest,
  type WithdrawalMethod,
} from '../lib/economy';

interface WalletPageProps {
  user: any;
  profileData: any;
}

const METHOD_LABEL: Record<WithdrawalMethod, string> = {
  mpesa: 'M-Pesa',
  emola: 'e-Mola',
  bank: 'Conta Bancária',
  visa: 'Visa / Mastercard',
  paypal: 'PayPal',
};

export default function WalletPage({ user, profileData }: WalletPageProps) {
  const [wallet, setWallet] = useState<WalletDoc | null>(null);
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [history, setHistory] = useState<WalletTx[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<WithdrawalMethod>('mpesa');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [w, m, h, wd] = await Promise.all([
        connectedEconomy.getWallet(user.uid),
        connectedEconomy.getDailyMissions(user.uid),
        connectedEconomy.getHistory(user.uid, 40),
        connectedEconomy.getWithdrawals(user.uid),
      ]);
      setWallet(w);
      setMissions(m);
      setHistory(h);
      setWithdrawals(wd);
    } catch {
      /* ignora */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const claim = async (id: string) => {
    if (!user?.uid) return;
    const r = await connectedEconomy.claimMission(user.uid, id);
    if (r.ok) setMsg({ type: 'ok', text: `+${r.amount} pontos recebidos!` });
    else setMsg({ type: 'err', text: 'Não foi possível receber (já recebeste ou ação pendente).' });
    await load();
  };

  const withdraw = async () => {
    if (!user?.uid) return;
    setBusy(true);
    setMsg(null);
    const r = await connectedEconomy.requestWithdrawal(user.uid, {
      method,
      amountMZN: Number(amount),
      account,
    });
    setBusy(false);
    if (r.ok) {
      setMsg({ type: 'ok', text: 'Pedido de saque registado. Em revisão.' });
      setAmount('');
      setAccount('');
      await load();
    } else {
      setMsg({ type: 'err', text: r.error || 'Pedido recusado.' });
    }
  };

  if (loading || !wallet) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <WalletIcon className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-slate-900">Connected Wallet</h1>
      </div>

      {/* Aviso de separação (regra do produto) */}
      <div className="rounded-2xl border border-primary/20 bg-white/60 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-primary mt-0.5" />
        <p className="text-xs text-slate-600 font-medium">
          <b className="text-slate-900">Como funciona:</b> 💎 Gems e 🎟️ Tickets são moeda virtual (jogos/eventos, não resgatáveis).
          ⭐ Pontos são promocionais, ganhos por atividade legítima. 💵 O saldo real vem de receita efetiva da plataforma
          (partilha de receita/criadores) e só sai por saque com regras — pontos <b>nunca</b> viram dinheiro automaticamente.
        </p>
      </div>

      {/* Saldos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BalanceCard icon={<Coins className="h-5 w-5 text-amber-500" />} label="Pontos" value={wallet.points} sub="promocionais" />
        <BalanceCard icon={<Gem className="h-5 w-5 text-fuchsia-500" />} label="Gems" value={wallet.gems} sub="virtual" />
        <BalanceCard icon={<Ticket className="h-5 w-5 text-sky-500" />} label="Tickets" value={wallet.tickets} sub="virtual" />
        <BalanceCard icon={<Banknote className="h-5 w-5 text-emerald-600" />} label="Saldo real" value={`${wallet.realBalanceMZN} MZN`} sub="disponível p/ saque" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missões diárias */}
        <section className="rounded-2xl border border-white/50 bg-white/60 p-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-primary" /> Missões diárias
          </h2>
          <div className="space-y-2">
            {missions.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                  <p className="text-[11px] text-slate-500">+{m.reward} pontos</p>
                </div>
                {m.claimed ? (
                  <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Recebido</span>
                ) : m.done ? (
                  <button onClick={() => claim(m.id)} className="rounded-xl bg-primary text-black text-xs font-bold px-3 py-1.5">Receber</button>
                ) : (
                  <span className="text-slate-400 text-xs font-semibold">Pendente</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Saque */}
        <section className="rounded-2xl border border-white/50 bg-white/60 p-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <ArrowDownToLine className="h-4 w-4 text-emerald-600" /> Saque real
          </h2>
          <div className={`mb-2 flex items-center gap-2 text-xs font-semibold ${wallet.kycVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
            {wallet.kycVerified ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            {wallet.kycVerified ? 'Identidade verificada (KYC)' : 'KYC necessário acima de ' + WITHDRAW_RULES.kycThresholdMZN + ' MZN'}
          </div>
          <div className="space-y-2">
            <select value={method} onChange={(e) => setMethod(e.target.value as WithdrawalMethod)} className="w-full glass-input bg-white/70 border-white/50 rounded-xl px-3 py-2 text-sm text-slate-900">
              {WITHDRAW_RULES.methods.map((m) => (
                <option key={m} value={m}>{METHOD_LABEL[m]}</option>
              ))}
            </select>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder={`Valor em MZN (mín. ${WITHDRAW_RULES.minMZN})`} className="w-full glass-input bg-white/70 border-white/50 rounded-xl px-3 py-2 text-sm text-slate-900" />
            <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder={method === 'bank' ? 'IBAN / Conta' : 'Número / e-mail'} className="w-full glass-input bg-white/70 border-white/50 rounded-xl px-3 py-2 text-sm text-slate-900" />
            <button onClick={withdraw} disabled={busy} className="w-full rounded-xl bg-emerald-600 text-white font-bold py-2 disabled:opacity-60">
              {busy ? 'A processar...' : 'Pedir saque'}
            </button>
            <p className="text-[10px] text-slate-400 font-medium">
              Limites: diário {WITHDRAW_RULES.dailyLimitMZN} MZN · mensal {WITHDRAW_RULES.monthlyLimitMZN} MZN · antifraude ativo.
            </p>
          </div>
        </section>
      </div>

      {msg && (
        <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${msg.type === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{msg.text}</div>
      )}

      {/* Histórico */}
      <section className="rounded-2xl border border-white/50 bg-white/60 p-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-primary" /> Histórico
        </h2>
        {history.length === 0 ? (
          <p className="text-xs text-slate-500">Sem movimentos ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {history.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{txLabel(t)}</span>
                <span className={t.currency === 'MZN' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                  {t.currency === 'MZN' ? '-' : '+'}{t.amount} {t.currency === 'MZN' ? 'MZN' : t.currency === 'points' ? 'pts' : t.currency}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saques recentes */}
      {withdrawals.length > 0 && (
        <section className="rounded-2xl border border-white/50 bg-white/60 p-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Pedidos de saque</h2>
          <div className="space-y-1.5">
            {withdrawals.slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{METHOD_LABEL[w.method]} · {w.amountMZN} MZN</span>
                <span className="capitalize text-slate-500">{w.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BalanceCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/60 p-3">
      <div className="flex items-center gap-2 text-slate-500 mb-1">{icon}<span className="text-xs font-semibold">{label}</span></div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-400">{sub}</p>
    </div>
  );
}

function txLabel(t: WalletTx): string {
  switch (t.type) {
    case 'earn_points': return 'Pontos: ' + (t.reason || 'atividade');
    case 'earn_real': return 'Receita: ' + (t.reason || 'plataforma');
    case 'spend_gems': return 'Gems: ' + t.reason;
    case 'spend_tickets': return 'Tickets: ' + t.reason;
    case 'mission': return 'Missão: ' + (t.reason || '').replace('mission:', '');
    case 'withdraw_request': return 'Saque ' + (t.reason || '').replace('withdraw:', '');
    default: return t.reason || t.type;
  }
}
