import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Camera, UserCircle, Palette, Youtube, Instagram, Facebook, MessageCircle, CheckCircle2, Award, Users, Share2, Link as LinkIcon, Video } from 'lucide-react';
import { CreditDisplay } from '../components/CreditDisplay';
import { UserLevelBadge } from '../components/UserLevelBadge';
import { CrownBadge } from '../components/CrownBadge';
import { CcsUploader } from '../components/CcsUploader';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface ProfilePageProps {
  user: any;
  profileData: any;
  setProfileData: (data: any) => void;
  isSaving: boolean;
  handleSaveProfile: () => void;
  photoInputRef: React.RefObject<HTMLInputElement>;
  coverInputRef: React.RefObject<HTMLInputElement>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'photoURL' | 'coverURL') => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  profileData,
  setProfileData,
  isSaving,
  handleSaveProfile,
  photoInputRef,
  coverInputRef,
  handleImageUpload,
}) => {
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [copiedProfile, setCopiedProfile] = useState(false);
  const [gallery, setGallery] = useState<{ url: string; kind: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubs: any[] = [];
    const fq = query(collection(db, 'follows'), where('followingId', '==', user.uid));
    unsubs.push(onSnapshot(fq, (snap) => setFollowersCount(snap.size), (e) => console.error(e)));
    const fg = query(collection(db, 'follows'), where('followerId', '==', user.uid));
    unsubs.push(onSnapshot(fg, (snap) => setFollowingCount(snap.size), (e) => console.error(e)));
    const pq = query(collection(db, 'posts'), where('userId', '==', user.uid));
    unsubs.push(onSnapshot(pq, (snap) => {
      let photos = 0;
      let videos = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'deleted') return;
        const m = data.media;
        if (m?.type === 'video') videos += 1;
        else if (m?.type === 'photo') photos += 1;
      });
      setPhotoCount(photos);
      setVideoCount(videos);
    }, (e) => console.error(e)));
    return () => unsubs.forEach((u) => u());
  }, [user]);

  const handleShareProfile = () => {
    const url = `https://www.connectedking.web.app/?tab=profile&user=${user.uid}`;
    if (navigator.share) {
      navigator.share({ title: `${profileData.displayName || 'Utilizador'} na Connected`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedProfile(true);
      setTimeout(() => setCopiedProfile(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Seu Perfil</h2>
        <p className="text-slate-700 font-medium text-base">Personalize sua identidade na rede Connected.</p>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden shadow-xl border-white/30">
        <input type="file" accept="image/*" ref={coverInputRef} className="hidden" onChange={(e) => handleImageUpload(e, 'coverURL')} />
        <input type="file" accept="image/*" ref={photoInputRef} className="hidden" onChange={(e) => handleImageUpload(e, 'photoURL')} />
        {/* Banner */}
        <div className="h-48 md:h-72 w-full relative group bg-gradient-to-r from-blue-400 to-cyan-500">
          <img src={profileData.coverURL || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2000&auto=format&fit=crop"} alt="Cover" className="w-full h-full object-cover opacity-80 mix-blend-overlay" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button variant="secondary" className="glass backdrop-blur-md border-white/40 text-slate-900 font-semibold rounded-xl" onClick={() => coverInputRef.current?.click()}><Camera className="mr-2 h-4 w-4"/> Alterar Capa</Button>
          </div>
        </div>

        {/* Avatar & Info */}
        <div className="px-6 sm:px-10 pb-10 relative">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-16 sm:-mt-24 mb-8 relative z-10">
            <div className="relative group">
              <Avatar className="h-32 w-32 sm:h-40 sm:w-40 border-4 border-white/50 shadow-xl">
                <AvatarImage src={profileData.photoURL || "https://github.com/shadcn.png"} alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <CcsUploader
                  userId={user.uid}
                  userName={profileData.displayName || 'Utilizador'}
                  folder="avatar"
                  kind="avatar"
                  accept="image/*"
                  label=""
                  icon={<Camera className="h-6 w-6 text-white" />}
                  user={user}
                  profileData={profileData}
                  className="bg-transparent border-0 shadow-none"
                  onUploaded={(urls) => urls[0] && setProfileData((prev: any) => ({ ...prev, photoURL: urls[0] }))}
                />
              </div>
            </div>
            <div className="flex-1 pb-2 sm:pb-4">
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">{profileData.displayName || 'Novo Usuário'} <CrownBadge points={profileData.points || 0} size="md" /></h1>
              <p className="text-slate-700 font-medium text-base sm:text-lg mb-2">@{profileData.displayName?.toLowerCase().replace(/\s+/g, '') || 'usuario'} <UserLevelBadge points={profileData.points || 0} size="md" /></p>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-white/40 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {followersCount} Seguidores
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-white/40 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                  <UserCircle className="h-3.5 w-3.5 text-cyan-500" />
                  {followingCount} A Seguir
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-white/40 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                  <Camera className="h-3.5 w-3.5 text-rose-500" />
                  {photoCount} Fotos
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-white/40 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                  <Youtube className="h-3.5 w-3.5 text-emerald-500" />
                  {videoCount} Vídeos
                </span>
                {profileData.youtube && (
                  <a href={profileData.youtube.startsWith('http') ? profileData.youtube : `https://${profileData.youtube}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/60 hover:bg-white border border-white/40 rounded-full shadow-sm transition-all text-red-600">
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
                {profileData.instagram && (
                    <a href={profileData.instagram.startsWith('http') ? profileData.instagram : `https://${profileData.instagram}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/60 hover:bg-white border border-white/40 rounded-full shadow-sm transition-all text-blue-600">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {profileData.tiktok && (
                  <a href={profileData.tiktok.startsWith('http') ? profileData.tiktok : `https://${profileData.tiktok}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/60 hover:bg-white border border-white/40 rounded-full shadow-sm transition-all text-slate-900">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                  </a>
                )}
                {profileData.facebook && (
                  <a href={profileData.facebook.startsWith('http') ? profileData.facebook : `https://${profileData.facebook}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/60 hover:bg-white border border-white/40 rounded-full shadow-sm transition-all text-blue-600">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {profileData.whatsapp && (
                  <a href={profileData.whatsapp.startsWith('http') ? profileData.whatsapp : `https://wa.me/${profileData.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/60 hover:bg-white border border-white/40 rounded-full shadow-sm transition-all text-emerald-500">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            <div className="pb-2 sm:pb-4 flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                className="rounded-xl shadow-md w-full sm:w-auto h-12 px-5 font-semibold border-white/40 bg-white/40 hover:bg-white/70"
                onClick={handleShareProfile}
              >
                {copiedProfile ? <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> : <Share2 className="mr-2 h-4 w-4" />}
                {copiedProfile ? 'Link Copiado!' : 'Partilhar Perfil'}
              </Button>
              <Button
                className="rounded-xl shadow-md w-full sm:w-auto text-md h-12 px-8 font-semibold"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid md:grid-cols-2 gap-10 mt-8">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary"/> Informações Básicas</h3>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800">Nome de Exibição</label>
                <input
                  type="text"
                  value={profileData.displayName}
                  onChange={(e) => setProfileData({...profileData, displayName: e.target.value})}
                  className="w-full glass-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 font-medium placeholder:text-slate-500 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800">Bio (Apresentação)</label>
                <textarea
                  rows={4}
                  value={profileData.bio}
                  onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                  placeholder="Fale um pouco sobre você..."
                  className="w-full glass-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 font-medium placeholder:text-slate-500 resize-none shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800">Tags de Nicho</label>
                <input
                  type="text"
                  value={profileData.tags}
                  onChange={(e) => setProfileData({...profileData, tags: e.target.value})}
                  placeholder="Ex: Design, Tech, Lifestyle"
                  className="w-full glass-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 font-medium placeholder:text-slate-500 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Palette className="h-6 w-6 text-primary"/> Personalização</h3>
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-800">Cor de Destaque</label>
                <div className="flex gap-4 flex-wrap">
                  {['bg-blue-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-teal-500', 'bg-sky-500'].map((color, i) => (
                    <button
                      key={i}
                      onClick={() => setProfileData({...profileData, color})}
                      className={`h-12 w-12 rounded-full ${color} shadow-lg border-2 ${profileData.color === color ? 'border-white' : 'border-transparent'} flex items-center justify-center hover:scale-110 transition-transform`}
                    >
                      {profileData.color === color && <CheckCircle2 className="h-6 w-6 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mt-8">
                <label className="text-sm font-bold text-slate-800">Links Sociais em Destaque</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 glass-input p-2 rounded-xl shadow-sm">
                    <div className="bg-white/80 p-2 rounded-lg"><Youtube className="h-5 w-5 text-red-500" /></div>
                    <input
                      type="text"
                      value={profileData.youtube}
                      onChange={(e) => setProfileData({...profileData, youtube: e.target.value})}
                      placeholder="youtube.com/seu-canal"
                      className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 font-medium px-2 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-3 glass-input p-2 rounded-xl shadow-sm">
                    <div className="bg-white/80 p-2 rounded-lg"><Instagram className="h-5 w-5 text-blue-500" /></div>
                    <input
                      type="text"
                      value={profileData.instagram}
                      onChange={(e) => setProfileData({...profileData, instagram: e.target.value})}
                      placeholder="instagram.com/seu-perfil"
                      className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 font-medium px-2 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-3 glass-input p-2 rounded-xl shadow-sm">
                    <div className="bg-white/80 p-2 rounded-lg"><svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-slate-900"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg></div>
                    <input
                      type="text"
                      value={profileData.tiktok}
                      onChange={(e) => setProfileData({...profileData, tiktok: e.target.value})}
                      placeholder="tiktok.com/@seu-perfil"
                      className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 font-medium px-2 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-3 glass-input p-2 rounded-xl shadow-sm">
                    <div className="bg-white/80 p-2 rounded-lg"><Facebook className="h-5 w-5 text-blue-600" /></div>
                    <input
                      type="text"
                      value={profileData.facebook}
                      onChange={(e) => setProfileData({...profileData, facebook: e.target.value})}
                      placeholder="facebook.com/sua-pagina"
                      className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 font-medium px-2 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-3 glass-input p-2 rounded-xl shadow-sm">
                    <div className="bg-white/80 p-2 rounded-lg"><MessageCircle className="h-5 w-5 text-emerald-500" /></div>
                    <input
                      type="text"
                      value={profileData.whatsapp}
                      onChange={(e) => setProfileData({...profileData, whatsapp: e.target.value})}
                      placeholder="Seu número (ex: 5511999999999)"
                      className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 font-medium px-2 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 max-w-sm">
            <CreditDisplay points={profileData.points || 0} />
          </div>

          <Card className="mt-6 glass-card border-white/30">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Galeria Connected Cloud</CardTitle>
              <CardDescription className="text-slate-600">Fotos e vídeos armazenados na tua Connected Cloud (users/{user.uid}/photos e /videos).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <CcsUploader
                  userId={user.uid}
                  userName={profileData.displayName || 'Utilizador'}
                  folder="photos"
                  kind="photo"
                  accept="image/*"
                  multiple
                  label="Foto"
                  icon={<Camera className="h-4 w-4" />}
                  user={user}
                  profileData={profileData}
                  onUploaded={(urls) => setGallery((prev) => [...prev, ...urls.map((u) => ({ url: u, kind: 'photo' }))])}
                />
                <CcsUploader
                  userId={user.uid}
                  userName={profileData.displayName || 'Utilizador'}
                  folder="videos"
                  kind="video"
                  accept="video/*"
                  label="Vídeo"
                  icon={<Video className="h-4 w-4" />}
                  user={user}
                  profileData={profileData}
                  onUploaded={(urls) => setGallery((prev) => [...prev, ...urls.map((u) => ({ url: u, kind: 'video' }))])}
                />
              </div>
              {gallery.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map((g, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-white/60 bg-black/5">
                      {g.kind === 'video' ? (
                        <video src={g.url} className="h-24 w-full object-cover" muted playsInline />
                      ) : (
                        <img src={g.url} className="h-24 w-full object-cover" alt="Galeria" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export { ProfilePage };
export default ProfilePage;
