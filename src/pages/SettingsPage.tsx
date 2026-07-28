import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { getCurrentBackground } from '../components/BackgroundSlider';

interface SettingsPageProps {
  user: any;
  profileData: any;
  toggleConnection: (platform: 'youtubeConnected' | 'instagramConnected' | 'tiktokConnected' | 'facebookConnected') => void;
  handleComingSoon: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, profileData, toggleConnection, handleComingSoon }) => {
  const [settingsTab, setSettingsTab] = useState<'connections' | 'payments' | 'relationships' | 'contracts'>('connections');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          ⚙️ Definições da Conta
        </h2>
        <p className="text-slate-700 font-medium text-base">
          Fundo Ativo: <span className="font-bold text-indigo-600">{getCurrentBackground().type}</span> • Rotação Dinâmica Ativada
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 space-y-2">
          <Card className="border-white/30 shadow-md">
            <CardContent className="p-2 space-y-1">
              {([
                { id: 'connections' as const, label: '🔗 Conexões Externas' },
                { id: 'payments' as const, label: '💳 Formas de Pagamento' },
                { id: 'relationships' as const, label: '⭐ Fãs, Amigos & Clientes' },
                { id: 'contracts' as const, label: '📜 Contratos & Termos' },
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
                    <Button size="sm" className="rounded-xl text-xs font-bold" onClick={handleComingSoon}>
                      + Adicionar
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'PayPal', icon: '🅿️', detail: 'utilizador@email.com', badge: 'Padrão', badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
                      { name: 'Google Pay', icon: '📱', detail: '**** **** **** 4242', badge: 'Ativo', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                      { name: 'MetaMask (Web3)', icon: '🦊', detail: '0x71C...89F2', badge: 'Ativo', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
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
                </div>
              )}

              {settingsTab === 'relationships' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200/50 pb-3">A Tua Comunidade na Connected</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { icon: '⭐', count: '1.240', label: 'Fãs Seguidores', color: 'from-indigo-50 to-white border-indigo-200/40 text-indigo-700' },
                      { icon: '🤝', count: '318', label: 'Amigos Conectados', color: 'from-purple-50 to-white border-purple-200/40 text-purple-700' },
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
            </CardContent>
                  </Card>
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
