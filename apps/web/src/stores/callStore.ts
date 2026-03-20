import { create } from 'zustand';

interface RemoteUser {
  id: string;
  name: string;
  avatar?: string;
  username?: string;
}

interface CallStore {
  activeCallId: string | null;
  callType: 'audio' | 'video' | null;
  remoteUser: RemoteUser | null;
  status: 'idle' | 'incoming' | 'outgoing' | 'active' | 'ended';
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  duration: number;

  setCall:           (callId: string, type: 'audio' | 'video', user: RemoteUser, status: CallStore['status']) => void;
  setStatus:         (status: CallStore['status']) => void;
  clearCall:         () => void;
  setMuted:          (v: boolean) => void;
  setVideoOff:       (v: boolean) => void;
  setScreenSharing:  (v: boolean) => void;
  incrementDuration: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  activeCallId:    null,
  callType:        null,
  remoteUser:      null,
  status:          'idle',
  isMuted:         false,
  isVideoOff:      false,
  isScreenSharing: false,
  duration:        0,

  setCall: (callId, type, user, status) =>
    set({ activeCallId: callId, callType: type, remoteUser: user, status, duration: 0 }),

  setStatus: (status) => set({ status }),

  clearCall: () =>
    set({ activeCallId: null, callType: null, remoteUser: null, status: 'idle', duration: 0 }),

  setMuted:         (isMuted)         => set({ isMuted }),
  setVideoOff:      (isVideoOff)      => set({ isVideoOff }),
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  incrementDuration: () => set((s) => ({ duration: s.duration + 1 })),
}));
