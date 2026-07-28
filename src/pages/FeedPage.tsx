import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Heart, MessageSquare, Share2, ImageIcon, Video, Send, MoreHorizontal, Home } from 'lucide-react';
import { ThermalBadge } from '../components/ThermalBadge';
import { calculateTemperature } from '../lib/thermal-utils';

interface FeedPageProps {
  user: any;
  profileData: any;
  posts: any[];
  newPostContent: string;
  setNewPostContent: (val: string) => void;
  isPosting: boolean;
  handlePublish: () => void;
  handleLikePost: (postId: string) => void;
  toggleComments: (postId: string) => void;
  expandedComments: Record<string, boolean>;
  postComments: Record<string, any[]>;
  commentInputs: Record<string, string>;
  setCommentInputs: (val: Record<string, string>) => void;
  handleAddComment: (postId: string) => void;
  isCommenting: Record<string, boolean>;
  handleComingSoon: () => void;
}

const FeedPage: React.FC<FeedPageProps> = ({
  user,
  profileData,
  posts,
  newPostContent,
  setNewPostContent,
  isPosting,
  handlePublish,
  handleLikePost,
  toggleComments,
  expandedComments,
  postComments,
  commentInputs,
  setCommentInputs,
  handleAddComment,
  isCommenting,
  handleComingSoon,
}) => {
  const [feedSubTab, setFeedSubTab] = useState<'global' | 'following' | 'trending'>('global');
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
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group" onClick={handleComingSoon}>
          <div className="relative">
            <Avatar className="h-[64px] w-[64px] border-2 border-white/80 shadow-md">
              <AvatarImage src={profileData.photoURL || "https://github.com/shadcn.png"} />
            </Avatar>
            <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-0.5 border-2 border-white shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-700">Criar Story</span>
        </div>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group" onClick={handleComingSoon}>
            <div className="rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-primary">
              <Avatar className="h-[60px] w-[60px] border-2 border-white/90 shadow-sm">
                <AvatarImage src={`https://i.pravatar.cc/150?img=${i + 10}`} />
              </Avatar>
            </div>
            <span className="text-xs font-semibold text-slate-700">@user_{i}</span>
          </div>
        ))}
      </div>

      {/* Post Composer */}
      <Card className="glass-card border-white/30 shadow-md">
        <CardContent className="p-4 sm:p-5">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 border border-white/50 shadow-sm mt-1">
              <AvatarImage src={profileData.photoURL || "https://github.com/shadcn.png"} />
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
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-xl px-2.5 h-9" onClick={handleComingSoon}>
                <ImageIcon className="h-4 w-4 mr-2 text-emerald-500" /> Foto
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-xl px-2.5 h-9" onClick={handleComingSoon}>
                <Video className="h-4 w-4 mr-2 text-rose-500" /> Vídeo
              </Button>
            </div>
            <Button size="sm" className="rounded-xl px-6 font-bold shadow-md" onClick={handlePublish} disabled={isPosting || !newPostContent.trim()}>
              {isPosting ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed Content */}
      <div className="space-y-6 pb-20">
        {posts.map((post) => (
          <Card key={post.id} className="glass-card border-white/30 shadow-md overflow-hidden">
            <CardHeader className="p-4 sm:p-5 flex flex-row items-center gap-3 space-y-0">
              <div className="rounded-full p-0.5 bg-gradient-to-tr from-amber-400 to-primary">
                <Avatar className="h-11 w-11 border-2 border-white shadow-sm">
                  <AvatarImage src={post.authorAvatar || "https://github.com/shadcn.png"} />
                </Avatar>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-900 text-[15px]">{post.authorName}</span>
                  <span className="inline-flex items-center rounded-md border border-amber-200/50 px-1.5 py-0 text-[10px] font-bold bg-amber-100/50 text-amber-700">Creator</span>
                  <ThermalBadge temperature={calculateTemperature(post.likes, post.comments)} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-xs font-semibold">{post.authorHandle}</span>
                  <span className="text-slate-300 text-xs">•</span>
                  <span className="text-slate-400 text-xs font-medium">{post.createdAt ? new Date(post.createdAt).toLocaleDateString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : 'Agora'}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-white/50 rounded-full" onClick={handleComingSoon}>
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <p className="px-4 sm:px-5 pb-4 text-slate-800 font-medium text-[15px] leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
              {post.image && (
                <div className="w-full bg-slate-100/30">
                  <img src={post.image} alt="Post content" className="w-full h-auto max-h-[500px] object-cover" />
                </div>
              )}
            </CardContent>
            <CardFooter className="p-2.5 sm:p-3 flex items-center justify-between border-t border-white/20 bg-white/20">
              <div className="flex gap-1 sm:gap-2">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-rose-600 hover:bg-white/60 rounded-xl px-3 sm:px-4 h-9 group transition-all" onClick={() => handleLikePost(post.id)}>
                  <Heart className="h-5 w-5 mr-1.5 sm:mr-2 group-hover:fill-rose-100 transition-all" />
                  <span className="font-semibold text-sm">{post.likes || 0}</span>
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-primary hover:bg-white/60 rounded-xl px-3 sm:px-4 h-9 group transition-all" onClick={() => toggleComments(post.id)}>
                  <MessageSquare className="h-5 w-5 mr-1.5 sm:mr-2 group-hover:fill-blue-100 transition-all" />
                  <span className="font-semibold text-sm">{post.comments || 0}</span>
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 hover:bg-white/60 rounded-xl px-3 sm:px-4 h-9 transition-all" onClick={handleComingSoon}>
                <Share2 className="h-5 w-5 sm:mr-2" />
                <span className="font-semibold text-sm hidden sm:inline">Partilhar</span>
              </Button>
            </CardFooter>
            {expandedComments[post.id] && (
              <div className="bg-white/40 border-t border-white/20 p-4">
                <div className="space-y-4 mb-4">
                  {postComments[post.id] && postComments[post.id].length > 0 ? (
                    postComments[post.id].map((cm: any, idx: number) => (
                      <div key={idx} className="flex gap-3">
                        <Avatar className="h-8 w-8 border border-white/50 shrink-0">
                          <AvatarImage src={cm.authorAvatar} />
                          <AvatarFallback>{cm.authorName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="bg-white/60 rounded-2xl p-3 text-sm border border-white/40 shadow-sm flex-1">
                          <div className="font-bold text-slate-900 mb-0.5">{cm.authorName}</div>
                          <div className="text-slate-800 break-words">{cm.content}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2 font-medium">Sê o primeiro a comentar!</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={profileData.photoURL || "https://github.com/shadcn.png"} />
                    <AvatarFallback>{profileData.displayName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      placeholder="Escreve um comentário..."
                      className="flex-1 glass-input bg-white/50 border-white/50 text-sm px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({...commentInputs, [post.id]: e.target.value})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="default"
                      className="rounded-xl px-4 shadow-sm"
                      disabled={!commentInputs[post.id]?.trim() || isCommenting[post.id]}
                      onClick={() => handleAddComment(post.id)}
                    >
                      {isCommenting[post.id] ? '...' : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-500 font-medium">Nenhuma publicação ainda. Cria a primeira!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { FeedPage };
export default FeedPage;
