'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  BadgeCheck, MapPin, Smile, Edit2, Trash2, Link as LinkIcon, Flag,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { cn, formatCount, formatTimeAgo, linkifyText, generateGradient } from '@/lib/utils';
import toast from 'react-hot-toast';

const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👏'];

interface PostCardProps {
  post: any;
  onUpdate?: (updates: any) => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function PostCard({ post, onUpdate, onDelete, compact }: PostCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [liked, setLiked]         = useState(!!post.is_liked);
  const [saved, setSaved]         = useState(!!post.is_saved);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount]           = useState(post.comments_count || 0);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu]   = useState(false);
  const [mediaIdx, setMediaIdx]   = useState(0);
  const reactionTimer             = useRef<NodeJS.Timeout>();
  const isMe = user?.id === post.user_id;
  const media: any[] = post.media || [];

  // ── Like
  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c: number) => c + (wasLiked ? -1 : 1));
    try {
      await api.posts.like(post.id, wasLiked ? 'unlike' : 'like');
      onUpdate?.({ is_liked: !wasLiked, likes_count: likesCount + (wasLiked ? -1 : 1) });
    } catch {
      setLiked(wasLiked);
      setLikesCount((c: number) => c + (wasLiked ? 1 : -1));
    }
  };

  const handleReact = async (emoji: string) => {
    setShowReactions(false);
    const wasLiked = liked;
    setLiked(true);
    if (!wasLiked) setLikesCount((c: number) => c + 1);
    try { await api.posts.like(post.id, emoji); }
    catch { if (!wasLiked) { setLiked(false); setLikesCount((c: number) => c - 1); } }
  };

  // ── Save
  const handleSave = async () => {
    const prev = saved;
    setSaved(!prev);
    try {
      await api.posts.save(post.id);
      toast.success(prev ? 'Removed from saved' : '🔖 Saved');
      onUpdate?.({ is_saved: !prev });
    } catch { setSaved(prev); }
  };

  // ── Share
  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ url, title: post.caption });
      else { await navigator.clipboard.writeText(url); toast.success('Link copied! 🔗'); }
    } catch {}
  };

  // ── Delete
  const handleDelete = async () => {
    setShowMenu(false);
    if (!confirm('Delete this post?')) return;
    try {
      await api.posts.delete(post.id);
      toast.success('Post deleted');
      onDelete?.();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <article className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-border-2 transition-colors">
      {/* ── Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div
          className="flex items-center gap-3 cursor-pointer min-w-0"
          onClick={() => router.push(`/profile/${post.username}`)}
        >
          <Avatar src={post.avatar_url} name={post.full_name} size={40} className="flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm truncate">{post.full_name}</span>
              {post.is_verified && <BadgeCheck size={14} className="text-accent flex-shrink-0" />}
              {post.is_creator && (
                <span className="badge badge-neon text-[10px] py-0 px-2 flex-shrink-0">Creator</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-4 mt-0.5">
              <span>@{post.username}</span>
              <span>·</span>
              <span>{formatTimeAgo(post.created_at)}</span>
              {post.location_name && (
                <>
                  <span>·</span>
                  <MapPin size={11} className="text-text-4" />
                  <span className="truncate max-w-[120px]">{post.location_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="relative flex-shrink-0 ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-text-3 transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-surface-2 border border-border-2 rounded-xl shadow-card2 z-20 overflow-hidden">
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-2 hover:bg-surface-3 transition-colors"
                  onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`); toast.success('Link copied'); setShowMenu(false); }}
                >
                  <LinkIcon size={14} /> Copy link
                </button>
                {isMe && (
                  <>
                    <button
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-2 hover:bg-surface-3 transition-colors"
                      onClick={() => { setShowMenu(false); router.push(`/post/${post.id}?edit=1`); }}
                    >
                      <Edit2 size={14} /> Edit post
                    </button>
                    <button
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      onClick={handleDelete}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
                {!isMe && (
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-2 hover:bg-surface-3 transition-colors"
                    onClick={() => { setShowMenu(false); toast('Report submitted'); }}
                  >
                    <Flag size={14} /> Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Caption */}
      {post.caption && (
        <div className="px-4 pb-3">
          <p
            className="text-sm text-text-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: linkifyText(post.caption) }}
          />
        </div>
      )}

      {/* ── Media */}
      {media.length > 0 && (
        <div className="relative bg-surface-2 overflow-hidden" style={{ maxHeight: 500 }}>
          {/* Carousel */}
          {media.length > 1 && (
            <div className="absolute top-3 right-3 z-10 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
              {mediaIdx + 1}/{media.length}
            </div>
          )}

          {media[mediaIdx]?.type === 'video' ? (
            <video
              src={media[mediaIdx].url}
              className="w-full object-contain max-h-[500px]"
              controls
              playsInline
              preload="metadata"
              poster={media[mediaIdx].thumbnail_url}
            />
          ) : (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <Image
                src={media[mediaIdx].url}
                alt={media[mediaIdx].alt_text || post.caption || ''}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 640px"
                placeholder={media[mediaIdx].blurhash ? 'blur' : 'empty'}
              />
            </div>
          )}

          {/* Carousel nav */}
          {media.length > 1 && (
            <>
              {mediaIdx > 0 && (
                <button
                  onClick={() => setMediaIdx(i => i - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
                >
                  ‹
                </button>
              )}
              {mediaIdx < media.length - 1 && (
                <button
                  onClick={() => setMediaIdx(i => i + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
                >
                  ›
                </button>
              )}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {media.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setMediaIdx(i)}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all',
                      i === mediaIdx ? 'bg-white w-3' : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Quoted post */}
      {post.quoted_post && (
        <div
          className="mx-4 my-2 border border-border-2 rounded-xl p-3 cursor-pointer hover:bg-surface-2 transition-colors"
          onClick={() => router.push(`/post/${post.quoted_post.id}`)}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-3">@{post.quoted_post.user_username}</span>
          </div>
          <p className="text-xs text-text-3 line-clamp-2">{post.quoted_post.caption}</p>
        </div>
      )}

      {/* ── Action bar */}
      <div className="flex items-center px-3 py-1.5 gap-1">
        {/* Like with reaction picker */}
        <div
          className="relative"
          onMouseEnter={() => { reactionTimer.current = setTimeout(() => setShowReactions(true), 400); }}
          onMouseLeave={() => { clearTimeout(reactionTimer.current); setShowReactions(false); }}
        >
          <button
            onClick={handleLike}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
              liked ? 'text-red-400 bg-red-400/10' : 'text-text-3 hover:bg-surface-2 hover:text-text'
            )}
          >
            <Heart size={17} className={liked ? 'fill-red-400' : ''} />
            {!compact && <span>{formatCount(likesCount)}</span>}
          </button>

          {/* Reaction picker */}
          {showReactions && (
            <div className="absolute bottom-full left-0 mb-1 bg-surface-2 border border-border-2 rounded-2xl p-2 flex gap-1 shadow-card2 z-10">
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="w-9 h-9 rounded-xl hover:bg-surface-3 flex items-center justify-center text-xl transition-all hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment */}
        <button
          onClick={() => router.push(`/post/${post.id}`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-text-3 hover:bg-surface-2 hover:text-text transition-all"
        >
          <MessageCircle size={17} />
          {!compact && <span>{formatCount(commentsCount)}</span>}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-text-3 hover:bg-surface-2 hover:text-text transition-all"
        >
          <Share2 size={17} />
          {!compact && <span>{formatCount(post.shares_count || 0)}</span>}
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ml-auto',
            saved ? 'text-accent bg-accent/10' : 'text-text-3 hover:bg-surface-2 hover:text-text'
          )}
        >
          <Bookmark size={17} className={saved ? 'fill-accent' : ''} />
        </button>
      </div>

      {/* ── Likes summary */}
      {likesCount > 0 && !post.likes_hidden && !compact && (
        <div className="px-4 pb-1">
          <button
            onClick={() => router.push(`/post/${post.id}`)}
            className="text-xs text-text-3 hover:text-text transition-colors"
          >
            <strong className="text-text">{formatCount(likesCount)}</strong> {likesCount === 1 ? 'like' : 'likes'}
          </button>
        </div>
      )}

      {/* ── Quick comment */}
      {!compact && (
        <div
          className="flex items-center gap-2 px-4 pb-3 pt-1 cursor-pointer"
          onClick={() => router.push(`/post/${post.id}`)}
        >
          <Avatar src={user?.avatar_url} name={user?.full_name} size={26} />
          <div className="flex-1 bg-surface-2 rounded-full px-4 py-1.5 text-xs text-text-4">
            Add a comment…
          </div>
        </div>
      )}
    </article>
  );
}
