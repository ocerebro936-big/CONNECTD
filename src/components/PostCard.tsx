import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { MessageSquare, Share2, MoreHorizontal, Send, Play, Pause, ImageIcon, Heart, FileText, Music } from 'lucide-react';
import { ThermalBadge } from './ThermalBadge';
import { StarRating } from './StarRating';
import { AudioVisualizer } from './AudioVisualizer';
import { calculateTemperature } from '../lib/thermal-utils';
import { LazyMedia } from './LazyMedia';

export type PostMediaType = 'photo' | 'video' | 'reel' | 'album' | 'panorama' | 'text' | 'pdf' | 'slides' | 'audio';

interface PostMedia {
  type: PostMediaType;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  album?: string[];
  fileName?: string;
}

interface PostComment {
  id?: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt?: number;
}

interface PostCardProps {
  post: {
    id: string;
    authorName: string;
    authorHandle?: string;
    authorAvatar?: string;
    content: string;
    media?: PostMedia;
    likes?: number;
    userLikes?: string[];
    isLiked?: boolean;
    comments?: number;
    averageRating?: number;
    totalRatings?: number;
    currentUserRating?: number;
    createdAt?: number;
    userId?: string;
  };
  profileData: {
    displayName?: string;
    photoURL?: string;
  };
  expandedComments: Record<string, boolean>;
  postComments: Record<string, PostComment[]>;
  commentInputs: Record<string, string>;
  isCommenting: Record<string, boolean>;
  onToggleComments: (postId: string) => void;
  onAddComment: (postId: string) => void;
  onSetCommentInput: (postId: string, value: string) => void;
  onRate: (postId: string, score: number) => void;
  onLike: (post: any) => void;
  onShare: (post: any) => void;
  onMoreOptions: (post: any) => void;
  onOpenProfile?: (userId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  profileData,
  expandedComments,
  postComments,
  commentInputs,
  isCommenting,
  onToggleComments,
  onAddComment,
  onSetCommentInput,
  onRate,
  onLike,
  onShare,
  onMoreOptions,
  onOpenProfile,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [mediaType, setMediaType] = useState<PostMediaType>(post.media?.type || 'text');

  useEffect(() => {
    if (post.media?.type) {
      setMediaType(post.media.type);
    } else if (imgRef.current && imgRef.current.complete) {
      detectRatio();
    }
  }, [post.media]);

  const detectRatio = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    const ratio = w / h;
    setAspectRatio(ratio);
    if (ratio > 2.5) setMediaType('panorama');
    else if (ratio > 1.2) setMediaType('photo');
    else if (ratio < 0.8) setMediaType('reel');
    else setMediaType('photo');
  };

  const temp = calculateTemperature(
    post.averageRating ? Math.round(post.averageRating * (post.totalRatings || 1)) : post.likes || 0,
    post.comments || 0
  );

  const getMediaLayoutClass = () => {
    switch (mediaType) {
      case 'panorama':
        return 'aspect-[21/9]';
      case 'reel':
      case 'video':
        return 'aspect-[9/16] max-h-[70vh]';
      case 'album':
        return 'aspect-square';
      case 'photo':
      default:
        if (aspectRatio && aspectRatio > 1) return 'aspect-video';
        return 'aspect-[4/5] max-h-[500px]';
    }
  };

