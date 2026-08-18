import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { getCurrentBackground, getBackgroundPrefs, setBackgroundPrefs, BACKGROUNDS, BACKGROUND_CATEGORIES } from '../components/BackgroundSlider';
import { getSoundPrefs, setSoundPrefs, previewSound, SoundName } from '../lib/sound-engine';
import { Volume2, VolumeX, Play, ShieldCheck, MailCheck, Smartphone, Trash2, Copy, Check } from 'lucide-react';
import { auth } from '../firebase';
import { sendEmailVerification, multiFactor, TotpMultiFactorGenerator } from 'firebase/auth';
import { listActiveSessions, revokeAllOtherSessions, getDeviceInfo } from '../lib/security-utils';

interface SettingsPageProps {
  user: any;
  profileData: any;
  toggleConnection: (platform: 'youtubeConnected' | 'instagramConnected' | 'tiktokConnected' | 'facebookConnected') => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, profileData, toggleConnection }) => {
  const [settingsTab, setSettingsTab] = useState<'appearance' | 'sound' | 'connections' | 'payments' | 'relationships' | 'contracts' | 'security'>('appearance');
  const [bgPrefs, setBgPrefs] = useState(getBackgroundPrefs());
  const [soundPrefs, setSoundPrefsState] = useState(getSoundPrefs());
  const [merchantCopied, setMerchantCopied] = useState(false);

  const [emailSent, setEmailSent] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpState, setTotpState] = useState<'idle' | 'setup' | 'verify' | 'done'>('idle');
  const [totpSecret, setTotpSecret] = useState<any>(null);
  const [totpCode, setTotpCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaNote, setMfaNote] = useState('');
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(getDeviceInfo());

  useEffect(() => {
    if (!user) return;
    try {
      setTotpEnabled(multiFactor(user).enrolledFactors.some((f) => f.factorId === 'totp'));
    } catch {}
  }, [user]);

  const updateBgPrefs = (partial: Partial<ReturnType<typeof getBackgroundPrefs>>) => {
    const next = { ...bgPrefs, ...partial };
    setBgPrefs(next);
    setBackgroundPrefs(next);
  };

  const updateSoundPrefs = (partial: Partial<typeof soundPrefs>) => {
    const next = { ...soundPrefs, ...partial };
    setSoundPrefsState(next);
    setSoundPrefs(next);
  };

  const resendVerification = async () => {
    if (!user) return;
    setMfaBusy(true);
    setMfaError('');
    try {
      await sendEmailVerification(user);
      setEmailSent(true);
    } catch (e: any) {
      setMfaError('Não foi possível enviar o e-mail de verificação: ' + (e.code || e.message));
    } finally {
      setMfaBusy(false);
    }
  };

  const startTotpSetup = async () => {
    if (!user) return;
    setMfaBusy(true);
    setMfaError('');
    try {
      const mfaSession = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(mfaSession);
      setTotpSecret(secret);
      setTotpCode('');
      setTotpState('verify');
    } catch (e: any) {
      setMfaError('Ativar 2FA falhou. Certifica-te de que a verificação por aplicação autenticadora (TOTP) está ativada no Firebase Console > Authentication.');
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmTotpEnrollment = async () => {
    if (!user || !totpSecret) return;
    if (!/^\d{6}$/.test(totpCode)) {
      setMfaError('Insere o código de 6 dígitos da aplicação autenticadora.');
      return;
    }
    setMfaBusy(true);
    setMfaError('');
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, totpCode);
      await multiFactor(user).enroll(assertion, 'Dispositivo TOTP');
      setTotpState('done');
      setTotpEnabled(true);
      setTotpSecret(null);
      setTotpCode('');
      setMfaNote('Verificação em duas etapas ativada com sucesso.');
    } catch (e: any) {
      if (e.code === 'auth/invalid-verification-code') {
        setMfaError('Código inválido. Verifica o código atual na aplicação autenticadora e tenta novamente.');
      } else {
        setMfaError('Falha ao ativar a verificação em duas etapas. Tenta novamente.');
      }
    } finally {
      setMfaBusy(false);
    }
  };

  const disableTotp = async () => {
    if (!user) return;
    if (!window.confirm('Desativar a verificação em duas etapas? A tua conta ficará protegida apenas pela senha.')) return;
    setMfaBusy(true);
    setMfaError('');
    try {
      const mfa = multiFactor(user);
      const totpFactor = mfa.enrolledFactors.find((f) => f.factorId === 'totp');
      if (totpFactor) await mfa.unenroll(totpFactor);
      setTotpEnabled(false);
      setMfaNote('Verificação em duas etapas desativada.');
    } catch (e: any) {
      setMfaError('Falha ao desativar a verificação em duas etapas.');
    } finally {
      setMfaBusy(false);
    }
  };

  const loadSessions = async () => {
    if (!user) return;
    setSessions(await listActiveSessions(user.uid));
  };

  const terminateOtherSessions = async () => {
    if (!user) return;
    if (!window.confirm('Terminar todas as sessões em outros dispositivos? Os outros dispositivos serão desligados da tua conta.')) return;
    setMfaBusy(true);
    setMfaError('');
    try {
      await revokeAllOtherSessions(user.uid, currentDevice.deviceId);
      setSessions(await listActiveSessions(user.uid));
      setMfaNote('Todas as outras sessões foram terminadas. Detectarás novas tentativas de acesso com avisos de segurança.');
    } catch {
      setMfaError('Falha ao terminar as outras sessões.');
    } finally {
      setMfaBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          ⚙️ Definições da Conta
        </h2>
        <p className="text-slate-700 font-medium text-base">
          Fundo Ativo: <span className="font-bold text-indigo-600">{getCurrentBackground().label}</span> • {bgPrefs.autoRotate ? 'Rotação Dinâmica Ativada' : 'Rotação Desativada'}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 space-y-2">
          <Card className="border-white/30 shadow-md">
            <CardContent className="p-2 space-y-1">
              {([
                { id: 'appearance' as const, label: '🎨 Aparência & Fundo' },
                { id: 'sound' as const, label: '🔊 Identidade Sonora' },
                { id: 'connections' as const, label: '🔗 Conexões Externas' },
                { id: 'payments' as const, label: '💳 Formas de Pagamento' },
                { id: 'relationships' as const, label: '⭐ Fãs, Amigos & Clientes' },
                { id: 'contracts' as const, label: '📜 Contratos & Termos' },
                { id: 'security' as const, label: '🛡️ Segurança & Acessos' },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    settingsTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white/40 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        <main className="col-span-12 md:col-span-8 lg:col-span-9">
          <Card className="border-white/30 shadow-md min-h-[400px]">
            <CardContent className="p-6">
              {settingsTab === 'appearance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200/50 pb-3">🎨 Aparência & Fundo</h3>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-2">Categoria de Fundo</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateBgPrefs({ category: null })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          bgPrefs.category === null
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                        }`}
                      >
                        🌐 Todos
                      </button>
                      {BACKGROUND_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => updateBgPrefs({ category: bgPrefs.category === cat ? null : cat })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            bgPrefs.category === cat
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-2">Fundo Favorito</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {BACKGROUNDS.filter(b => !bgPrefs.category || b.category === bgPrefs.category).map(bg => (
                        <button
                          key={bg.id}
                          onClick={() => updateBgPrefs({ favoriteId: bgPrefs.favoriteId === bg.id ? null : bg.id })}
                          className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                            bgPrefs.favoriteId === bg.id ? 'border-indigo-500 shadow-lg' : 'border-transparent hover:border-indigo-200'
                          }`}
                        >
                          <img src={bg.url} alt={bg.label} className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                          <span className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                            <span className="text-[10px] font-bold text-white truncate w-full">{bg.label}</span>
                          </span>
                          {bgPrefs.favoriteId === bg.id && (
                            <span className="absolute top-1.5 right-1.5 bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 bg-white/60 rounded-xl px-4 py-2.5 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bgPrefs.autoRotate}
                        onChange={(e) => updateBgPrefs({ autoRotate: e.target.checked })}
                        className="accent-indigo-600 h-4 w-4"
                      />
                      🔄 Rotação Automática
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 bg-white/60 rounded-xl px-4 py-2.5 border border-slate-200">
                      <span>⏱️ Intervalo:</span>
                      <select
                        value={bgPrefs.interval}
                        onChange={(e) => updateBgPrefs({ interval: Number(e.target.value) })}
                        className="bg-white rounded-lg px-2 py-1 text-xs font-bold border border-slate-300"
                      >
                        <option value={15000}>15 seg</option>
                        <option value={30000}>30 seg</option>
                        <option value={45000}>45 seg</option>
                        <option value={60000}>1 min</option>
                        <option value={120000}>2 min</option>
                      </select>
                    </label>
                  </div>

                  <p className="text-xs text-slate-500">
                    As preferências ficam guardadas neste dispositivo e sincronizam automaticamente com a plataforma.
                  </p>
                </div>
              )}

              {settingsTab === 'sound' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200/50 pb-3">🔊 Identidade Sonora</h3>
                  <p className="text-sm text-slate-600">
                    Sons curtos e discretos para cada ação importante da plataforma. Todos são sintetizados localmente (sem downloads) e respeitam as tuas preferências.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 bg-white/60 rounded-xl p-4 border border-slate-200">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={soundPrefs.enabled}
                        onChange={(e) => updateSoundPrefs({ enabled: e.target.checked })}
                        className="accent-indigo-600 h-4 w-4"
                      />
                      {soundPrefs.enabled ? <Volume2 className="h-4 w-4 text-indigo-600" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
                      Sons Ativados
                    </label>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span>Volume:</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(soundPrefs.volume * 100)}
                        onChange={(e) => updateSoundPrefs({ volume: Number(e.target.value) / 100 })}
                        className="accent-indigo-600 w-40"
                      />
                      <span className="text-xs font-bold text-slate-500">{Math.round(soundPrefs.volume * 100)}%</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-2">Pré-visualização de Sons</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {([
                        ['message', '💬 Nova mensagem'],
                        ['like', '❤️ Pontuação recebida'],
                        ['notification', '🔔 Notificação'],
                        ['post', '📷 Publicação enviada'],
                        ['live', '📺 Live iniciada'],
                        ['payment', '💳 Pagamento concluído'],
                        ['game', '🎮 Convite para jogo'],
                        ['call', '📞 Chamada recebida'],
                      ] as [SoundName, string][]).map(([name, label]) => (
                        <button
                          key={name}
                          onClick={() => previewSound(name)}
                          disabled={!soundPrefs.enabled}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-white/60 hover:bg-white text-slate-700 disabled:opacity-40 transition-all"
                        >
                          <Play className="h-3.5 w-3.5 text-indigo-600" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    As preferências ficam guardadas neste dispositivo e aplicam-se a todas as páginas da plataforma.
                  </p>
                </div>
              )}

              {settingsTab === 'connections' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200/50 pb-3">Redes Sociais Conectadas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'YouTube', icon: '🔴', connected: profileData.youtubeConnected, field: 'youtubeConnected' as const },
                      { name: 'Instagram', icon: '📸', connected: profileData.instagramConnected, field: 'instagramConnected' as const },
                      { name: 'TikTok', icon: '🎵', connected: profileData.tiktokConnected, field: 'tiktokConnected' as const },
                      { name: 'Facebook', icon: '🔵', connected: profileData.facebookConnected, field: 'facebookConnected' as const },
                    ].map((s) => (
                      <div key={s.field} className="p-4 bg-white/50 border border-slate-200/50 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{s.icon}</span>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{s.name}</h4>
                            <p className="text-xs text-slate-500">{s.connected ? 'Sincronizado' : 'Não vinculado'}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className={`rounded-lg text-xs font-bold ${
                            s.connected
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                          variant={s.connected ? 'outline' : 'default'}
                          onClick={() => toggleConnection(s.field)}
                        >
                          {s.connected ? 'Conectado' : 'Vincular'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === 'payments' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                    <h3 className="text-lg font-bold text-slate-900">Métodos de Pagamento</h3>
                    <Button size="sm" className="rounded-xl text-xs font-bold" onClick={() => alert('Funcionalidade de adicionar método de pagamento será aberta. Por agora, usa o Checkout na Galeria para configurar.')}>
                      + Adicionar
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'PayPal', icon: '🅿️', detail: 'utilizador@email.com', badge: 'Padrão', badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
                      { name: 'Google Pay', icon: '📱', detail: '**** **** **** 4242', badge: 'Ativo', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                      { name: 'MetaMask (Web3)', icon: '🦊', detail: '0xf44910f8F13BC4B485bb9ce2406d83a3F0Ada1F2', badge: 'Wallet Vinculada', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                      { name: 'Transferência Bancária', icon: '🏦', detail: 'PT50 0000 0000 0000 0000 001', badge: 'Pendente', badgeColor: 'bg-amber-100 text-amber-700 border-amber-300' },
                    ].map((m) => (
                      <div key={m.name} className="p-4 bg-white/50 border border-slate-200/50 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 flex items-center gap-2"><span>{m.icon}</span> {m.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${m.badgeColor}`}>{m.badge}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">{m.detail}</p>
                      </div>
                    ))}
                  </div>
                  <Card className="border-primary/40 bg-gradient-to-br from-amber-50/60 to-white/40 shadow-md overflow-hidden">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm text-lg">🏪</span>
                          Merchant Identity
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-300 bg-amber-100 text-amber-700">Público</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        Este é o teu identificador público da Connected. As chaves (API keys) devem ser solicitadas e os domínios autenticados para produção.
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/70 border border-primary/25 rounded-xl px-4 py-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Merchant ID</p>
                          <p className="text-sm font-mono font-bold text-slate-800 break-all selection:bg-primary/20">69a169be-bc52-43fe-8314-93cad7b1e773</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs font-bold shrink-0 border-primary/40 text-slate-800 bg-white/80"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText('69a169be-bc52-43fe-8314-93cad7b1e773');
                              setMerchantCopied(true);
                              setTimeout(() => setMerchantCopied(false), 2000);
                            } catch {}
                          }}
                        >
                          {merchantCopied ? '✓ Copiado' : 'Copiar'}
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        API Keys: <b>necessárias</b> · Domínios: <b>autenticação obrigatória em produção</b>
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-cyan-200/40 bg-cyan-50/40">
                    <CardContent className="p-5 flex items-start gap-3">
                      <span className="text-lg">🌐</span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Domínios Oficiais da Connected</h4>
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-white/60 rounded-lg px-3 py-2 border border-white/80">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>https://www.connectedking.web.app/ <span className="text-emerald-600 font-bold">— Oficial</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-white/60 rounded-lg px-3 py-2 border border-white/80">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>https://www.connected.org-github.io/ <span className="text-slate-500">— Futuro custom domain</span></span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Podes usar o teu próprio domínio configurando um CNAME para o GitHub Pages. 
                          Adiciona o domínio no Firebase Console em Authentication {'>'} Authorized domains para o login funcionar.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {settingsTab === 'relationships' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200/50 pb-3">A Tua Comunidade na Connected</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { icon: '⭐', count: '1.240', label: 'Fãs Seguidores', color: 'from-indigo-50 to-white border-indigo-200/40 text-indigo-700' },
                      { icon: '🤝', count: '318', label: 'Amigos Conectados', color: 'from-cyan-50 to-white border-cyan-200/40 text-cyan-700' },
                      { icon: '🛍️', count: '42', label: 'Clientes Compradores', color: 'from-emerald-50 to-white border-emerald-200/40 text-emerald-700' },
                    ].map((r) => (
                      <div key={r.label} className={`p-5 bg-gradient-to-br ${r.color} rounded-2xl text-center space-y-1 border shadow-sm`}>
                        <span className="text-2xl">{r.icon}</span>
                        <h4 className="text-2xl font-black text-slate-900">{r.count}</h4>
                        <p className="text-xs font-bold uppercase tracking-wider">{r.label}</p>
                      </div>
                    ))}
                  </div>

                  <Card className="border-slate-200/40 bg-white/40">
                    <CardContent className="p-5 space-y-3">
                      <h4 className="font-bold text-slate-900 text-sm">Taxonomia de Relacionamentos</h4>
                      <div className="space-y-3">
                        {[
                          { icon: '⭐', title: 'Fãs', desc: 'Utilizadores que seguem os seus posts, vídeos e conteúdos da Jukebox. Recebem notificações de novos posts e transmissões na Connect TV.' },
                          { icon: '🤝', title: 'Amigos', desc: 'Conexões mútuas confirmadas no Networking ou Integrações. Acesso a chamadas de voz/vídeo HD e mensagens privadas sem custo de pontos.' },
                          { icon: '🛍️', title: 'Clientes', desc: 'Utilizadores que adquiriram licenças de fotos, artes ou mídias na sub-aba de Direitos Autorais. Histórico de compras vinculado e suporte direto.' },
                        ].map((r) => (
                          <div key={r.title} className="flex items-start gap-3 p-3 bg-white/60 rounded-xl border border-slate-100">
                            <span className="text-lg">{r.icon}</span>
                            <div>
                              <h5 className="font-bold text-slate-900 text-sm">{r.title}</h5>
                              <p className="text-xs text-slate-600">{r.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {settingsTab === 'contracts' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200/50 pb-3">📜 Contratos de Integração Comercial</h3>
                  <p className="text-sm text-slate-600">Instrumentos legais que regem a integração de pagamentos e serviços na plataforma Connected.</p>

                  <Card className="border-slate-200/40 bg-white/40">
                    <CardContent className="p-5 space-y-4">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">💳 Processamento de Pagamentos (PayPal, Google Pay & Visa)</h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-700 leading-relaxed whitespace-pre-line">
                        {`CONTRATO DE INTEGRAÇÃO DE SERVIÇOS DE PAGAMENTO E PROCESSAMENTO FINANCEIRO

ENTRE:
PARTE A: CONNECTED PLATFORM (Bluewhite Corporation), doravante "PLATAFORMA".
PARTE B: PROVEDORES DE PROCESSAMENTO FINANCEIRO (PayPal Inc., Google Payment Corp., Visa Inc.), doravante "PROCESSADORES".

CLÁUSULA 1ª — DO OBJECTO
Integração técnica e operacional das soluções de pagamento digital na PLATAFORMA Connected, permitindo compra de licenças, itens da Galeria, pacotes de telecom e pontos da rede.

CLÁUSULA 2ª — DA MOEDA BASE E CONVERSÃO
1. Todas as transações serão listadas e processadas prioritariamente em Metical (MZN).
2. Para utilizadores internacionais, os PROCESSADORES efetuarão conversão automática na taxa de câmbio comercial do dia para USD, EUR ou ZAR.

CLÁUSULA 3ª — DA SEGURANÇA E CONFORMIDADE
A PLATAFORMA cumpre os padrões PCI-DSS e autenticação 3D Secure em todas as transações.

Data de Efetivação: 27 de Julho de 2026.`}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200/40 bg-white/40">
                    <CardContent className="p-5 space-y-4">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">🦊 Integração Web3 & MetaMask</h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-700 leading-relaxed whitespace-pre-line">
                        {`ACORDO DE INTEGRAÇÃO WEB3 E CONEXÃO DE CARTEIRAS CRIPTOGRÁFICAS

ENTRE:
PARTE A: CONNECTED PLATFORM (Bluewhite Corporation), doravante "PLATAFORMA".
PARTE B: METAMASK / CONEXÃO PROTOCOLO WEB3 (ConsenSys Software Inc.), doravante "PROTOCOLO".

CLÁUSULA 1ª — DA CONEXÃO E LIQUIDEZ
1. A PLATAFORMA integrará suporte nativo ao protocolo MetaMask (EVM compatible) para autenticação de carteiras e pagamento de ativos digitais.
2. O valor em Meticais (MZN) será convertido dinamicamente para ETH, USDT ou USDC no momento da execução do Smart Contract.

CLÁUSULA 2ª — DA REGULAÇÃO E GUARDA
A PLATAFORMA não manterá custódia das chaves privadas. Todas as assinaturas são efetuadas diretamente via cliente Web3 do utilizador.

Data de Efetivação: 27 de Julho de 2026.`}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200/40 bg-amber-50/40">
                    <CardContent className="p-5 flex items-start gap-3">
                      <span className="text-lg">⚖️</span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Conformidade Legal</h4>
                        <p className="text-xs text-slate-600 mt-1">
                          A Connected Platform opera sob a visão de ecossistemas digitais da Bluewhite Corporation.
                          Todos os contratos estão em conformidade com as regulações de comércio eletrónico e proteção de dados aplicáveis.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {settingsTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200/50 pb-3">🛡️ Segurança & Acessos</h3>

                  {(mfaNote || mfaError) && (
                    <div className={`text-sm p-3 rounded-xl border flex items-start gap-2 ${mfaError ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                      <span>{mfaError || mfaNote}</span>
                      <button className="ml-auto text-xs font-bold hover:underline" onClick={() => { setMfaError(''); setMfaNote(''); }}>Fechar</button>
                    </div>
                  )}

                  <Card className="border-slate-200/40 bg-white/40">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2"><MailCheck className="h-4 w-4 text-indigo-600" /> Verificação de E-mail</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${user?.emailVerified ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                          {user?.emailVerified ? '✓ Verificado' : 'Por verificar'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {user?.emailVerified
                          ? 'O teu e-mail está confirmado. Contas verificadas têm acesso completo às funcionalidades da plataforma.'
                          : `Ainda não confirmaste ${user?.email || 'o teu e-mail'}. Verifica a tua caixa de entrada e, se necessário, reenvia o e-mail de confirmação.`}
                      </p>
                      {!user?.emailVerified && (
                        <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold" onClick={resendVerification} disabled={mfaBusy || emailSent}>
                          {emailSent ? '✓ E-mail reenviado — verifica a caixa de entrada' : 'Reenviar e-mail de verificação'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200/40 bg-white/40">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-600" /> Verificação em Duas Etapas (2FA)</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${totpState === 'done' || totpEnabled ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {totpState === 'done' || totpEnabled ? 'Ativada' : 'Desativada'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Protege a tua conta com um código gerado por uma aplicação autenticadora (Google Authenticator, Authy, Microsoft Authenticator). O código muda a cada 30 segundos e é pedido no início de sessão em novos dispositivos.
                      </p>

                      {totpState === 'verify' && totpSecret && (
                        <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <p className="text-xs font-bold text-slate-900">1. Adiciona a chave na tua aplicação autenticadora</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono break-all select-all">{totpSecret.secretKey}</code>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg text-xs font-bold shrink-0"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(totpSecret.secretKey);
                                  setSecretCopied(true);
                                  setTimeout(() => setSecretCopied(false), 2000);
                                } catch {}
                              }}
                            >
                              {secretCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                          <p className="text-xs font-bold text-slate-900">2. Insere o código de 6 dígitos gerado</p>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Código de verificação"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500" onClick={confirmTotpEnrollment} disabled={mfaBusy || totpCode.length < 6}>
                              {mfaBusy ? 'A ativar...' : 'Confirmar e ativar 2FA'}
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold" onClick={() => { setTotpState('idle'); setTotpSecret(null); }} disabled={mfaBusy}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      {totpState !== 'verify' && (
                        totpEnabled || totpState === 'done' ? (
                          <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50" onClick={disableTotp} disabled={mfaBusy}>
                            Desativar 2FA
                          </Button>
                        ) : (
                          <Button size="sm" className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500" onClick={startTotpSetup} disabled={mfaBusy}>
                            Ativar 2FA
                          </Button>
                        )
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200/40 bg-white/40">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Smartphone className="h-4 w-4 text-indigo-600" /> Sessões Ativas</h4>
                        <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold" onClick={loadSessions} disabled={mfaBusy}>
                          {sessions ? 'Atualizar' : 'Ver sessões'}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600">
                        Dispositivos com acesso à tua conta. Novos acessos geram alertas de segurança e notificações.
                      </p>
                      {sessions && (
                        <div className="space-y-2">
                          {sessions.length === 0 && <p className="text-xs text-slate-500 font-medium">Nenhuma sessão registada neste dispositivo.</p>}
                          {sessions.map((s) => {
                            const isCurrent = s.deviceId === currentDevice.deviceId;
                            return (
                              <div key={s.id} className={`flex items-center justify-between gap-3 bg-white/70 border rounded-xl px-3 py-2.5 ${isCurrent ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200'}`}>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900">
                                    {s.browser} · {s.os} {s.isMobile ? '📱' : '💻'}
                                    {isCurrent && <span className="ml-2 text-[9px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded-full">ESTE DISPOSITIVO</span>}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-medium">Última atividade: {new Date(s.lastSeen).toLocaleString('pt-PT')}</p>
                                </div>
                              </div>
                            );
                          })}
                          {sessions.length > 1 && (
                            <Button size="sm" className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white" onClick={terminateOtherSessions} disabled={mfaBusy}>
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Terminar todas as outras sessões
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <p className="text-[10px] text-slate-500 font-medium">
                    A Connected regista acessos suspeitos em <span className="font-mono">security_logs</span> e notifica-te sempre que um novo dispositivo entra na tua conta. Os dados de sessão ficam apenas na tua conta.
                  </p>
                </div>
              )}

            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export { SettingsPage };
export default SettingsPage;
