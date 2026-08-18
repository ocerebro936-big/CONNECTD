import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Users, Globe, Heart, UserPlus, Check, X, Clock, UserCheck, UserMinus } from 'lucide-react';
import { DiscoverPanel } from '../components/DiscoverPanel';
import { compatibility } from '../lib/discovery';

interface ConnectionsPageProps {
  user: any;
  profileData: any;
  allUsers: any[];
  friendRequests: any[];
  sendFriendRequest: (toUserId: string, toName: string, toAvatar: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
  followingIds: string[];
  handleFollow: (targetId: string, targetName: string, targetAvatar?: string) => void;
  onOpenProfile: (uid: string) => void;
}

const countries = ['Moçambique', 'Angola', 'Portugal', 'Brasil', 'Cabo Verde', 'São Tomé', 'Guiné-Bissau', 'Timor-Leste', 'Outros'];

function getCompatibilidade(u1: any, u2: any): number {
  return compatibility(
    { tags: (u1.tags || '').toString(), country: u1.country },
    { tags: (u2.tags || '').toString(), country: u2.country }
  ).score;
}

const ConnectionsPage: React.FC<ConnectionsPageProps> = ({
  user, profileData, allUsers, friendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
  followingIds, handleFollow, onOpenProfile,
}) => {
  const [subTab, setSubTab] = useState<'friendly' | 'countries' | 'discovery'>('friendly');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const friends = friendRequests.filter(r => r.status === 'accepted');
  const pendingSent = friendRequests.filter(r => r.from === user?.uid && r.status === 'pending');
  const pendingReceived = friendRequests.filter(r => r.to === user?.uid && r.status === 'pending');

  const friendIds = new Set(friends.map(r => r.from === user?.uid ? r.to : r.from));
  const pendingSentIds = new Set(pendingSent.map(r => r.to));
  const pendingReceivedIds = new Set(pendingReceived.map(r => r.from));

  const otherUsers = allUsers.filter(u => u.uid !== user?.uid);

  const filteredUsers = selectedCountry
    ? otherUsers.filter(u => u.country === selectedCountry)
    : otherUsers;

  const friendList = otherUsers.filter(u => friendIds.has(u.uid));
  const suggestions = filteredUsers.filter(u => !friendIds.has(u.uid));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Globe className="h-6 w-6 text-cyan-500" />
          Integrações Globais
        </h2>
        <p className="text-slate-700 font-medium text-base">
          Conecta-te com membros reais da plataforma — {otherUsers.length} utilizadores disponíveis
        </p>
      </div>

      <div className="flex gap-2 p-1.5 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/40 shadow-sm">
        {([
          { id: 'friendly' as const, label: '🤝 Conexão Amigável' },
          { id: 'countries' as const, label: '🌍 Amigos por Países' },
          { id: 'discovery' as const, label: '🔎 Descoberta' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              subTab === tab.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'friendly' && (
        <div className="space-y-6">
          <div className="border-b border-cyan-200/30 pb-4 space-y-2">
            <h3 className="text-lg font-bold text-cyan-700 flex items-center gap-2">
              <Heart className="h-5 w-5 text-cyan-500" />
              Procurar Conexão Amigável
            </h3>
            <p className="text-sm text-slate-600">
              Utilizadores com interesses compatíveis na plataforma.
            </p>
            {pendingReceived.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4" /> Pedidos de Amizade Recebidos ({pendingReceived.length})
                </h4>
                <div className="space-y-2">
                  {pendingReceived.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 bg-white rounded-lg p-2 shadow-sm">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={req.fromAvatar} />
                        <AvatarFallback className="text-xs">{req.fromName?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 font-semibold text-sm text-slate-900">{req.fromName}</span>
                      <Button size="sm" className="h-8 w-8 rounded-full bg-emerald-500 hover:bg-emerald-600 p-0" onClick={() => acceptFriendRequest(req.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="h-8 w-8 rounded-full bg-rose-500 hover:bg-rose-600 p-0" onClick={() => rejectFriendRequest(req.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {friendList.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-2 mb-3">
                <UserCheck className="h-4 w-4" /> Amigos ({friendList.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {friendList.map((u) => (
                  <div key={u.uid} className="flex items-center gap-2 bg-white/60 border border-emerald-200/50 rounded-xl p-3 shadow-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.photoURL} />
                      <AvatarFallback className="text-xs">{u.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm text-slate-900 truncate">{u.displayName || 'Utilizador'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allUsers.filter((u) => followingIds.includes(u.uid)).length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-indigo-700 flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" /> A quem sigues ({followingIds.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {allUsers
                  .filter((u) => followingIds.includes(u.uid))
                  .map((u) => (
                    <div key={u.uid} className="flex items-center gap-2 bg-white/60 border border-indigo-200/50 rounded-xl p-3 shadow-sm">
                      <button onClick={() => onOpenProfile(u.uid)} className="shrink-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.photoURL} />
                          <AvatarFallback className="text-xs">{u.displayName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                      </button>
                      <span className="flex-1 font-semibold text-sm text-slate-900 truncate">{u.displayName || 'Utilizador'}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50"
                        onClick={() => handleFollow(u.uid, u.displayName || 'Utilizador', u.photoURL || '')}
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Deixar de seguir
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestions.map((u) => {
              const isPendingSent = pendingSentIds.has(u.uid);
              const isPendingReceived = pendingReceivedIds.has(u.uid);
              const compat = getCompatibilidade(user, u);
              return (
                <Card key={u.uid} className="border-cyan-200/30 shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
                    <Avatar className="h-16 w-16 border-2 border-cyan-300 shadow-sm">
                      <AvatarImage src={u.photoURL} />
                      <AvatarFallback className="bg-cyan-100 text-cyan-600 text-lg">{u.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-slate-900">{u.displayName || 'Utilizador'}</h4>
                      <p className="text-xs text-cyan-600 font-semibold flex items-center gap-1 justify-center">
                        <Heart className="h-3 w-3" /> {compat}% Compatibilidade
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {u.tags ? u.tags.split(',').slice(0, 3).join(', ') : 'Sem interesses definidos'}
                      </p>
                      {u.country && <p className="text-xs text-slate-400 mt-0.5">{u.country}</p>}
                    </div>
                    {isPendingReceived ? (
                      <div className="flex gap-2 w-full">
                        <Button size="sm" className="flex-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 gap-1" onClick={() => {
                          const req = pendingReceived.find(r => r.from === u.uid);
                          if (req) acceptFriendRequest(req.id);
                        }}>
                          <Check className="h-3 w-3" /> Aceitar
                        </Button>
                        <Button size="sm" className="flex-1 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 gap-1" onClick={() => {
                          const req = pendingReceived.find(r => r.from === u.uid);
                          if (req) rejectFriendRequest(req.id);
                        }}>
                          <X className="h-3 w-3" /> Recusar
                        </Button>
                      </div>
                    ) : isPendingSent ? (
                      <Button size="sm" className="w-full rounded-xl text-xs font-bold gap-2 bg-amber-500 cursor-default" disabled>
                        <Clock className="h-4 w-4" /> Pedido Enviado
                      </Button>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Button size="sm" className="flex-[2] rounded-xl text-xs font-bold gap-2 bg-cyan-600 hover:bg-cyan-500" onClick={() => sendFriendRequest(u.uid, u.displayName || 'Utilizador', u.photoURL || '')}>
                          <UserPlus className="h-4 w-4" /> Conectar
                        </Button>
                        <Button
                          size="sm"
                          className={`flex-1 rounded-xl text-xs font-bold gap-2 ${followingIds.includes(u.uid) ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                          onClick={() => handleFollow(u.uid, u.displayName || 'Utilizador', u.photoURL || '')}
                        >
                          {followingIds.includes(u.uid) ? <UserMinus className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                          {followingIds.includes(u.uid) ? 'A Seguir' : 'Seguir'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {suggestions.length === 0 && otherUsers.length > 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-slate-500 font-medium">Todos os utilizadores são teus amigos! 🎉</p>
              </div>
            )}
            {otherUsers.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-slate-500 font-medium">Ainda não há outros membros na plataforma.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'countries' && (
        <div className="space-y-6">
          <div className="border-b border-cyan-200/30 pb-4">
            <h3 className="text-lg font-bold text-cyan-700 flex items-center gap-2">
              <Globe className="h-5 w-5 text-cyan-500" />
              Explorar Amigos por Países
            </h3>
            <p className="text-sm text-slate-600">Filtra membros por localização geográfica.</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 flex-wrap">
            <button
              onClick={() => setSelectedCountry(null)}
              className={`px-4 py-2 border rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                !selectedCountry ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white/60 hover:bg-cyan-100 border-white/40 text-slate-700 hover:text-cyan-700'
              }`}
            >
              Todos
            </button>
            {countries.map((country) => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`px-4 py-2 border rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCountry === country ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white/60 hover:bg-cyan-100 border-white/40 text-slate-700 hover:text-cyan-700'
                }`}
              >
                {country}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {filteredUsers.map((u) => (
              <Card key={u.uid} className="border-white/30 shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/50">
                      <AvatarImage src={u.photoURL} />
                      <AvatarFallback className="bg-cyan-100 text-cyan-600">{u.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{u.displayName || 'Utilizador'}</h4>
                      <p className="text-xs text-slate-500">{u.country || 'País não definido'} • {u.points || 0} pts</p>
                    </div>
                  </div>
                  {friendIds.has(u.uid) ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><UserCheck className="h-3 w-3" /> Amigo</span>
                  ) : pendingSentIds.has(u.uid) ? (
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" /> Pendente</span>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500" onClick={() => sendFriendRequest(u.uid, u.displayName || 'Utilizador', u.photoURL || '')}>
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Conectar
                      </Button>
                      <Button
                        size="sm"
                        className={`rounded-lg text-xs font-bold ${followingIds.includes(u.uid) ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                        onClick={() => handleFollow(u.uid, u.displayName || 'Utilizador', u.photoURL || '')}
                      >
                        {followingIds.includes(u.uid) ? <UserMinus className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                        {followingIds.includes(u.uid) ? 'Seguindo' : 'Seguir'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {filteredUsers.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-slate-500 font-medium">Nenhum membro encontrado para este filtro.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'discovery' && (
        <DiscoverPanel
          user={user}
          profileData={profileData}
          allUsers={allUsers}
          followingIds={followingIds}
          handleFollow={handleFollow}
          onOpenProfile={onOpenProfile}
        />
      )}
    </div>
  );
};

export { ConnectionsPage };
export default ConnectionsPage;