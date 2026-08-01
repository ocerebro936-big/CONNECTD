import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ShieldCheck, ShoppingCart, Flag, Gamepad2, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { formatCurrency } from '../lib/currency-utils';
import { isValidStripeLink, getStripeLinks, setStripeLinks } from '../lib/payment-utils';

interface Purchase {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  itemId: string;
  title: string;
  price: number;
  points: number;
  provider: string;
  reference: string;
  status: string;
  note: string;
  createdAt: number;
}

interface Report {
  id: string;
  reporterId: string;
  type: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: number;
}

interface GameItem {
  id: string;
  title: string;
  url: string;
  category: string;
  description: string;
  coverUrl: string;
  developer: string;
  developerId: string;
  status: string;
  createdAt: number;
}

type Tab = 'purchases' | 'reports' | 'games';

const PROVIDER_LABELS: Record<string, string> = {
  stripe: '💳 Stripe',
  paypal: '🅿️ PayPal',
  googlepay: '📱 Google Pay',
  bank: '🏦 Transferência',
  metamask: '🦊 MetaMask',
};

export function AdminPanel({ user }: { user: any }) {
  const [tab, setTab] = useState<Tab>('purchases');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        query(collection(db, 'purchases'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')),
        (snap) => setPurchases(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Purchase))),
        (e) => console.error(e)
      ),
      onSnapshot(
        query(collection(db, 'reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')),
        (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report))),
        (e) => console.error(e)
      ),
      onSnapshot(
        query(collection(db, 'games'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')),
        (snap) => setGames(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GameItem))),
        (e) => console.error(e)
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const confirmPurchase = async (p: Purchase) => {
    if (!user || working) return;
    setWorking(p.id);
    try {
      await updateDoc(doc(db, 'purchases', p.id), {
        status: 'confirmed',
        confirmedAt: Date.now(),
        confirmedBy: user.uid,
        note: 'Confirmado manualmente pelo administrador',
      });
      await updateDoc(doc(db, 'users', p.userId), { points: increment(p.points) });
      await addDoc(collection(db, 'notifications'), {
        userId: p.userId,
        type: 'purchase',
        message: `${p.points} pontos foram creditados na tua conta (compra ${p.title} confirmada).`,
        actorId: user.uid,
        actorName: 'Connected Admin',
        actorAvatar: '',
        link: '',
        read: false,
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error('Error confirming purchase:', e);
      alert('Erro ao confirmar compra. Verifica os logs.');
    } finally {
      setWorking(null);
    }
  };

  const rejectPurchase = async (p: Purchase) => {
    if (!user || working) return;
    setWorking(p.id);
    try {
      await updateDoc(doc(db, 'purchases', p.id), {
        status: 'rejected',
        confirmedAt: Date.now(),
        confirmedBy: user.uid,
      });
    } catch (e) {
      console.error('Error rejecting purchase:', e);
    } finally {
      setWorking(null);
    }
  };

  const resolveReport = async (r: Report, action: 'resolved' | 'banned') => {
    if (working) return;
    setWorking(r.id);
    try {
      await updateDoc(doc(db, 'reports', r.id), {
        status: action === 'banned' ? 'banned' : 'resolved',
        resolvedAt: Date.now(),
        resolvedBy: user.uid,
      });
      if (action === 'banned') {
        const targetRef = r.type === 'user' ? doc(db, 'users', r.targetId) : null;
        if (targetRef) {
          await updateDoc(targetRef, { banned: true, bannedAt: Date.now() });
        }
      }
    } catch (e) {
      console.error('Error resolving report:', e);
      alert('Erro ao resolver denúncia. As regras podem bloquear a alteração (ban) — confirma o formato.');
    } finally {
      setWorking(null);
    }
  };

  const approveGame = async (g: GameItem) => {
    if (working) return;
    setWorking(g.id);
    try {
      await updateDoc(doc(db, 'games', g.id), {
        status: 'approved',
        approvedAt: Date.now(),
        approvedBy: user.uid,
      });
    } catch (e) {
      console.error('Error approving game:', e);
      alert('Erro ao aprovar jogo.');
    } finally {
      setWorking(null);
    }
  };

  const rejectGame = async (g: GameItem) => {
    if (working) return;
    setWorking(g.id);
    try {
      await updateDoc(doc(db, 'games', g.id), {
        status: 'rejected',
        approvedAt: Date.now(),
        approvedBy: user.uid,
      });
    } catch (e) {
      console.error('Error rejecting game:', e);
    } finally {
      setWorking(null);
    }
  };

  const linkPackage = async (p: Purchase) => {
    const links = getStripeLinks();
    const current = links[p.itemId] || '';
    const input = prompt(`Stripe Payment Link para o pacote "${p.itemId}" (${p.points} pts):`, current);
    if (input === null) return;
    if (input.trim() && !isValidStripeLink(input.trim())) {
      alert('Link inválido. Deve ser https://buy.stripe.com/...');
      return;
    }
    const updated = { ...links, [p.itemId]: input.trim() };
    setStripeLinks(updated);
    alert('Link guardado. Os próximos pagamentos deste pacote já abrem a página Stripe.');
  };

  const renderPurchaseRow = (p: Purchase) => (
    <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 bg-white/60 border border-slate-200 rounded-xl">
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-bold text-slate-900">{p.userName || p.userEmail} <span className="text-slate-400 font-normal">({p.userEmail})</span></p>
        <p className="text-xs text-slate-600 font-medium">
          {PROVIDER_LABELS[p.provider] || p.provider} · Ref. <span className="font-mono">{p.reference}</span>
        </p>
        <p className="text-xs text-slate-500 font-medium">{(p.note || '') + ' · ' + new Date(p.createdAt).toLocaleString('pt-PT')}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-emerald-600">+{p.points} pts</p>
        <p className="text-xs text-slate-600 font-bold">{formatCurrency(p.price, 'MZN')}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        {p.provider === 'stripe' && (
          <Button size="sm" variant="outline" className="text-[11px] rounded-lg" onClick={() => linkPackage(p)}>
            Link Stripe
          </Button>
        )}
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] rounded-lg" disabled={working === p.id} onClick={() => confirmPurchase(p)}>
          {working === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" /> Confirmar</>}
        </Button>
        <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 text-[11px] rounded-lg" disabled={working === p.id} onClick={() => rejectPurchase(p)}>
          <XCircle className="h-3 w-3 mr-1" /> Rejeitar
        </Button>
      </div>
    </div>
  );

  const renderReportRow = (r: Report) => (
    <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 bg-white/60 border border-slate-200 rounded-xl">
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-bold text-slate-900">
          <span className="text-rose-600">{r.type === 'user' ? '👤 Perfil' : r.type === 'post' ? '📝 Publicação' : r.type === 'comment' ? '💬 Comentário' : r.type}</span>
          <span className="text-slate-400 font-normal"> · alvo: <span className="font-mono text-xs">{r.targetId}</span></span>
        </p>
        <p className="text-xs text-slate-600 font-medium">"{r.reason}"</p>
        <p className="text-xs text-slate-500 font-medium">{new Date(r.createdAt).toLocaleString('pt-PT')} · reporter {r.reporterId}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] rounded-lg" disabled={working === r.id} onClick={() => resolveReport(r, 'resolved')}>
          <CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
        </Button>
        <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] rounded-lg" disabled={working === r.id} onClick={() => resolveReport(r, 'banned')}>
          <XCircle className="h-3 w-3 mr-1" /> Banir
        </Button>
      </div>
    </div>
  );

  const renderGameRow = (g: GameItem) => (
    <div key={g.id} className="flex flex-wrap items-center gap-3 p-3 bg-white/60 border border-slate-200 rounded-xl">
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-bold text-slate-900">{g.title} <span className="text-slate-400 font-normal">({g.category})</span></p>
        <p className="text-xs text-slate-600 font-medium">por {g.developer}</p>
        <p className="text-xs text-slate-500 font-medium truncate max-w-[400px]">{g.url}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <a href={g.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold">
          <ExternalLink className="h-3 w-3 mr-1" /> Ver
        </a>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] rounded-lg" disabled={working === g.id} onClick={() => approveGame(g)}>
          <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
        </Button>
        <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 text-[11px] rounded-lg" disabled={working === g.id} onClick={() => rejectGame(g)}>
          <XCircle className="h-3 w-3 mr-1" /> Rejeitar
        </Button>
      </div>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { id: 'purchases', label: 'Compras', icon: <ShoppingCart className="h-4 w-4" />, count: purchases.length, color: 'bg-emerald-600 text-white' },
    { id: 'reports', label: 'Denúncias', icon: <Flag className="h-4 w-4" />, count: reports.length, color: 'bg-rose-600 text-white' },
    { id: 'games', label: 'Jogos', icon: <Gamepad2 className="h-4 w-4" />, count: games.length, color: 'bg-indigo-600 text-white' },
  ];

  return (
    <Card className="border-slate-200 shadow-md">
      <CardHeader>
        <CardTitle className="text-slate-900 font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-600" /> Painel de Moderação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 p-1.5 bg-white/70 rounded-xl border border-slate-200 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                tab === t.id ? t.color : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && <span className="text-[10px] bg-white/30 px-1.5 py-0.5 rounded-full">{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === 'purchases' && (
          <div className="space-y-2">
            {purchases.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 font-medium">Sem compras pendentes. 🎉</p>
            ) : (
              purchases.map(renderPurchaseRow)
            )}
            <p className="text-[10px] text-slate-500 font-medium pt-2">
              Confirmar credita os pontos no utilizador e envia notificação. Links Stripe configuram os Payment Links por pacote (guardados no navegador do admin).
            </p>
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-2">
            {reports.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 font-medium">Sem denúncias pendentes. 🎉</p>
            ) : (
              reports.map(renderReportRow)
            )}
          </div>
        )}

        {tab === 'games' && (
          <div className="space-y-2">
            {games.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 font-medium">Sem jogos pendentes de aprovação. 🎉</p>
            ) : (
              games.map(renderGameRow)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
