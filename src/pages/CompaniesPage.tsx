import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Building2, Plus, X, Store, BarChart3, Headphones, Megaphone, CheckCircle2, Eye, Users, Package, Mail, Globe, MessageCircle, Send, Loader2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatCurrency } from '../lib/currency-utils';
import { playSound } from '../lib/sound-engine';

interface Company {
  id: string;
  name: string;
  category: string;
  description: string;
  logoUrl: string;
  website: string;
  email: string;
  whatsapp: string;
  ownerId: string;
  ownerName: string;
  verified: boolean;
  views: number;
  followers: number;
  createdAt: number;
}

interface Product {
  id: string;
  companyId: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  createdAt: number;
}

interface Campaign {
  id: string;
  companyId: string;
  title: string;
  description: string;
  pricePerDay: number;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

interface CompaniesPageProps {
  user: any;
  profileData: any;
  initialCompanyId?: string | null;
  onConsumedInitial?: () => void;
}

const CATEGORIES = ['🛒 Comércio', '🏢 Serviços', '🎨 Criatividade', '💻 Tecnologia', '🍔 Restauração', '📚 Educação', '🏥 Saúde', '🚗 Transportes', '🏗️ Construção', 'Outros'];

export function CompaniesPage({ user, profileData, initialCompanyId, onConsumedInitial }: CompaniesPageProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', category: CATEGORIES[0], description: '', logoUrl: '', website: '', email: '', whatsapp: '' });
  const [myCompany, setMyCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [companyTab, setCompanyTab] = useState<'store' | 'stats' | 'support' | 'ads'>('store');
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price: 0, description: '', imageUrl: '' });
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ title: '', description: '', pricePerDay: 100, days: 7 });
  const [isSaving, setIsSaving] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'companies'), orderBy('createdAt', 'desc')), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Company));
      setCompanies(list);
      if (user) setMyCompany(list.find((c) => c.ownerId === user.uid) || null);
      if (initialCompanyId && !selected) {
        const target = list.find((c) => c.id === initialCompanyId);
        if (target) {
          setSelected(target);
          updateDoc(doc(db, 'companies', target.id), { views: increment(1) }).catch(() => {});
          onConsumedInitial?.();
        }
      }
    }, () => {});
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!selected) return;
    const unsubs = [
      onSnapshot(query(collection(db, 'company_products'), orderBy('createdAt', 'desc')), (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)).filter((p) => p.companyId === selected.id));
      }, () => {}),
      onSnapshot(query(collection(db, 'company_campaigns'), orderBy('createdAt', 'desc')), (snap) => {
        setCampaigns(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign)).filter((c) => c.companyId === selected.id));
      }, () => {}),
      onSnapshot(doc(db, 'company_follows', `${user?.uid || '_'}_${selected.id}`), (snap) => {
        setIsFollowing(snap.exists());
      }, () => {}),
    ];
    return () => unsubs.forEach((u) => u());
  }, [selected, user]);

  const registerView = (c: Company) => {
    updateDoc(doc(db, 'companies', c.id), { views: increment(1) }).catch(() => {});
  };

  const openCompany = (c: Company) => {
    setSelected(c);
    registerView(c);
  };

  const handleCreateCompany = async () => {
    if (!user || isSaving) return;
    if (!form.name.trim() || !form.description.trim()) {
      alert('Nome e descrição são obrigatórios.');
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'companies'), {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        logoUrl: form.logoUrl.trim() || '',
        website: form.website.trim() || '',
        email: form.email.trim() || user.email || '',
        whatsapp: form.whatsapp.trim() || '',
        ownerId: user.uid,
        ownerName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        verified: false,
        views: 0,
        followers: 0,
        createdAt: Date.now(),
      });
      playSound('post');
      setShowCreate(false);
      setForm({ name: '', category: CATEGORIES[0], description: '', logoUrl: '', website: '', email: '', whatsapp: '' });
    } catch (e) {
      console.error('Error creating company:', e);
      alert('Erro ao criar empresa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProduct = async () => {
    if (!selected || !user || isSaving) return;
    if (!productForm.name.trim() || productForm.price <= 0) {
      alert('Nome e preço são obrigatórios.');
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'company_products'), {
        companyId: selected.id,
        name: productForm.name.trim(),
        price: Number(productForm.price),
        description: productForm.description.trim() || 'Sem descrição.',
        imageUrl: productForm.imageUrl.trim() || '',
        createdAt: Date.now(),
      });
      setShowProductModal(false);
      setProductForm({ name: '', price: 0, description: '', imageUrl: '' });
      playSound('post');
    } catch (e) {
      console.error('Error adding product:', e);
      alert('Erro ao adicionar produto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuyProduct = async (p: Product) => {
    if (!user || !selected) return;
    try {
      await addDoc(collection(db, 'purchases'), {
        userId: user.uid,
        userEmail: user.email || '',
        userName: profileData.displayName || '',
        itemId: p.id,
        title: `${p.name} — ${selected.name}`,
        price: p.price,
        points: 0,
        provider: 'store',
        reference: `PROD-${Date.now()}`,
        status: 'pending',
        note: `Compra na loja de ${selected.name}`,
        createdAt: Date.now(),
      });
      playSound('payment');
      alert(`Encomenda registada: "${p.name}" (${formatCurrency(p.price, 'MZN')}). A empresa será notificada e o pagamento confirmado pela moderação.`);
    } catch (e) {
      console.error('Error buying product:', e);
      alert('Erro ao registar encomenda.');
    }
  };

  const handleAddCampaign = async () => {
    if (!selected || !user || isSaving) return;
    if (!campaignForm.title.trim()) {
      alert('Título da campanha é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'company_campaigns'), {
        companyId: selected.id,
        title: campaignForm.title.trim(),
        description: campaignForm.description.trim() || 'Sem descrição.',
        pricePerDay: Number(campaignForm.pricePerDay),
        days: Number(campaignForm.days),
        status: 'pending',
        createdAt: Date.now(),
      });
      setShowCampaignModal(false);
      setCampaignForm({ title: '', description: '', pricePerDay: 100, days: 7 });
      playSound('post');
    } catch (e) {
      console.error('Error adding campaign:', e);
      alert('Erro ao criar campanha.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFollow = async (c: Company) => {
    if (!user) return;
    const ref = doc(db, 'company_follows', `${user.uid}_${c.id}`);
    if (isFollowing) {
      await deleteDoc(ref).catch(() => {});
      updateDoc(doc(db, 'companies', c.id), { followers: increment(-1) }).catch(() => {});
    } else {
      await setDoc(ref, { userId: user.uid, companyId: c.id, createdAt: Date.now() }).catch(() => {});
      updateDoc(doc(db, 'companies', c.id), { followers: increment(1) }).catch(() => {});
    }
  };

  const verifiedCompanies = useMemo(() => companies.filter((c) => c.verified), [companies]);
  const pendingCompanies = useMemo(() => companies.filter((c) => !c.verified), [companies]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-600" /> Empresas na Connected
          </h2>
          <p className="text-slate-700 font-medium text-base">Página oficial, loja, atendimento e estatísticas para o teu negócio.</p>
        </div>
        {user && (
          <Button className="rounded-xl font-bold" onClick={() => setShowCreate(true)} disabled={!!myCompany}>
            <Plus className="h-4 w-4 mr-1" /> {myCompany ? 'Empresa Criada' : 'Criar Empresa'}
          </Button>
        )}
      </div>

      {selected ? (
        <div className="space-y-6">
          <Card className="glass-card border-white/30 shadow-md overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />
            <CardContent className="p-6 -mt-12 relative">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <div className="rounded-2xl p-1 bg-white shadow-lg">
                    <Avatar className="h-20 w-20 rounded-xl">
                      <AvatarImage src={selected.logoUrl} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl">{selected.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="pb-1">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      {selected.name}
                      {selected.verified && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    </h3>
                    <p className="text-xs font-bold text-slate-500">{selected.category} · criada por {selected.ownerName}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => setSelected(null)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Voltar
                  </Button>
                  <Button size="sm" className="rounded-xl text-xs font-bold" onClick={() => toggleFollow(selected)}>
                    {isFollowing ? '✓ A Seguir' : <><Users className="h-3.5 w-3.5 mr-1" /> Seguir</>}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-slate-700 mt-4 max-w-3xl">{selected.description}</p>
              <div className="flex flex-wrap gap-4 mt-4 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-cyan-600" /> {selected.views} visitas</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-emerald-600" /> {selected.followers} seguidores</span>
                <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5 text-indigo-600" /> {products.length} produtos</span>
                {selected.website && (
                  <a href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Globe className="h-3.5 w-3.5" /> {selected.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Mail className="h-3.5 w-3.5" /> {selected.email}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 p-1.5 bg-white/70 rounded-2xl border border-white/40 shadow-sm overflow-x-auto">
            {([
              { id: 'store' as const, label: '🛍️ Loja', icon: <Store className="h-4 w-4" />, color: 'bg-emerald-600 text-white' },
              { id: 'stats' as const, label: '📊 Estatísticas', icon: <BarChart3 className="h-4 w-4" />, color: 'bg-cyan-600 text-white' },
              { id: 'support' as const, label: '🎧 Atendimento', icon: <Headphones className="h-4 w-4" />, color: 'bg-indigo-600 text-white' },
              { id: 'ads' as const, label: '📣 Publicidade', icon: <Megaphone className="h-4 w-4" />, color: 'bg-amber-600 text-white' },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setCompanyTab(t.id)}
                className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  companyTab === t.id ? t.color : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {companyTab === 'store' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 font-medium">Produtos e serviços da {selected.name}.</p>
                {(myCompany?.id === selected.id) && (
                  <Button size="sm" className="rounded-xl text-xs font-bold" onClick={() => setShowProductModal(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Produto
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.length === 0 && (
                  <Card className="sm:col-span-2 lg:col-span-3 glass-card border-white/30">
                    <CardContent className="p-8 text-center">
                      <Store className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-medium">A loja ainda não tem produtos.</p>
                    </CardContent>
                  </Card>
                )}
                {products.map((p) => (
                  <Card key={p.id} className="glass-card border-white/30 shadow-md hover:shadow-lg transition-all overflow-hidden">
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover" />}
                    <CardContent className="p-4 space-y-2">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{p.name}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{p.description}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-lg font-black text-emerald-600">{formatCurrency(p.price, 'MZN')}</span>
                        <Button size="sm" className="rounded-lg text-xs font-bold" onClick={() => handleBuyProduct(p)}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Encomendar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {companyTab === 'stats' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Visitas à página', value: selected.views, icon: <Eye className="h-5 w-5 text-cyan-600" /> },
                { label: 'Seguidores', value: selected.followers, icon: <Users className="h-5 w-5 text-emerald-600" /> },
                { label: 'Produtos', value: products.length, icon: <Package className="h-5 w-5 text-indigo-600" /> },
                { label: 'Campanhas', value: campaigns.length, icon: <Megaphone className="h-5 w-5 text-amber-600" /> },
              ].map((s) => (
                <Card key={s.label} className="glass-card border-white/30 shadow-md">
                  <CardContent className="p-5 text-center">
                    <div className="mx-auto mb-1">{s.icon}</div>
                    <p className="text-3xl font-black text-slate-900">{s.value}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
              <Card className="col-span-2 md:col-span-4 glass-card border-white/30 shadow-md">
                <CardContent className="p-5">
                  <p className="text-sm text-slate-600 font-medium">
                    As métricas são recolhidas em tempo real: cada visita à página incrementa as visualizações e cada clique em "Seguir" atualiza os seguidores. Estatísticas detalhadas de vendas estarão disponíveis quando as encomendas forem confirmadas.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {companyTab === 'support' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="glass-card border-white/30 shadow-md">
                <CardContent className="p-6 space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2"><Headphones className="h-5 w-5 text-indigo-600" /> Canais de Atendimento</h4>
                  {selected.whatsapp ? (
                    <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 hover:bg-emerald-100">
                      <MessageCircle className="h-4 w-4" /> WhatsApp: +{selected.whatsapp.replace(/\D/g, '')}
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">A empresa ainda não publicou WhatsApp.</p>
                  )}
                  {selected.email ? (
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 hover:bg-blue-100">
                      <Mail className="h-4 w-4" /> {selected.email}
                    </a>
                  ) : null}
                  <p className="text-xs text-slate-500 font-medium pt-2">O atendimento é feito diretamente pelos canais da empresa. Para apoio à plataforma, usa o suporte da Connected.</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-white/30 shadow-md">
                <CardContent className="p-6 space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Selo Verificado</h4>
                  <p className="text-sm text-slate-600">{selected.verified ? 'Esta empresa tem o selo oficial de verificação da Connected.' : 'Esta empresa ainda aguarda verificação pela moderação.'}</p>
                  <p className="text-xs text-slate-500 font-medium">O selo verificado confirma a identidade do negócio e aumenta a confiança dos clientes.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {companyTab === 'ads' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 font-medium">Campanhas publicitárias da {selected.name}. Aprovação feita pela moderação da Connected.</p>
                {(myCompany?.id === selected.id) && (
                  <Button size="sm" className="rounded-xl text-xs font-bold" onClick={() => setShowCampaignModal(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Nova Campanha
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {campaigns.length === 0 && (
                  <Card className="glass-card border-white/30">
                    <CardContent className="p-8 text-center">
                      <Megaphone className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-medium">Sem campanhas ainda.</p>
                    </CardContent>
                  </Card>
                )}
                {campaigns.map((c) => (
                  <Card key={c.id} className="glass-card border-white/30 shadow-md">
                    <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold text-slate-900 text-sm">{c.title}</p>
                        <p className="text-xs text-slate-600">{c.description}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          {formatCurrency(c.pricePerDay, 'MZN')}/dia · {c.days} dias · total {formatCurrency(c.pricePerDay * c.days, 'MZN')}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                        c.status === 'approved' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : c.status === 'rejected' ? 'text-rose-700 bg-rose-50 border-rose-200'
                        : 'text-amber-700 bg-amber-50 border-amber-200'
                      }`}>
                        {c.status === 'approved' ? '✓ Aprovada' : c.status === 'rejected' ? '✕ Rejeitada' : '⏳ Pendente'}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {verifiedCompanies.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Verificadas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {verifiedCompanies.map((c) => (
                  <CompanyCard key={c.id} c={c} onOpen={openCompany} />
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-400" /> Empresas da Comunidade
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingCompanies.map((c) => (
                <CompanyCard key={c.id} c={c} onOpen={openCompany} />
              ))}
              {companies.length === 0 && (
                <Card className="sm:col-span-2 lg:col-span-3 glass-card border-white/30">
                  <CardContent className="p-10 text-center">
                    <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Ainda não há empresas registadas. Cria a primeira e mostra o teu negócio ao ecossistema!</p>
                    {user && (
                      <Button className="mt-4 rounded-xl font-bold" onClick={() => setShowCreate(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Criar Empresa
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <Card className="w-full max-w-lg bg-slate-900 border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="p-4 bg-slate-800/50 flex flex-row items-center justify-between">
              <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-400" /> Criar Empresa
              </CardTitle>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <input
                placeholder="Nome da empresa *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea
                placeholder="Descrição da empresa *"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
              />
              <input
                placeholder="URL do logótipo (opcional)"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <input
                  placeholder="WhatsApp (ex: 258840000000)"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              <Button className="w-full rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500" onClick={handleCreateCompany} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Criar Empresa'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowProductModal(false)}>
          <Card className="w-full max-w-lg bg-slate-900 border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="p-4 bg-slate-800/50 flex flex-row items-center justify-between">
              <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                <Store className="h-5 w-5 text-emerald-400" /> Adicionar Produto
              </CardTitle>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <input
                placeholder="Nome do produto *"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <input
                placeholder="Preço (MZN) *"
                type="number"
                min={1}
                value={productForm.price || ''}
                onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <textarea
                placeholder="Descrição"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
              />
              <input
                placeholder="URL da imagem (opcional)"
                value={productForm.imageUrl}
                onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <Button className="w-full rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500" onClick={handleAddProduct} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Adicionar Produto'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowCampaignModal(false)}>
          <Card className="w-full max-w-lg bg-slate-900 border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="p-4 bg-slate-800/50 flex flex-row items-center justify-between">
              <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-amber-400" /> Nova Campanha
              </CardTitle>
              <button onClick={() => setShowCampaignModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <input
                placeholder="Título da campanha *"
                value={campaignForm.title}
                onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              <textarea
                placeholder="Descrição"
                value={campaignForm.description}
                onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Preço/dia (MZN)</label>
                  <input
                    type="number"
                    min={1}
                    value={campaignForm.pricePerDay || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, pricePerDay: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Dias</label>
                  <input
                    type="number"
                    min={1}
                    value={campaignForm.days || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, days: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 mt-1"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 font-semibold">Total: {formatCurrency(campaignForm.pricePerDay * campaignForm.days, 'MZN')}</p>
              <Button className="w-full rounded-xl font-bold bg-amber-600 hover:bg-amber-500" onClick={handleAddCampaign} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Submeter Campanha'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

const CompanyCard: React.FC<{ c: Company; onOpen: (c: Company) => void }> = ({ c, onOpen }) => {
  return (
    <Card key={c.id} className="glass-card border-white/30 shadow-md hover:shadow-lg transition-all cursor-pointer" onClick={() => onOpen(c)}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border border-white/50 shadow-sm">
            <AvatarImage src={c.logoUrl} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700">{c.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate flex items-center gap-1">
              {c.name}
              {c.verified && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{c.category}</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 pt-1 border-t border-slate-200/60">
          <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-cyan-500" /> {c.views}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3 text-emerald-500" /> {c.followers}</span>
          <span className="ml-auto text-emerald-600">{c.verified ? 'Verificada' : 'Comunidade'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default CompaniesPage;
