import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { MessageCircle, Phone, Send, X, Users, Globe, MessageSquare, Award, TrendingUp, Shield, Target, Lightbulb, Sparkles } from 'lucide-react';
import { CallModal } from '../components/CallModal';
import { ChatModal } from '../components/ChatModal';
import { UserLevelBadge } from '../components/UserLevelBadge';
import { JOB_ROLES } from '../lib/reputation-utils';
import DivinoIa from './DivinoIa';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

interface NetworkPageProps {
  user: any;
  profileData: any;
  allUsers: any[];
  messages: any[];
  chattingWith: any | null;
  setChattingWith: (val: any | null) => void;
  newMessage: string;
  setNewMessage: (val: string) => void;
  handleSendMessage: () => void;
}

const communities = [
  { name: '🚀 Criadores de Tecnologia', members: '1.4k', desc: 'Devs, inovadores e entusiastas da tecnologia.' },
  { name: '🎨 Artistas Digitais', members: '2.1k', desc: 'Ilustradores, designers e criadores visuais.' },
  { name: '🎵 Música & Produção', members: '890', desc: 'Produtores musicais, beatmakers e cantores.' },
  { name: '📚 Educação & Conhecimento', members: '3.2k', desc: 'Cursos, tutoriais e partilha de saber.' },
  { name: '🌍 Activismo Social', members: '1.7k', desc: 'Mudança social, voluntariado e causas.' },
  { name: '🎮 Gaming & Esports', members: '5.6k', desc: 'Jogadores, streamers e competitivos.' },
];

