import React, { useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ImageIcon, Video, Send, Home, Camera, X } from 'lucide-react';
import PostCard from '../components/PostCard';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video' | 'story') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (type === 'story') {
        setStoryPreview(dataUrl);
      } else {
        handleMediaUpload(dataUrl, type);
      }
    };
    reader.readAsDataURL(file);
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
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      </div>

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
    </div>
  );
};

export { FeedPage };
export default FeedPage;
