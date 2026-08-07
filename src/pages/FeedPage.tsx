import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ImageIcon, Video, Send, Home, Camera, X, Heart, MessageSquare, Share2, MoreHorizontal, Star, ChevronDown, ChevronUp, LayoutGrid, Play } from 'lucide-react';
import PostCard from '../components/PostCard';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../lib/image-utils';
import { storage } from '../firebase';
import { addDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface FeedPageProps {
  user: any;
  profileData: any;
  posts: any[];
  newPostContent: string;
  setNewPostContent: (val: string) => void;
  isPosting: boolean;
  handlePublish: () => void;
  handleRatePost: (postId: string, score: number) => void;
  handleLikePost: (post: any) => void;
  handleSharePost: (post: any) => void;
  handleMoreOptions: (post: any) => void;
  followingIds: string[];
  toggleComments: (postId: string) => void;
  expandedComments: Record<string, boolean>;
  postComments: Record<string, any[]>;
  commentInputs: Record<string, string>;
  setCommentInputs: (val: Record<string, string>) => void;
  handleAddComment: (postId: string) => void;
  isCommenting: Record<string, boolean>;
}

const FEED_MODE_KEY = 'connected_feed_mode';

const FeedPage: React.FC<FeedPageProps> = ({
  user,
  profileData,
  posts,
  newPostContent,
  setNewPostContent,
  isPosting,
  handlePublish,
  handleRatePost,
  handleLikePost,
  handleSharePost,
  handleMoreOptions,
  followingIds,
  toggleComments,
  expandedComments,
  postComments,
  commentInputs,
  setCommentInputs,
  handleAddComment,
  isCommenting,
}) => {
  const [feedSubTab, setFeedSubTab] = useState<'global' | 'following' | 'trending'>('global');
  const [showStoryCam, setShowStoryCam] = useState(false);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [stories, setStories] = useState<any[]>([]);
  const [viewingStory, setViewingStory] = useState<any | null>(null);
  const [feedMode, setFeedMode] = useState<'immersive' | 'list'>(() => {
    try {
      return (localStorage.getItem(FEED_MODE_KEY) as 'immersive' | 'list') || 'immersive';
    } catch {
      return 'immersive';
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(FEED_MODE_KEY, feedMode);
    } catch {}
  }, [feedMode]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'stories'), orderBy('createdAt', 'desc')), (snap) => {
      const now = Date.now();
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((s: any) => !s.expiresAt || s.expiresAt > now)
        .filter((s: any) => user ? s.userId !== user.uid : true);
      setStories(list);
    }, () => {});
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!viewingStory) return;
    const t = setTimeout(() => {
      const byUser = stories.filter((s) => s.userId === viewingStory.userId);
      const idx = byUser.findIndex((s) => s.id === viewingStory.id);
      const next = byUser[idx + 1];
      if (next) setViewingStory(next);
      else setViewingStory(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [viewingStory, stories]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video' | 'story') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      if (type === 'story') {
        setStoryPreview(dataUrl);
      } else {
        await handleMediaUpload(dataUrl, type);
      }
    } catch (err) {
      console.error('Error processing file:', err);
      alert('Erro ao processar o ficheiro.');
    }
  };

  const handleMediaUpload = async (dataUrl: string, type: 'photo' | 'video') => {
    if (!user) return;
    try {
      const fileName = `${Date.now()}_${user.uid}`;
      const storageRef = ref(storage, `${type}s/${fileName}`);
      await uploadString(storageRef, dataUrl, 'data_url');
      const url = await getDownloadURL(storageRef);
      const mediaType = type === 'video' ? 'video' : 'photo';
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        authorName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        authorHandle: `@${(profileData.displayName || user.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, '')}`,
        authorAvatar: profileData.photoURL || 'https://github.com/shadcn.png',
        content: '',
        media: { type: mediaType, url },
        ratings: { totalScore: 0, count: 0, userRatings: {} },
        likes: 0,
        comments: 0,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('Erro ao enviar ficheiro.');
    }
  };

  const handlePublishStory = async () => {
    if (!storyPreview || !user) return;
    setIsUploadingStory(true);
    try {
      const fileName = `story_${Date.now()}_${user.uid}`;
      const storageRef = ref(storage, `stories/${fileName}`);
      await uploadString(storageRef, storyPreview, 'data_url');
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'stories'), {
        userId: user.uid,
        authorName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        authorAvatar: profileData.photoURL || 'https://github.com/shadcn.png',
        imageUrl: url,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      });
      setShowStoryCam(false);
      setStoryPreview(null);
    } catch (error) {
      console.error('Error publishing story:', error);
      alert('Erro ao publicar story.');
    } finally {
      setIsUploadingStory(false);
    }
  };

  const filteredPosts = feedSubTab === 'trending'
    ? [...posts].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    : feedSubTab === 'following'
    ? posts.filter((p) => followingIds.includes(p.userId))
    : posts;

  return (
    <div className={feedMode === 'immersive' ? 'animate-in fade-in duration-500 -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8 h-[calc(100dvh-4rem)] pb-14 sm:pb-0' : 'space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500'}>
      {/* Mode Toggle */}
      <div className={feedMode === 'immersive' ? 'absolute top-16 right-2 z-40 flex gap-1 p-1 bg-black/40 backdrop-blur-xl rounded-xl border border-white/20' : 'flex justify-end pb-1'}>
        <button
          onClick={() => setFeedMode('immersive')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${feedMode === 'immersive' ? 'bg-primary text-primary-foreground shadow' : 'text-white hover:bg-white/20'}`}
          title="Modo Imersivo (vertical)"
        >
          <Play className="h-3 w-3 inline mr-1 -rotate-90" /> Imersivo
        </button>
        <button
          onClick={() => setFeedMode('list')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${feedMode === 'list' ? 'bg-primary text-primary-foreground shadow' : 'text-white hover:bg-white/20'}`}
          title="Modo Lista"
        >
          <LayoutGrid className="h-3 w-3 inline mr-1" /> Lista
        </button>
      </div>

      {feedMode === 'list' ? (
        <>
          {/* Sub-aba Navigation */}
          <div className="flex gap-1 p-1 bg-white/50 rounded-xl border border-white/30 shadow-sm">
            {[
              { id: 'global' as const, label: '🌍 Global' },
              { id: 'following' as const, label: '👥 Seguindo' },
              { id: 'trending' as const, label: '🔥 Destaques' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFeedSubTab(tab.id)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                  feedSubTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stories */}
          <div className="flex gap-4 overflow-x-auto pb-3 pt-2 px-1 scrollbar-hide">
            <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group" onClick={() => setShowStoryCam(true)}>
              <div className="relative">
                <Avatar className="h-[64px] w-[64px] border-2 border-white/80 shadow-md">
                  <AvatarImage src={profileData.photoURL} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">{profileData.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-700">Criar Story</span>
            </div>
            {Array.from(new Map(stories.map((s) => [s.userId, s])).values()).map((s: any) => (
              <div key={s.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group" onClick={() => setViewingStory(s)}>
                <div className="p-[3px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-500">
                  <Avatar className="h-[58px] w-[58px] border-2 border-white shadow-md">
                    <AvatarImage src={s.authorAvatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">{s.authorName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs font-semibold text-slate-700 max-w-[64px] truncate">{s.authorName?.split(' ')[0] || 'Story'}</span>
              </div>
            ))}
          </div>

          {/* Story Viewer */}
          {viewingStory && (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-200" onClick={() => setViewingStory(null)}>
              <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
                <img src={viewingStory.imageUrl} alt="Story" className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
                <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
                  <Avatar className="h-8 w-8 border-2 border-white/70">
                    <AvatarImage src={viewingStory.authorAvatar} />
                    <AvatarFallback className="text-[10px]">{viewingStory.authorName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate">{viewingStory.authorName}</p>
                    <p className="text-white/60 text-[10px]">{new Date(viewingStory.createdAt).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button className="text-white/80 hover:text-white p-1" onClick={() => setViewingStory(null)}><X className="h-5 w-5" /></button>
                </div>
              </div>
            </div>
          )}

          {/* Story Camera Modal */}
          {showStoryCam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
              <Card className="w-full max-w-lg glass-card border-white/40 shadow-2xl overflow-hidden relative">
                <button
                  onClick={() => { setShowStoryCam(false); setStoryPreview(null); }}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <Camera className="h-10 w-10 text-primary mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-slate-900">Criar Story</h3>
                    <p className="text-sm text-slate-500">Escolhe uma foto para publicar como story</p>
                  </div>
                  {storyPreview ? (
                    <div className="space-y-3">
                      <img src={storyPreview} alt="Story preview" className="w-full aspect-[9/16] object-cover rounded-xl" />
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setStoryPreview(null)}>
                          <X className="h-4 w-4 mr-1" /> Cancelar
                        </Button>
                        <Button className="flex-1" onClick={handlePublishStory} disabled={isUploadingStory}>
                          {isUploadingStory ? 'Publicando...' : <><Send className="h-4 w-4 mr-1" /> Publicar</>}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-5 w-5" /> Escolher Foto
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, 'story')}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Post Composer */}
          <Card className="glass-card border-white/30 shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 border border-white/50 shadow-sm mt-1">
                  <AvatarImage src={profileData.photoURL} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{profileData.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-white/40 border border-white/50 rounded-2xl p-3 shadow-inner">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="w-full bg-transparent border-none resize-none focus:outline-none text-slate-900 placeholder:text-slate-500 font-medium min-h-[50px]"
                    placeholder="O que tens em mente?"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/40">
                <div className="flex gap-1 sm:gap-2">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-xl px-2.5 h-9" onClick={() => photoInputRef.current?.click()}>
                    <ImageIcon className="h-4 w-4 mr-2 text-emerald-500" /> Foto
                  </Button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, 'photo')}
                  />
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-xl px-2.5 h-9" onClick={() => videoInputRef.current?.click()}>
                    <Video className="h-4 w-4 mr-2 text-cyan-500" /> Vídeo
                  </Button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, 'video')}
                  />
                </div>
                <Button size="sm" className="rounded-xl px-6 font-bold shadow-md" onClick={handlePublish} disabled={isPosting || !newPostContent.trim()}>
                  {isPosting ? 'Publicando...' : 'Publicar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feed Content */}
          <div className="space-y-6 pb-20">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                profileData={profileData}
                expandedComments={expandedComments}
                postComments={postComments}
                commentInputs={commentInputs}
                isCommenting={isCommenting}
                onToggleComments={toggleComments}
                onAddComment={handleAddComment}
                onSetCommentInput={(id, val) => setCommentInputs({...commentInputs, [id]: val})}
                onRate={handleRatePost}
                onLike={handleLikePost}
                onShare={handleSharePost}
                onMoreOptions={handleMoreOptions}
              />
            ))}

            {posts.length === 0 && (
              <div className="text-center py-20">
                <Home className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhuma publicação ainda. Cria a primeira!</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <ImmersiveFeed
          posts={filteredPosts}
          profileData={profileData}
          onLike={handleLikePost}
          onShare={handleSharePost}
          onMoreOptions={handleMoreOptions}
          onRate={handleRatePost}
          onToggleComments={toggleComments}
          expandedComments={expandedComments}
          postComments={postComments}
          commentInputs={commentInputs}
          setCommentInputs={setCommentInputs}
          onAddComment={handleAddComment}
          isCommenting={isCommenting}
          setFeedSubTab={setFeedSubTab}
          feedSubTab={feedSubTab}
        />
      )}
    </div>
  );
};

interface ImmersiveFeedProps {
  posts: any[];
  profileData: any;
  onLike: (post: any) => void;
  onShare: (post: any) => void;
  onMoreOptions: (post: any) => void;
  onRate: (postId: string, score: number) => void;
  onToggleComments: (postId: string) => void;
  expandedComments: Record<string, boolean>;
  postComments: Record<string, any[]>;
  commentInputs: Record<string, string>;
  setCommentInputs: (val: Record<string, string>) => void;
  onAddComment: (postId: string) => void;
  isCommenting: Record<string, boolean>;
  setFeedSubTab: (tab: 'global' | 'following' | 'trending') => void;
  feedSubTab: 'global' | 'following' | 'trending';
}

function ImmersiveFeed({
  posts,
  profileData,
  onLike,
  onShare,
  onMoreOptions,
  onRate,
  onToggleComments,
  expandedComments,
  postComments,
  commentInputs,
  setCommentInputs,
  onAddComment,
  isCommenting,
  setFeedSubTab,
  feedSubTab,
}: ImmersiveFeedProps) {
  const [index, setIndex] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const wheelLock = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(posts.length - 1, i)));
  }, [posts.length]);

  useEffect(() => {
    if (index >= posts.length && posts.length > 0) {
      setIndex(posts.length - 1);
    }
  }, [posts.length, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); goTo(index + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); goTo(index - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, goTo]);

  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelLock.current < 400) return;
    if (Math.abs(e.deltaY) < 10) return;
    wheelLock.current = now;
    if (e.deltaY > 0) goTo(index + 1);
    else goTo(index - 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) goTo(index + 1);
      else goTo(index - 1);
    }
    touchStartY.current = null;
  };

  const formatDate = (ts?: number) => {
    if (!ts) return 'Agora';
    const date = new Date(ts);
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  };

  const current = posts[index];

  if (!current) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3 bg-slate-900/5">
        <Home className="h-12 w-12 text-slate-300" />
        <p className="text-slate-500 font-medium px-6">Nenhuma publicação aqui ainda. Cria a primeira no Feed!</p>
        {feedSubTab !== 'global' && (
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setFeedSubTab('global')}>
            Ver Feed Global
          </Button>
        )}
      </div>
    );
  }

  const hasMedia = current.media?.url || current.media?.album?.length > 0;
  const isVideo = current.media?.type === 'video';
  const commentsOpen = !!expandedComments[current.id];
  const postCommentsList = postComments[current.id] || [];

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-hidden bg-slate-950 touch-pan-y select-none"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      {posts.slice(0, Math.min(posts.length, index + 3)).map((post, i) => (
        <div
          key={post.id}
          className={`absolute inset-0 transition-transform duration-500 ease-out ${i === index ? 'z-10' : 'z-0'}`}
          style={{ transform: `translateY(${(i - index) * 100}%)` }}
        >
          {post.media?.url ? (
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
              {isVideo ? (
                <video key={post.id} className="w-full h-full object-contain" poster={post.media.thumbnailUrl} controls preload="metadata" src={post.media.url} />
              ) : (
                <img src={post.media.url} alt="" className="w-full h-full object-contain" draggable={false} />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
            </div>
          ) : post.media?.album && post.media.album.length > 0 ? (
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
              <div className="w-full max-w-lg mx-4 grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden">
                {post.media.album.slice(0, 4).map((url: string, ai: number) => (
                  <img key={ai} src={url} alt="" className="w-full aspect-square object-cover" draggable={false} />
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-br from-[#1c150d] via-[#12100c] to-[#2a1e0a]">
              <div className="w-full max-w-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-full p-0.5 bg-gradient-to-tr from-amber-300 via-primary to-amber-500">
                    <Avatar className="h-11 w-11 border-2 border-white/90 shadow-lg">
                      <AvatarImage src={post.authorAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">{post.authorName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-base truncate">{post.authorName}</p>
                    <p className="text-slate-400 text-xs font-semibold">{post.authorHandle || '@user'}</p>
                  </div>
                </div>
                <p className="text-white text-xl sm:text-2xl font-medium leading-relaxed whitespace-pre-wrap break-words max-h-[45vh] overflow-y-auto pr-2">
                  {post.content || 'Sem texto.'}
                </p>
                <div className="mt-6 flex items-center gap-3 text-slate-400 text-sm font-semibold">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span>{(post.averageRating || 0).toFixed(1)} · {post.totalRatings || 0} avaliações</span>
                  <span className="text-slate-600">·</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Author overlay (media posts) */}
          {hasMedia && (
            <div className="absolute bottom-0 inset-x-0 z-20 p-4 sm:p-6 pb-20 sm:pb-6 pointer-events-none">
              <div className="flex items-center gap-3">
                <div className="rounded-full p-0.5 bg-gradient-to-tr from-amber-300 via-primary to-amber-500">
                  <Avatar className="h-10 w-10 border-2 border-white/90 shadow-lg">
                    <AvatarImage src={post.authorAvatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{post.authorName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm truncate drop-shadow">{post.authorName}</p>
                  <p className="text-white/70 text-[11px] font-semibold">{post.authorHandle || '@user'} · {formatDate(post.createdAt)}</p>
                </div>
              </div>
              {post.content && (
                <p className="mt-2 text-white/90 text-sm font-medium leading-relaxed max-w-md drop-shadow line-clamp-3">{post.content}</p>
              )}
            </div>
          )}

          {/* Right action rail */}
          <div className="absolute right-2 sm:right-4 bottom-20 sm:bottom-8 z-20 flex flex-col items-center gap-4 pointer-events-none">
            <div className="flex flex-col items-center gap-1 pointer-events-auto">
              <button
                onClick={() => onLike(post)}
                className={`p-2.5 rounded-full bg-black/30 backdrop-blur-md transition-all hover:scale-110 ${post.isLiked ? 'text-rose-500' : 'text-white'}`}
                aria-label="Gostar"
              >
                <Heart className={`h-6 w-6 ${post.isLiked ? 'fill-rose-500' : ''}`} />
              </button>
              <span className="text-white text-xs font-bold drop-shadow">{post.likes || 0}</span>
            </div>
            <div className="flex flex-col items-center gap-1 pointer-events-auto">
              <button
                onClick={() => onToggleComments(post.id)}
                className={`p-2.5 rounded-full bg-black/30 backdrop-blur-md transition-all hover:scale-110 ${commentsOpen ? 'text-primary' : 'text-white'}`}
                aria-label="Comentários"
              >
                <MessageSquare className="h-6 w-6" />
              </button>
              <span className="text-white text-xs font-bold drop-shadow">{post.comments || 0}</span>
            </div>
            <div className="flex flex-col items-center gap-1 pointer-events-auto">
              <button
                onClick={() => onRate(post.id, ((post.currentUserRating || 0) % 10) + 1)}
                className={`p-2.5 rounded-full bg-black/30 backdrop-blur-md transition-all hover:scale-110 ${post.currentUserRating ? 'text-amber-400' : 'text-white'}`}
                aria-label="Avaliar"
              >
                <Star className={`h-6 w-6 ${post.currentUserRating ? 'fill-amber-400' : ''}`} />
              </button>
              <span className="text-white text-xs font-bold drop-shadow">{(post.averageRating || 0).toFixed(1)}</span>
            </div>
            <div className="flex flex-col items-center gap-1 pointer-events-auto">
              <button
                onClick={() => onShare(post)}
                className="p-2.5 rounded-full bg-black/30 backdrop-blur-md text-white transition-all hover:scale-110"
                aria-label="Partilhar"
              >
                <Share2 className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-1 pointer-events-auto">
              <button
                onClick={() => onMoreOptions(post)}
                className="p-2.5 rounded-full bg-black/30 backdrop-blur-md text-white transition-all hover:scale-110"
                aria-label="Mais opções"
              >
                <MoreHorizontal className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Rating strip for media posts */}
          {hasMedia && (
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 pointer-events-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => onRate(post.id, score)}
                  className={`w-2 h-2 rounded-full transition-all ${score <= (post.currentUserRating || 0) ? 'bg-amber-400' : 'bg-white/30 hover:bg-white/60'}`}
                  aria-label={`Avaliar ${score}/10`}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Progress dots */}
      {posts.length > 1 && (
        <div className="absolute right-14 sm:right-20 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 pointer-events-none">
          {posts.map((p, i) => (
            <button
              key={p.id}
              onClick={() => goTo(i)}
              className={`w-1.5 rounded-full transition-all duration-300 ${i === index ? 'h-5 bg-white' : 'h-1.5 bg-white/30 hover:bg-white/60'}`}
              aria-label={`Ir para ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Navigation arrows */}
      {index > 0 && (
        <button
          onClick={() => goTo(index - 1)}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-all"
          aria-label="Anterior"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
      {index < posts.length - 1 && (
        <button
          onClick={() => goTo(index + 1)}
          className="absolute top-4 right-2 sm:right-4 z-20 p-2 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-all"
          aria-label="Seguinte"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
        {index + 1} / {posts.length}
      </div>

      {/* Comments overlay */}
      {commentsOpen && (
        <div className="absolute inset-0 z-30 flex flex-col bg-slate-950/95 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h4 className="text-white font-bold text-sm">Comentários ({current.comments || 0})</h4>
            <button onClick={() => onToggleComments(current.id)} className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {postCommentsList.length > 0 ? (
              postCommentsList.map((cm: any, idx: number) => (
                <div key={idx} className="flex gap-3">
                  <Avatar className="h-8 w-8 border border-white/20 shrink-0">
                    <AvatarImage src={cm.authorAvatar} />
                    <AvatarFallback className="text-xs">{cm.authorName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="bg-white/10 rounded-2xl p-3 text-sm border border-white/10 flex-1">
                    <div className="font-bold text-white mb-0.5">{cm.authorName}</div>
                    <div className="text-slate-200 break-words">{cm.content}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-4 font-medium">Sê o primeiro a comentar!</p>
            )}
          </div>
          <div className="p-4 border-t border-white/10 flex gap-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={profileData.photoURL} />
              <AvatarFallback className="text-xs">{profileData.displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Escreve um comentário..."
                className="flex-1 bg-white/10 border border-white/15 text-sm text-white px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-slate-400"
                value={commentInputs[current.id] || ''}
                onChange={(e) => setCommentInputs({ ...commentInputs, [current.id]: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') onAddComment(current.id); }}
              />
              <Button
                size="sm"
                className="rounded-xl px-4 shadow-sm"
                disabled={!commentInputs[current.id]?.trim() || isCommenting[current.id]}
                onClick={() => onAddComment(current.id)}
              >
                {isCommenting[current.id] ? '...' : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { FeedPage };
export default FeedPage;
