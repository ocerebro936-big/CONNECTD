import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { MessageCircle, Phone, Send, X, Award, TrendingUp, Shield, Target } from 'lucide-react';
import { CallModal } from '../components/CallModal';
import { UserLevelBadge } from '../components/UserLevelBadge';
import { JOB_ROLES } from '../lib/reputation-utils';

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
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {callingUser && (
        <CallModal user={user} targetUser={callingUser} onClose={() => setCallingUser(null)} />
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Networking</h2>
        <p className="text-slate-700 font-medium text-base">Conecte-se com criadores, empreendedores e marcas.</p>
      </div>

      {chattingWith && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white border-white/20 shadow-2xl overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white/50">
                  <AvatarImage src={chattingWith.photoURL || "https://github.com/shadcn.png"} />
                  <AvatarFallback>{chattingWith.displayName?.[0] || chattingWith.email?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-white">{chattingWith.displayName || chattingWith.email?.split('@')[0]}</h3>
                  <p className="text-xs text-white/80">Online</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setChattingWith(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 relative">
              {messages.filter(m =>
                (m.senderId === user?.uid && m.receiverId === chattingWith.id) ||
                (m.senderId === chattingWith.id && m.receiverId === user?.uid)
              ).length === 0 ? (
                <div className="text-center text-slate-400 font-medium py-10 flex flex-col items-center">
                  <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
                  Diga olá a {chattingWith.displayName || 'este utilizador'}!
                </div>
              ) : (
                messages.filter(m =>
                  (m.senderId === user?.uid && m.receiverId === chattingWith.id) ||
                  (m.senderId === chattingWith.id && m.receiverId === user?.uid)
                ).map(m => {
                  const isMe = m.senderId === user?.uid;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-sm ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'}`}>
                        {m.content}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 font-medium">{new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                placeholder="Digite sua mensagem..."
                className="flex-1 glass-input bg-slate-100 border-transparent text-sm px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="rounded-xl px-4 shadow-sm h-10 w-12 p-0 flex justify-center">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Tabs defaultValue="creators" className="w-full">
        <TabsList className="glass-input p-1 rounded-xl grid grid-cols-3">
          <TabsTrigger value="creators" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold text-slate-700">Utilizadores</TabsTrigger>
          <TabsTrigger value="opportunities" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold text-slate-700">Oportunidades</TabsTrigger>
          <TabsTrigger value="brands" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold text-slate-700">Marcas</TabsTrigger>
        </TabsList>
        <TabsContent value="creators" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allUsers.filter(u => u.id !== user?.uid).length === 0 && (
              <div className="col-span-full py-12 text-center bg-white/40 rounded-2xl border border-white/50 border-dashed">
                <p className="font-medium text-slate-500">Nenhum outro utilizador encontrado.</p>
              </div>
            )}
            {allUsers.filter(u => u.id !== user?.uid).map((u) => (
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
                    <Button variant="outline" size="sm" className="glass-input border-white/50 text-slate-700 hover:text-emerald-600 shadow-sm flex items-center h-10 gap-2 rounded-xl" onClick={() => {
                        setCallingUser(u);
                    }}>
                      <Phone className="h-4 w-4" />
                      <span>Ligar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="opportunities" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {JOB_ROLES.map((role, idx) => {
              const meetsReqs = (profileData.points || 0) >= role.minPoints;
              return (
                <Card key={idx} className={`glass-card border-white/30 shadow-md overflow-hidden ${meetsReqs ? 'ring-2 ring-emerald-400/50' : 'opacity-80'}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{role.icon}</span>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900">{role.title}</CardTitle>
                        <CardDescription className="text-xs font-semibold">
                          {meetsReqs ? (
                            <span className="text-emerald-600">✅ Requisitos cumpridos</span>
                          ) : (
                            <span className="text-amber-600">Nível {role.level} • {role.minPoints} pts necessários</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-700 font-medium">{role.description}</p>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Responsabilidades:</p>
                      <ul className="space-y-1.5">
                        {role.responsibilities.map((resp, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                            <span className="text-primary mt-0.5">•</span>
                            {resp}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white/50 rounded-xl p-3 border border-white/40">
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Compensação</p>
                      <p className="text-sm font-semibold text-emerald-700">{role.compensation}</p>
                    </div>
                    <Button
                      className="w-full rounded-xl font-bold"
                      variant={meetsReqs ? 'default' : 'outline'}
                      disabled={!meetsReqs}
                      onClick={() => alert(`Candidatura enviada para ${role.title}! Receberá uma resposta em breve.`)}
                    >
                      {meetsReqs ? 'Candidatar-me' : `${role.minPoints - (profileData.points || 0)} pts em falta`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="brands" className="mt-6">
          <div className="py-12 text-center bg-white/40 rounded-2xl border border-white/50 border-dashed">
            <p className="font-medium text-slate-500">As parcerias de marcas estarão disponíveis brevemente.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { NetworkPage };
export default NetworkPage;
