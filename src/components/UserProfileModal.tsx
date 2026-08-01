import React, { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { X, UserPlus, UserCheck, MessageCircle, Users } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  onMessage: () => void;
  followingIds: string[];
  handleFollow: (targetId: string, targetName: string, targetAvatar?: string) => void;
  sendFriendRequest: (toUserId: string, toName: string, toAvatar: string) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose, onMessage, followingIds, handleFollow, sendFriendRequest }) => {
  const [profile, setProfile] = useState<any | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [friendRequestSent, setFriendRequestSent] = useState(false);

  useEffect(() => {
    const unsubProfile = onSnapshot(query(collection(db, 'users')), (snap) => {
      const u = snap.docs.find((d) => d.id === userId);
      setProfile(u ? { id: u.id, ...u.data() } : null);
    }, (e) => console.error(e));

    const unsubFollowers = onSnapshot(query(collection(db, 'follows'), where('followingId', '==', userId)), (snap) => {
      setFollowersCount(snap.size);
    }, (e) => console.error(e));

    const unsubPosts = onSnapshot(query(collection(db, 'posts'), where('userId', '==', userId)), (snap) => {
      setPostCount(snap.size);
    }, (e) => console.error(e));

    const unsubRequests = onSnapshot(query(collection(db, 'friendRequests'), where('from', '==', userId)), (snap) => {
      const pending = snap.docs.some((d) => d.data().status === 'pending');
      setFriendRequestSent(pending);
    }, (e) => console.error(e));

    return () => { unsubProfile(); unsubFollowers(); unsubPosts(); unsubRequests(); };
  }, [userId]);

  const name = profile?.displayName || profile?.email?.split('@')[0] || 'Utilizador';
  const isFollowing = followingIds.includes(userId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <Card className="w-full max-w-sm glass-card border-white/40 shadow-2xl overflow-hidden relative animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-24 bg-gradient-to-r from-indigo-500 via-primary to-emerald-400">
          {profile?.coverURL && <img src={profile.coverURL} alt="Capa" className="w-full h-full object-cover" />}
          <button onClick={onClose} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <CardContent className="p-4 -mt-10">
          <div className="flex items-end justify-between">
            <div className="rounded-full p-1 bg-white shadow-lg">
              <Avatar className="h-20 w-20 border-2 border-white">
                <AvatarImage src={profile?.photoURL} />
                <AvatarFallback className="text-2xl">{name[0]}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex gap-2 pb-1">
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5" onClick={() => {
                if (friendRequestSent) return;
                sendFriendRequest(userId, name, profile?.photoURL || '');
                setFriendRequestSent(true);
              }} disabled={friendRequestSent}>
                {friendRequestSent ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                {friendRequestSent ? 'Pedido enviado' : 'Adicionar Amigo'}
              </Button>
              <Button size="sm" className="rounded-xl text-xs font-bold gap-1.5" onClick={onMessage}>
                <MessageCircle className="h-3.5 w-3.5" /> Mensagem
              </Button>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-slate-900">{name}</h3>
            <p className="text-xs text-slate-500 font-medium">{profile?.email}</p>
            {profile?.tags && (
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{profile.tags}</p>
            )}
            {profile?.bio && <p className="text-sm text-slate-700 mt-2 leading-relaxed">{profile.bio}</p>}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white/60 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-slate-900">{followersCount}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Seguidores</p>
              </div>
              <div className="bg-white/60 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-slate-900">{followingIds.includes(userId) ? 1 : 0}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">A seguir</p>
              </div>
              <div className="bg-white/60 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-slate-900">{postCount}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Publicações</p>
              </div>
            </div>
            <Button
              className={`w-full mt-4 rounded-xl font-bold text-xs ${isFollowing ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-primary text-white hover:opacity-90'}`}
              size="sm"
              onClick={() => handleFollow(userId, name, profile?.photoURL)}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" /> {isFollowing ? 'A seguir' : 'Seguir'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { UserProfileModal };
export default UserProfileModal;
