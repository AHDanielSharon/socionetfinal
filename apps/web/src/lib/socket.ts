import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { useEffect, useRef } from 'react';
import { tokenStore } from './api';

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:4001';

// ── Socket store
interface SocketStore {
  socket: Socket | null;
  connected: boolean;
  setSocket: (s: Socket | null) => void;
  setConnected: (v: boolean) => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
  socket: null,
  connected: false,
  setSocket:    (socket) => set({ socket }),
  setConnected: (connected) => set({ connected }),
}));

// ── Notification unread count store (exported so Providers + hooks can share it)
interface NotifStore {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  increment: () => void;
  reset: () => void;
}

export const useNotifStore = create<NotifStore>((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),
  increment: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  reset: () => set({ unreadCount: 0 }),
}));

// ── Main hook — call once at app root
export const useSocket = (userId: string | null): void => {
  const { setSocket, setConnected } = useSocketStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = tokenStore.getAccess();
    if (!token) return;

    const socket = io(REALTIME_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socketRef.current = socket;
    setSocket(socket);

    socket.on('connect', () => {
      setConnected(true);
      // Join personal room
      socket.emit('presence:ping');
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Handle incoming notifications → bump unread count
    socket.on('notification:new', () => {
      useNotifStore.getState().increment();
    });

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(() => {
      if (socket.connected) socket.emit('presence:ping');
    }, 60000);

    return () => {
      clearInterval(heartbeat);
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [userId]);
};

// ── Conversation-scoped hook
export const useConversationSocket = (conversationId: string | null) => {
  const { socket } = useSocketStore();

  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit('conversation:join', conversationId);
    return () => socket.emit('conversation:leave', conversationId);
  }, [socket, conversationId]);

  const sendTypingStart = () => socket?.emit('typing:start', { conversationId });
  const sendTypingStop  = () => socket?.emit('typing:stop',  { conversationId });
  const markRead = (messageIds: string[]) =>
    socket?.emit('messages:read', { conversationId, messageIds });

  return { sendTypingStart, sendTypingStop, markRead };
};

// ── Call socket hook
export const useCallSocket = () => {
  const { socket } = useSocketStore();

  const initiateCall = (targetUserId: string, callType: 'audio' | 'video', callId: string) =>
    socket?.emit('call:initiate', { targetUserId, callType, callId });

  const answerCall = (callId: string, targetUserId: string, answer: any) =>
    socket?.emit('call:answer', { callId, targetUserId, answer });

  const rejectCall = (callId: string, targetUserId: string) =>
    socket?.emit('call:reject', { callId, targetUserId });

  const endCall = (callId: string, targetUserId: string) =>
    socket?.emit('call:end', { callId, targetUserId });

  const sendIceCandidate = (callId: string, targetUserId: string, candidate: RTCIceCandidateInit) =>
    socket?.emit('call:ice_candidate', { callId, targetUserId, candidate });

  const sendSdpOffer = (callId: string, targetUserId: string, sdp: RTCSessionDescriptionInit) =>
    socket?.emit('call:sdp_offer', { callId, targetUserId, sdp });

  const sendSdpAnswer = (callId: string, targetUserId: string, sdp: RTCSessionDescriptionInit) =>
    socket?.emit('call:sdp_answer', { callId, targetUserId, sdp });

  return { initiateCall, answerCall, rejectCall, endCall, sendIceCandidate, sendSdpOffer, sendSdpAnswer };
};

// ── Live stream hook
export const useLiveSocket = (streamId: string | null) => {
  const { socket } = useSocketStore();

  useEffect(() => {
    if (!socket || !streamId) return;
    socket.emit('live:join', streamId);
    return () => socket?.emit('live:leave', streamId);
  }, [socket, streamId]);

  const sendReaction = (emoji: string) => socket?.emit('live:reaction', { streamId, emoji });
  const sendComment  = (content: string) => socket?.emit('live:comment', { streamId, content });

  return { sendReaction, sendComment };
};
