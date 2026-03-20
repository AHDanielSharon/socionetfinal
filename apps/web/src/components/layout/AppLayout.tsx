'use client';
import { ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Search, Bell, MessageCircle, Compass, Film, Video,
  Users, Zap, Wallet, Settings, Radio, PlusSquare, LogOut,
  Bot, MapPin, User as UserIcon, X, TrendingUp,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { useNotifStore } from '@/lib/socket';
import { useCallStore } from '@/stores/callStore';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/',              icon: Home,          label: 'Home' },
  { href: '/explore',       icon: Compass,       label: 'Explore' },
  { href: '/reels',         icon: Film,          label: 'Reels' },
  { href: '/videos',        icon: Video,         label: 'Videos' },
  { href: '/live',          icon: Radio,         label: 'Live' },
  { href: '/messages',      icon: MessageCircle, label: 'Messages', badge: true },
  { href: '/notifications', icon: Bell,          label: 'Alerts',   badge: true },
  { href: '/communities',   icon: Users,         label: 'Communities' },
  { href: '/ai',            icon: Bot,           label: 'AI' },
  { href: '/wallet',        icon: Wallet,        label: 'Wallet' },
  { href: '/creator',       icon: Zap,           label: 'Creator' },
  { href: '/nearby',        icon: MapPin,        label: 'Nearby' },
  { href: '/settings',      icon: Settings,      label: 'Settings' },
];

interface AppLayoutProps {
  children: ReactNode;
  showRightPanel?: boolean;
  rightPanel?: ReactNode;
  hideRightPanel?: boolean;
}

export default function AppLayout({ children, showRightPanel, rightPanel, hideRightPanel }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { unreadCount } = useNotifStore();
  const { activeCallId, remoteUser, status: callStatus, clearCall } = useCallStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Redirect to login if not authenticated
  if (!isAuthenticated && typeof window !== 'undefined') {
    router.push('/auth/login');
    return null;
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* ── Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-bg-2 fixed top-0 bottom-0 left-0 z-40 overflow-y-auto">
        {/* Logo */}
        <div className="p-6 border-b border-border flex-shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center text-white font-display font-black text-xl shadow-glow">
              S
            </div>
            <span className="font-display font-black text-xl bg-gradient-to-r from-text to-accent-3 bg-clip-text text-transparent">
              SOCIONET
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label, badge }) => {
            const active = isActive(href);
            const count = badge && label === 'Alerts' ? unreadCount : 0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative group',
                  active
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-text-3 hover:bg-surface hover:text-text'
                )}
              >
                <Icon size={18} className={active ? 'text-accent' : 'group-hover:text-text-2'} />
                <span>{label}</span>
                {count > 0 && (
                  <span className="ml-auto w-5 h-5 bg-accent rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Create post */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full btn-primary justify-center"
          >
            <PlusSquare size={16} /> Create Post
          </button>
        </div>

        {/* User */}
        {user && (
          <div className="p-4 border-t border-border">
            <div
              className="flex items-center gap-3 cursor-pointer hover:bg-surface rounded-xl p-2 transition-colors group"
              onClick={() => router.push(`/profile/${user.username}`)}
            >
              <Avatar src={user.avatar_url} name={user.full_name} size={38} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.full_name}</p>
                <p className="text-xs text-text-4 truncate">@{user.username}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); logout(); }}
                className="opacity-0 group-hover:opacity-100 text-text-4 hover:text-red-400 transition-all"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-bg-2/95 backdrop-blur border-b border-border flex items-center justify-between px-4 h-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center text-white font-display font-black text-base">S</div>
          <span className="font-display font-black text-lg">SOCIONET</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/notifications" className="relative p-2">
            <Bell size={20} className="text-text-2" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-accent rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          {user && (
            <div onClick={() => router.push(`/profile/${user.username}`)}>
              <Avatar src={user.avatar_url} name={user.full_name} size={32} />
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-2/95 backdrop-blur border-t border-border flex items-center justify-around px-2 h-16">
        {[
          { href: '/',         icon: Home,          label: 'Home' },
          { href: '/explore',  icon: Compass,       label: 'Explore' },
          { href: '/messages', icon: MessageCircle, label: 'Messages' },
          { href: '/notifications', icon: Bell,     label: 'Alerts', badge: true },
          { href: user ? `/profile/${user.username}` : '/profile', icon: UserIcon, label: 'Profile' },
        ].map(({ href, icon: Icon, label, badge }) => {
          const active = isActive(href);
          const count = badge ? unreadCount : 0;
          return (
            <Link key={href} href={href} className={cn('flex flex-col items-center gap-0.5 py-2 px-3 relative', active ? 'text-accent' : 'text-text-4')}>
              <div className="relative">
                <Icon size={22} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-accent rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen pb-16 lg:pb-0 pt-14 lg:pt-0">
        {showRightPanel && !hideRightPanel ? (
          <div className="flex">
            <div className="flex-1 min-w-0">{children}</div>
            <aside className="hidden xl:block w-80 flex-shrink-0 border-l border-border sticky top-0 h-screen overflow-y-auto">
              {rightPanel}
            </aside>
          </div>
        ) : (
          children
        )}
      </main>

      {/* ── Create post modal */}
      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCreateOpen(false)}
            />
            <motion.div
              className="relative w-full max-w-lg bg-surface border border-border-2 rounded-3xl shadow-card2 overflow-hidden"
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-display font-bold text-lg">Create Post</h2>
                <button onClick={() => setCreateOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-2 text-text-2">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <div className="flex gap-3">
                  <Avatar src={user?.avatar_url} name={user?.full_name} size={40} />
                  <textarea
                    placeholder="What's on your mind?"
                    className="flex-1 bg-transparent text-text placeholder:text-text-4 resize-none outline-none text-base leading-relaxed min-h-[100px]"
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex gap-2 text-text-3">
                    <button className="p-2 hover:bg-surface-2 rounded-lg transition-colors text-sm">📷 Photo</button>
                    <button className="p-2 hover:bg-surface-2 rounded-lg transition-colors text-sm">🎬 Video</button>
                    <button className="p-2 hover:bg-surface-2 rounded-lg transition-colors text-sm"># Tags</button>
                  </div>
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => setCreateOpen(false)}
                  >
                    Post
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Incoming call overlay */}
      <AnimatePresence>
        {callStatus === 'incoming' && remoteUser && (
          <motion.div
            className="fixed bottom-20 right-4 z-[300] bg-surface-2 border border-border-2 rounded-2xl shadow-card2 p-4 w-72"
            initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={remoteUser.avatar} name={remoteUser.name} size={44} />
              <div>
                <p className="font-semibold text-sm">{remoteUser.name}</p>
                <p className="text-xs text-text-3 animate-pulse">Incoming call…</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearCall}
                className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl py-2 text-sm font-semibold hover:bg-red-500/30"
              >
                Decline
              </button>
              <button
                onClick={() => {
                  if (activeCallId) router.push(`/calls/${activeCallId}`);
                }}
                className="flex-1 btn-primary justify-center"
              >
                Answer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