  const renderMedia = () => {
    if (post.media?.type === 'pdf' || post.media?.type === 'slides' || post.media?.type === 'document') {
      return (
        <div className="mx-4 sm:mx-5 mb-2">
          <a
            href={post.media.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5 hover:from-primary/25 hover:to-primary/10 transition-all group"
          >
            <span className="h-11 w-11 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shrink-0">
              <FileText className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0 text-left">
              <span className="block font-bold text-slate-900 text-sm truncate">
                {post.media.fileName || (post.media.type === 'pdf' ? 'Documento PDF' : post.media.type === 'slides' ? 'Apresentação (Slides)' : 'Ficheiro')}
              </span>
              <span className="block text-[11px] text-slate-500 font-medium">
                {post.media.type === 'pdf' ? '📄 Documento PDF' : post.media.type === 'slides' ? '🖼 Apresentação de slides' : '📦 Ficheiro'} · Abrir em nova aba
              </span>
            </span>
            <span className="text-indigo-600 font-bold text-sm shrink-0 group-hover:translate-x-0.5 transition-transform">Ver ↗</span>
          </a>
        </div>
      );
    }

    if (post.media?.type === 'audio') {
      return (
        <div className="px-4 sm:px-5 mb-2">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-300/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent overflow-hidden relative">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
            <span className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0 relative">
              <Music className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0 relative">
              <span className="block font-bold text-slate-900 text-sm truncate">{post.media.fileName || 'Áudio'}</span>
              <AudioVisualizer playing={isAudioPlaying} bars={28} className="mt-1.5" />
              <audio
                ref={audioRef}
                src={post.media.url}
                preload="metadata"
                className="hidden"
                onPlay={() => setIsAudioPlaying(true)}
                onPause={() => setIsAudioPlaying(false)}
                onEnded={() => setIsAudioPlaying(false)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-white/70 hover:bg-white text-emerald-700 shadow-sm shrink-0 relative"
              onClick={() => {
                const a = audioRef.current;
                if (!a) return;
                if (isAudioPlaying) {
                  a.pause();
                } else {
                  a.play().catch(() => {});
                }
              }}
              aria-label={isAudioPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
            >
              {isAudioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
          </div>
        </div>
      );
    }

    if (post.media?.type === 'video' || post.media?.type === 'reel') {
      return (
        <div className={`relative w-full ${getMediaLayoutClass()} bg-slate-900 flex items-center justify-center group cursor-pointer`}>
          <LazyMedia
            type="video"
            src={post.media.url}
            poster={post.media.thumbnailUrl}
            className="w-full h-full object-contain"
          />
          {!post.media.thumbnailUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
          )}
        </div>
      );
    }

    if (post.media?.album && post.media.album.length > 1) {
      return (
        <div className="grid grid-cols-2 gap-0.5 w-full aspect-square">
          {post.media.album.slice(0, 4).map((url, i) => (
            <div key={i} className="overflow-hidden bg-slate-100">
              <LazyMedia src={url} type="image" alt={`${post.authorName} album ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
          {post.media.album.length > 4 && (
            <div className="relative overflow-hidden bg-slate-100">
              <LazyMedia src={post.media.album[4]} type="image" alt="More" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-lg">+{post.media.album.length - 4}</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    const imageUrl = post.media?.url;
    if (!imageUrl) return null;

    return (
      <div className={`w-full ${getMediaLayoutClass()} bg-slate-100/30 overflow-hidden`}>
        <LazyMedia
          src={imageUrl}
          type="image"
          alt="Post content"
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  const formatDate = (ts?: number) => {
    if (!ts) return 'Agora';
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  };

  return (
    <Card className="glass-card border-white/30 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="p-4 sm:p-5 flex flex-row items-center gap-3 space-y-0">
        <button
          onClick={() => onOpenProfile?.(post.userId)}
          className="rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 to-primary hover:scale-105 transition-transform shrink-0"
          aria-label={`Ver perfil de ${post.authorName}`}
        >
          <Avatar className="h-11 w-11 border-2 border-white shadow-sm">
            <AvatarImage src={post.authorAvatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">{post.authorName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => onOpenProfile?.(post.userId)} className="font-bold text-slate-900 text-[15px] truncate hover:underline">
              {post.authorName}
            </button>
            <ThermalBadge temperature={temp} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-xs font-semibold">{post.authorHandle || '@user'}</span>
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-slate-400 text-xs font-medium">{formatDate(post.createdAt)}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-white/50 rounded-full shrink-0" onClick={() => onMoreOptions(post)}>
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <p className="px-4 sm:px-5 pb-3 text-slate-800 font-medium text-[15px] leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
        {renderMedia()}
        <div className="px-4 sm:px-5 py-3">
          <StarRating
            postId={post.id}
            currentUserRating={post.currentUserRating}
            averageRating={post.averageRating || 0}
            totalRatings={post.totalRatings || 0}
            onRate={onRate}
            size="sm"
          />
        </div>
      </CardContent>

      <CardFooter className="p-2.5 sm:p-3 flex items-center justify-between border-t border-white/20 bg-white/20">
        <div className="flex gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={`${post.isLiked ? 'text-rose-600 bg-rose-500/10' : 'text-slate-600'} hover:text-rose-600 hover:bg-white/60 rounded-xl px-3 sm:px-4 h-9 group transition-all`}
            onClick={() => onLike(post)}
          >
            <Heart className={`h-5 w-5 mr-1.5 sm:mr-2 transition-all ${post.isLiked ? 'fill-rose-500 scale-110' : 'group-hover:scale-110'}`} />
            <span className="font-semibold text-sm">{post.likes || 0}</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-primary hover:bg-white/60 rounded-xl px-3 sm:px-4 h-9 group transition-all" onClick={() => onToggleComments(post.id)}>
            <MessageSquare className="h-5 w-5 mr-1.5 sm:mr-2 group-hover:fill-blue-100 transition-all" />
            <span className="font-semibold text-sm">{post.comments || 0}</span>
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 hover:bg-white/60 rounded-xl px-3 sm:px-4 h-9 transition-all" onClick={() => onShare(post)}>
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
              <AvatarImage src={profileData.photoURL} />
              <AvatarFallback className="text-xs">{profileData.displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Escreve um comentário..."
                className="flex-1 glass-input bg-white/50 border-white/50 text-sm px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={commentInputs[post.id] || ''}
                onChange={(e) => onSetCommentInput(post.id, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onAddComment(post.id); }}
              />
              <Button
                size="sm"
                variant="default"
                className="rounded-xl px-4 shadow-sm"
                disabled={!commentInputs[post.id]?.trim() || isCommenting[post.id]}
                onClick={() => onAddComment(post.id)}
              >
                {isCommenting[post.id] ? '...' : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PostCard;
