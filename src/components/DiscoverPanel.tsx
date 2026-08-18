import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { UserPlus, Sparkles, Sprout, X } from 'lucide-react';
import { peopleYouMayKnow, newTalents, parseTags } from '../lib/discovery';

interface PersonCardProps {
  u: any;
  reason?: string;
  isFollowing: boolean;
  onFollow: (targetId: string, targetName: string, targetAvatar?: string) => void;
  onOpen: (uid: string) => void;
}

function PersonCard({ u, reason, isFollowing, onFollow, onOpen }: PersonCardProps) {
  return (
    <div className="flex items-center gap-3 bg-white/60 hover:bg-white/80 p-3 rounded-xl border border-white/40 shadow-sm transition-all">
      <button onClick={() => onOpen(u.uid)} className="shrink-0">
        <Avatar className="h-11 w-11 border border-white/60">
          <AvatarImage src={u.photoURL} />
          <AvatarFallback>{(u.displayName || '?')[0]}</AvatarFallback>
        </Avatar>
      </button>
      <div className="flex-1 min-w-0">
        <button onClick={() => onOpen(u.uid)} className="block text-left w-full">
          <p className="text-sm font-bold text-slate-900 truncate">{u.displayName || 'Utilizador'}</p>
          <p className="text-xs text-slate-500 font-medium truncate">
            {reason || `@${u.displayName?.toLowerCase().replace(/\s+/g, '') || u.uid?.slice(0, 6)}`}
          </p>
        </button>
      </div>
      <Button
        size="sm"
        variant={isFollowing ? 'outline' : 'default'}
        className="rounded-xl text-xs shrink-0"
        onClick={() => onFollow(u.uid, u.displayName, u.photoURL)}
      >
        {isFollowing ? <X className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
        {isFollowing ? 'Seguindo' : 'Seguir'}
      </Button>
    </div>
  );
}

interface DiscoverPanelProps {
  user: any;
  profileData: any;
  allUsers: any[];
  followingIds: string[];
  handleFollow: (targetId: string, targetName: string, targetAvatar?: string) => void;
  onOpenProfile: (uid: string) => void;
}

export function DiscoverPanel({
  user,
  profileData,
  allUsers,
  followingIds,
  handleFollow,
  onOpenProfile,
}: DiscoverPanelProps) {
  const viewerTags = useMemo(
    () => parseTags(profileData?.tags),
    [profileData?.tags]
  );
  const viewerCountry = profileData?.country;

  const suggestions = useMemo(
    () =>
      peopleYouMayKnow({
        uid: user?.uid,
        viewerTags,
        viewerCountry,
        followingIds,
        allUsers,
        limit: 8,
      }),
    [user?.uid, viewerTags, viewerCountry, followingIds, allUsers]
  );

  const talents = useMemo(
    () => newTalents({ allUsers, limit: 6 }),
    [allUsers]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-500" />
          Descoberta Connectada
        </h2>
        <p className="text-slate-700 font-medium text-base">
          O Discovery Engine encontra pessoas e conteúdos com base em interesses reais — não em popularidade.
        </p>
      </div>

      <Card className="glass-card border-white/30 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Pessoas que talvez conheças
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            Perfis com interesses ou origem parecidos com os teus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {suggestions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Adiciona interesses ao teu perfil para ver sugestões.</p>
          ) : (
            suggestions.map((s) => (
              <div key={s.user.uid}>
                <PersonCard
                  u={s.user}
                  reason={s.reasons[0]}
                  isFollowing={followingIds.includes(s.user.uid)}
                  onFollow={handleFollow}
                  onOpen={onOpenProfile}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-amber-200/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
            <Sprout className="h-5 w-5 text-emerald-500" /> 🌱 Novos Talentos
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            Contas novas ou pouco conhecidas — damos uma chance a todos de serem descobertos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {talents.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Sem novos talentos de momento.</p>
          ) : (
            talents.map((u) => (
              <div key={u.uid}>
                <PersonCard
                  u={u}
                  reason="Criador em ascensão"
                  isFollowing={followingIds.includes(u.uid)}
                  onFollow={handleFollow}
                  onOpen={onOpenProfile}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