const NetworkPage: React.FC<NetworkPageProps> = ({
  user,
  profileData,
  allUsers,
  messages,
  chattingWith,
  setChattingWith,
  newMessage,
  setNewMessage,
  handleSendMessage,
}) => {
  const [callingUser, setCallingUser] = useState<any | null>(null);
  const [netSubTab, setNetSubTab] = useState<'chat' | 'communities' | 'divino' | 'telecom'>('chat');
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [newCommunity, setNewCommunity] = useState({ name: '', description: '', category: '' });
  const [smsContent, setSmsContent] = useState('');
  const [smsSent, setSmsSent] = useState(false);

  const renderChatModal = () => (
    <ChatModal user={user} profileData={profileData} chatUser={chattingWith} onClose={() => setChattingWith(null)} />
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {callingUser && (
        <CallModal user={user} targetUser={callingUser} onClose={() => setCallingUser(null)} />
      )}
      {chattingWith && renderChatModal()}

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-500" />
          Networking
        </h2>
        <p className="text-slate-700 font-medium text-base">Converse, crie comunidades e conecte-se com o ecossistema Connected.</p>
      </div>

      <div className="flex gap-2 p-1.5 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/40 shadow-sm overflow-x-auto">
        {([
          { id: 'chat' as const, label: '💬 Chat Normal' },
          { id: 'communities' as const, label: '👥 Comunidades' },
          { id: 'divino' as const, label: '👑 Chat com DIVINO IA' },
          { id: 'telecom' as const, label: '📲 Chamadas & SMS' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setNetSubTab(tab.id)}
            className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl text-xs font-bold transition-all ${
              netSubTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {netSubTab === 'chat' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Mensagens Privadas</h3>
              <p className="text-sm text-slate-600">Conversas em tempo real com outros criadores da rede.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allUsers.filter((u: any) => u.id !== user?.uid).length === 0 && (
              <div className="col-span-full py-12 text-center bg-white/40 rounded-2xl border border-white/50 border-dashed">
                <p className="font-medium text-slate-500">Nenhum outro utilizador encontrado.</p>
              </div>
            )}
            {allUsers.filter((u: any) => u.id !== user?.uid).map((u: any) => (
              <Card key={u.id} className="glass-card border-white/30 shadow-md hover:shadow-lg transition-all">
                <CardHeader className="flex flex-row items-start gap-4">
                  <Avatar className="h-14 w-14 border border-white/50 shadow-sm relative">
                    <AvatarImage src={u.photoURL || "https://github.com/shadcn.png"} />
                    <AvatarFallback>{u.displayName?.[0] || u.email?.[0]}</AvatarFallback>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <CardTitle className="text-lg font-bold text-slate-900 truncate flex items-center gap-2">
                      {u.displayName || u.email?.split('@')[0]}
                      <UserLevelBadge points={u.points || 0} size="sm" />
                    </CardTitle>
                    <CardDescription className="text-slate-600 font-medium truncate">{u.bio || 'Criador Digital'}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm mb-5 bg-white/40 p-3 rounded-xl border border-white/30">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs font-semibold uppercase">Status</span>
                      <span className="font-bold text-emerald-600">Online</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-slate-500 text-xs font-semibold uppercase">Tag Principal</span>
                      <span className="font-bold text-primary">{u.tags ? u.tags.split(',')[0] : 'Geral'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="default" size="sm" className="shadow-sm font-semibold flex items-center gap-2 h-10 rounded-xl" onClick={() => setChattingWith(u)}>
                      <MessageCircle className="h-4 w-4" />
                      <span>SMS / Chat</span>
                    </Button>
                    <Button variant="outline" size="sm" className="glass-input border-white/50 text-slate-700 hover:text-emerald-600 shadow-sm flex items-center h-10 gap-2 rounded-xl" onClick={() => setCallingUser(u)}>
                      <Phone className="h-4 w-4" />
                      <span>Ligar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {netSubTab === 'communities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Comunidades da Connected</h3>
              <p className="text-sm text-slate-600">Junte-se a grupos existentes ou funde a sua própria comunidade.</p>
            </div>
            <Button className="rounded-xl shadow-md gap-2 font-semibold bg-emerald-600 hover:bg-emerald-500" onClick={() => setShowCreateCommunity(true)}>
              <Users className="h-4 w-4" /> Criar Comunidade
            </Button>
          </div>
          {showCreateCommunity && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <Card className="w-full max-w-md bg-white shadow-2xl">
                <CardHeader>
                  <CardTitle>Criar Comunidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input placeholder="Nome da comunidade" className="w-full glass-input bg-slate-100 text-sm px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40" value={newCommunity.name} onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })} />
                  <textarea placeholder="Descrição" className="w-full glass-input bg-slate-100 text-sm px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40" rows={3} value={newCommunity.description} onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })} />
                  <input placeholder="Categoria" className="w-full glass-input bg-slate-100 text-sm px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40" value={newCommunity.category} onChange={(e) => setNewCommunity({ ...newCommunity, category: e.target.value })} />
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateCommunity(false)}>Cancelar</Button>
                  <Button onClick={async () => {
                    if (!newCommunity.name.trim()) return;
                    await addDoc(collection(db, 'communities'), {
                      name: newCommunity.name,
                      description: newCommunity.description,
                      category: newCommunity.category,
                      createdBy: user?.uid,
                      createdAt: Date.now(),
                      members: 1,
                    });
                    setShowCreateCommunity(false);
                    setNewCommunity({ name: '', description: '', category: '' });
                  }}>Criar</Button>
                </CardFooter>
              </Card>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((c, i) => (
              <Card key={i} className="border-white/30 shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-5">
                  <h4 className="font-bold text-slate-900 text-base mb-1">{c.name}</h4>
                  <p className="text-xs text-slate-500 font-medium mb-3">{c.members} Membros</p>
                  <p className="text-sm text-slate-700 mb-4">{c.desc}</p>
                  <Button variant="outline" className="w-full rounded-xl text-xs font-bold" size="sm" onClick={async () => {
                    await addDoc(collection(db, 'community_members'), {
                      userId: user?.uid,
                      communityId: c.name,
                      joinedAt: Date.now(),
                    });
                    alert(`Você entrou na comunidade ${c.name}!`);
                  }}>
                    Participar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {netSubTab === 'divino' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <DivinoIa user={user} profileData={profileData} />
          </div>
          <div className="xl:col-span-1">
          </div>
        </div>
      )}

      {netSubTab === 'telecom' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200/50 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-500" />
              Central de Telecomunicações
            </h3>
            <p className="text-sm text-slate-600">Realize chamadas em nuvem HD ou envie SMS offline utilizando os seus pontos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-white/30 shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="p-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Phone className="h-7 w-7 text-emerald-600" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg">Chamadas HD</h4>
                <p className="text-sm text-slate-600">Chamadas de voz e vídeo com qualidade adaptativa. 10 pontos/minuto.</p>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="text-emerald-600">{(profileData.points || 0) >= 10 ? '✅ Saldo suficiente' : `${10 - (profileData.points || 0)} pts em falta`}</span>
                </div>
                <Button className="w-full rounded-xl font-bold" disabled={(profileData.points || 0) < 10} onClick={() => {
                  if (!chattingWith) {
                    alert('Selecione um utilizador na aba Chat Normal para iniciar uma chamada.');
                    return;
                  }
                  setCallingUser(chattingWith);
                }}>
                  Iniciar Chamada
                </Button>
              </CardContent>
            </Card>
            <Card className="border-white/30 shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                  <MessageSquare className="h-7 w-7 text-blue-600" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg">SMS Offline</h4>
                <p className="text-sm text-slate-600">Envie mensagens para utilizadores offline. 2 pontos/mensagem.</p>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="text-blue-600">{(profileData.points || 0) >= 2 ? '✅ Saldo suficiente' : `${2 - (profileData.points || 0)} pts em falta`}</span>
                </div>
                {!smsContent && !smsSent ? (
                  <Button className="w-full rounded-xl font-bold" disabled={(profileData.points || 0) < 2} onClick={() => {
                    if (!chattingWith) {
                      alert('Selecione um utilizador na aba Chat Normal para enviar SMS offline.');
                      return;
                    }
                    setSmsContent('');
                  }}>
                    Enviar SMS
                  </Button>
                ) : smsSent ? (
                  <p className="text-sm text-emerald-600 font-semibold text-center">SMS enviado com sucesso!</p>
                ) : (
                  <div className="space-y-2">
                    <input type="text" placeholder="Digite sua mensagem SMS..." className="w-full glass-input bg-slate-100 text-sm px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40" value={smsContent} onChange={(e) => setSmsContent(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') document.querySelector<HTMLButtonElement>('#send-sms-btn')?.click(); }} />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setSmsContent(''); setSmsSent(false); }}>Cancelar</Button>
                      <Button id="send-sms-btn" size="sm" disabled={!smsContent.trim()} onClick={async () => {
                        await addDoc(collection(db, 'offline_sms'), {
                          senderId: user?.uid,
                          senderName: user?.displayName || user?.email?.split('@')[0],
                          receiverId: chattingWith?.id,
                          receiverName: chattingWith?.displayName || chattingWith?.email?.split('@')[0],
                          content: smsContent,
                          timestamp: Date.now(),
                          read: false,
                        });
                        setSmsSent(true);
                        setSmsContent('');
                      }}>Enviar SMS</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-emerald-200/40 shadow-md bg-gradient-to-r from-emerald-50 to-white">
            <CardContent className="p-5 flex items-start gap-4">
              <Lightbulb className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Como funciona?</h4>
                <p className="text-sm text-slate-600 mt-1">
                  Acumule pontos a publicar conteúdo e interagir na plataforma. Use os pontos para ativar chamadas HD ou enviar SMS mesmo quando o utilizador está offline. Cada nível reduz o custo por minuto.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export { NetworkPage };
export default NetworkPage;
