import React, { useEffect, useState } from 'react';
import { Building2, Plus, Briefcase, FileText, Wallet, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  createBusinessProfile,
  listBusinessProfiles,
  createContract,
  listContracts,
  addTreasuryEntry,
  listTreasuryEntries,
  treasuryBalance,
  BusinessProfile,
  PartnerContract,
  TreasuryEntry,
  ContractType,
} from '../lib/business';
import { seedDemoBusinesses } from '../lib/seed';

const CONTRACT_TYPES: { id: ContractType; label: string }[] = [
  { id: 'publicidade', label: 'Publicidade' },
  { id: 'patrocinio', label: 'Patrocínio' },
  { id: 'creator', label: 'Creator Partnership' },
  { id: 'connected_tv', label: 'Connected TV' },
  { id: 'music', label: 'Music Partnership' },
  { id: 'jobs', label: 'Jobs' },
];

export function BusinessPage({ user, profileData }: { user: any; profileData: any }) {
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [selected, setSelected] = useState<BusinessProfile | null>(null);
  const [contracts, setContracts] = useState<PartnerContract[]>([]);
  const [treasury, setTreasury] = useState<TreasuryEntry[]>([]);
  const [showBizForm, setShowBizForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [showTreasuryForm, setShowTreasuryForm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [bizForm, setBizForm] = useState({ name: '', category: 'Tecnologia', description: '', website: '', email: '', whatsapp: '' });
  const [contractForm, setContractForm] = useState({ type: 'publicidade' as ContractType, value: 0, period: '', services: '' });
  const [treasuryForm, setTreasuryForm] = useState({ kind: 'income' as 'income' | 'expense', category: 'Publicidade', amount: 0, description: '' });

  const loadBusinesses = async () => {
    const data = await listBusinessProfiles(undefined, 100);
    setBusinesses(data);
    if (!selected && data.length) setSelected(data[0]);
  };

  const loadContracts = async (bizId?: string) => {
    setContracts(await listContracts(bizId, 100));
  };
  const loadTreasury = async () => {
    setTreasury(await listTreasuryEntries(100));
  };

  useEffect(() => {
    loadBusinesses();
    loadTreasury();
  }, []);

  useEffect(() => {
    if (selected) loadContracts(selected.id);
  }, [selected]);

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      await seedDemoBusinesses(user, profileData?.displayName || user.email?.split('@')[0] || 'Empresa');
      await loadBusinesses();
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateBiz = async () => {
    if (!user || !bizForm.name.trim()) return;
    await createBusinessProfile({
      ownerId: user.uid,
      ownerName: profileData?.displayName || user.email?.split('@')[0] || 'Empresa',
      name: bizForm.name.trim(),
      category: bizForm.category,
      description: bizForm.description.trim(),
      website: bizForm.website.trim() || undefined,
      email: bizForm.email.trim() || undefined,
      whatsapp: bizForm.whatsapp.trim() || undefined,
    });
    setShowBizForm(false);
    setBizForm({ name: '', category: 'Tecnologia', description: '', website: '', email: '', whatsapp: '' });
    await loadBusinesses();
  };

  const handleCreateContract = async () => {
    if (!selected) return;
    await createContract({
      businessId: selected.id,
      businessName: selected.name,
      type: contractForm.type,
      value: Number(contractForm.value) || 0,
      period: contractForm.period.trim(),
      services: contractForm.services.trim(),
    });
    setShowContractForm(false);
    setContractForm({ type: 'publicidade', value: 0, period: '', services: '' });
    await loadContracts(selected.id);
  };

  const handleTreasury = async () => {
    await addTreasuryEntry({
      kind: treasuryForm.kind,
      category: treasuryForm.category,
      amount: Number(treasuryForm.amount) || 0,
      description: treasuryForm.description.trim(),
    });
    setShowTreasuryForm(false);
    setTreasuryForm({ kind: 'income', category: 'Publicidade', amount: 0, description: '' });
    await loadTreasury();
  };

  const balance = treasuryBalance(treasury);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" /> Connected Business
          </h1>
          <p className="text-slate-600 font-medium">Perfis empresariais, parcerias comerciais e tesouraria real.</p>
        </div>
        {user && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleSeed} variant="outline" disabled={seeding} className="rounded-xl font-bold border-primary/40 text-primary hover:bg-primary/10">
              {seeding ? 'A carregar...' : 'Carregar exemplo'}
            </Button>
            <Button onClick={() => setShowBizForm(true)} className="rounded-xl bg-primary text-black font-bold hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Criar perfil empresarial
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Lista de empresas */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-700 flex items-center gap-2"><Building2 className="h-4 w-4" /> Empresas</h3>
          {businesses.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma empresa ainda.</p>
          ) : (
            businesses.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  selected?.id === b.id ? 'bg-primary/15 border-primary/40' : 'bg-white/60 border-white/40 hover:bg-white'
                }`}
              >
                <p className="font-bold text-slate-900 truncate">{b.name}</p>
                <p className="text-xs text-slate-500 truncate">{b.category}</p>
              </button>
            ))
          )}
        </div>

        {/* Painel */}
        <div className="space-y-4">
          {!selected ? (
            <Card className="glass-card border-white/30">
              <CardContent className="p-8 text-center text-slate-500">Seleciona ou cria uma empresa.</CardContent>
            </Card>
          ) : (
            <>
              {/* Connected Partners / Contratos */}
              <Card className="glass-card border-white/30 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Connected Partners — Contratos
                  </CardTitle>
                  <Button size="sm" className="rounded-xl bg-primary text-black font-bold" onClick={() => setShowContractForm(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Novo contrato
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {contracts.filter((c) => c.businessId === selected.id).length === 0 ? (
                    <p className="text-sm text-slate-500">Sem contratos para esta empresa.</p>
                  ) : (
                    contracts.filter((c) => c.businessId === selected.id).map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-white/60 rounded-xl p-3 border border-white/40">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{CONTRACT_TYPES.find((t) => t.id === c.type)?.label || c.type}</p>
                          <p className="text-xs text-slate-500">{c.services || '—'}</p>
                          <p className="text-xs text-slate-400">{c.period || '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">{c.value} €</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold uppercase">{c.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Connected Treasury */}
              <Card className="glass-card border-white/30 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" /> Connected Treasury
                  </CardTitle>
                  <Button size="sm" className="rounded-xl bg-primary text-black font-bold" onClick={() => setShowTreasuryForm(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Lançamento
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-700">Saldo atual:</span>
                    <span className="text-lg font-black text-emerald-700">{balance.toLocaleString('pt-PT')} €</span>
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {treasury.length === 0 ? (
                      <p className="text-sm text-slate-500">Sem lançamentos.</p>
                    ) : (
                      treasury.map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-sm border-b border-white/30 py-1.5">
                          <span className="text-slate-700">{t.category} — {t.description || '—'}</span>
                          <span className={`font-bold ${t.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.kind === 'income' ? '+' : '−'}{t.amount} €
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Form: Empresa */}
      {showBizForm && (
        <Modal onClose={() => setShowBizForm(false)} title="Criar perfil empresarial">
          <FormGrid>
            <Field label="Nome *"><input value={bizForm.name} onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })} className={inp} placeholder="Nome da empresa" /></Field>
            <Field label="Categoria"><input value={bizForm.category} onChange={(e) => setBizForm({ ...bizForm, category: e.target.value })} className={inp} /></Field>
            <Field label="Website"><input value={bizForm.website} onChange={(e) => setBizForm({ ...bizForm, website: e.target.value })} className={inp} placeholder="https://" /></Field>
            <Field label="Email"><input value={bizForm.email} onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })} className={inp} /></Field>
            <Field label="WhatsApp"><input value={bizForm.whatsapp} onChange={(e) => setBizForm({ ...bizForm, whatsapp: e.target.value })} className={inp} /></Field>
            <Field label="Descrição *" full><textarea value={bizForm.description} onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })} rows={3} className={inp} /></Field>
          </FormGrid>
          <Button onClick={handleCreateBiz} className="mt-3 w-full rounded-xl bg-primary text-black font-bold">Criar</Button>
        </Modal>
      )}

      {/* Form: Contrato */}
      {showContractForm && (
        <Modal onClose={() => setShowContractForm(false)} title="Novo contrato comercial">
          <FormGrid>
            <Field label="Tipo">
              <select value={contractForm.type} onChange={(e) => setContractForm({ ...contractForm, type: e.target.value as ContractType })} className={inp}>
                {CONTRACT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Valor (€)"><input type="number" value={contractForm.value} onChange={(e) => setContractForm({ ...contractForm, value: Number(e.target.value) })} className={inp} /></Field>
            <Field label="Período"><input value={contractForm.period} onChange={(e) => setContractForm({ ...contractForm, period: e.target.value })} className={inp} placeholder="ex: 30 dias" /></Field>
            <Field label="Serviços" full><textarea value={contractForm.services} onChange={(e) => setContractForm({ ...contractForm, services: e.target.value })} rows={3} className={inp} /></Field>
          </FormGrid>
          <Button onClick={handleCreateContract} className="mt-3 w-full rounded-xl bg-primary text-black font-bold">Criar contrato</Button>
        </Modal>
      )}

      {/* Form: Tesouraria */}
      {showTreasuryForm && (
        <Modal onClose={() => setShowTreasuryForm(false)} title="Lançamento de tesouraria">
          <FormGrid>
            <Field label="Tipo">
              <select value={treasuryForm.kind} onChange={(e) => setTreasuryForm({ ...treasuryForm, kind: e.target.value as any })} className={inp}>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </Field>
            <Field label="Montante (€)"><input type="number" value={treasuryForm.amount} onChange={(e) => setTreasuryForm({ ...treasuryForm, amount: Number(e.target.value) })} className={inp} /></Field>
            <Field label="Categoria"><input value={treasuryForm.category} onChange={(e) => setTreasuryForm({ ...treasuryForm, category: e.target.value })} className={inp} /></Field>
            <Field label="Descrição" full><input value={treasuryForm.description} onChange={(e) => setTreasuryForm({ ...treasuryForm, description: e.target.value })} className={inp} /></Field>
          </FormGrid>
          <Button onClick={handleTreasury} className="mt-3 w-full rounded-xl bg-primary text-black font-bold">Registar</Button>
        </Modal>
      )}
    </div>
  );
}

const inp = 'mt-1 w-full glass-input bg-white/70 border-white/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-lg border border-white/40" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/30">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
