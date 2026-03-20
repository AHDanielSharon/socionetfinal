import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// ── Axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token storage (memory + localStorage)
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export const tokenStore = {
  getAccess:  () => _accessToken || (typeof window !== 'undefined' ? localStorage.getItem('sn_at') : null),
  getRefresh: () => _refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('sn_rt') : null),
  setTokens: (at: string, rt: string) => {
    _accessToken = at; _refreshToken = rt;
    if (typeof window !== 'undefined') { localStorage.setItem('sn_at', at); localStorage.setItem('sn_rt', rt); }
  },
  clear: () => {
    _accessToken = null; _refreshToken = null;
    if (typeof window !== 'undefined') { localStorage.removeItem('sn_at'); localStorage.removeItem('sn_rt'); }
  },
};

// ── Request interceptor — attach token
axiosInstance.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — auto-refresh on 401
let refreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

axiosInstance.interceptors.response.use(
  r => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) throw err;
    original._retry = true;

    const rt = tokenStore.getRefresh();
    if (!rt) { tokenStore.clear(); throw err; }

    if (refreshing) {
      return new Promise(resolve => {
        refreshQueue.push((newToken: string) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(axiosInstance(original));
        });
      });
    }

    refreshing = true;
    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, {}, {
        headers: { 'X-Refresh-Token': rt },
      });
      const { access_token, refresh_token } = res.data.tokens;
      tokenStore.setTokens(access_token, refresh_token);
      refreshQueue.forEach(cb => cb(access_token));
      refreshQueue = [];
      original.headers.Authorization = `Bearer ${access_token}`;
      return axiosInstance(original);
    } catch {
      tokenStore.clear();
      if (typeof window !== 'undefined') window.location.href = '/auth/login';
      throw err;
    } finally {
      refreshing = false;
    }
  }
);

// ── Helper for multipart
const multipart = (config?: AxiosRequestConfig) => ({
  ...config,
  headers: { ...config?.headers, 'Content-Type': 'multipart/form-data' },
});

// ── API namespace
export const api = {
  // Auth
  auth: {
    login:    (data: any) => axiosInstance.post('/auth/login', data),
    register: (data: any) => axiosInstance.post('/auth/register', data),
    logout:   () => axiosInstance.post('/auth/logout'),
    refresh:  () => axiosInstance.post('/auth/refresh'),
    me:       () => axiosInstance.get('/auth/me'),
    sendOtp:     (data: any) => axiosInstance.post('/auth/send-otp', data),
    verifyOtp:   (data: any) => axiosInstance.post('/auth/verify-otp', data),
    forgotPassword: (data: any) => axiosInstance.post('/auth/forgot-password', data),
    resetPassword:  (data: any) => axiosInstance.post('/auth/reset-password', data),
  },

  // Users
  users: {
    getProfile:    (username: string) => axiosInstance.get(`/users/${username}`),
    getPosts:      (username: string, params?: any) => axiosInstance.get(`/users/${username}/posts`, { params }),
    getFollowers:  (username: string, params?: any) => axiosInstance.get(`/users/${username}/followers`, { params }),
    getFollowing:  (username: string, params?: any) => axiosInstance.get(`/users/${username}/following`, { params }),
    getSuggestions: () => axiosInstance.get('/users/me/suggestions'),
    updateProfile:  (data: FormData) => axiosInstance.patch('/users/me/profile', data, multipart()),
    updateUsername: (data: any) => axiosInstance.patch('/users/me/username', data),
    deleteAccount:  () => axiosInstance.delete('/users/me/account'),
  },

  // Posts
  posts: {
    get:      (id: string) => axiosInstance.get(`/posts/${id}`),
    create:   (data: FormData) => axiosInstance.post('/posts', data, multipart()),
    update:   (id: string, data: any) => axiosInstance.patch(`/posts/${id}`, data),
    delete:   (id: string) => axiosInstance.delete(`/posts/${id}`),
    like:     (id: string, reaction = 'like') => axiosInstance.post(`/posts/${id}/like`, { reaction }),
    save:     (id: string) => axiosInstance.post(`/posts/${id}/save`),
    share:    (id: string, data?: any) => axiosInstance.post(`/posts/${id}/share`, data),
    getSaved: () => axiosInstance.get('/posts/saved'),
    getComments: (id: string, params?: any) => axiosInstance.get(`/posts/${id}/comments`, { params }),
    addComment:  (id: string, data: any) => axiosInstance.post(`/posts/${id}/comments`, data),
    deleteComment: (postId: string, commentId: string) => axiosInstance.delete(`/posts/${postId}/comments/${commentId}`),
    likeComment:   (postId: string, commentId: string) => axiosInstance.post(`/posts/${postId}/comments/${commentId}/like`),
    getLikes:      (id: string) => axiosInstance.get(`/posts/${id}/likes`),
    pin:           (id: string) => axiosInstance.post(`/posts/${id}/pin`),
  },

  // Feed
  feed: {
    getHome:   (params?: any) => axiosInstance.get('/feed', { params }),
    getReels:  (params?: any) => axiosInstance.get('/feed/reels', { params }),
    getStories: () => axiosInstance.get('/feed/stories'),
    getVideos: (params?: any) => axiosInstance.get('/feed/videos', { params }),
  },

  // Stories
  stories: {
    view:   (id: string) => axiosInstance.post(`/stories/${id}/view`),
    react:  (id: string, emoji: string) => axiosInstance.post(`/stories/${id}/react`, { emoji }),
    delete: (id: string) => axiosInstance.delete(`/stories/${id}`),
  },

  // Search
  search: {
    query:    (q: string, type?: string, limit?: number) => axiosInstance.get('/search', { params: { q, type, limit } }),
    trending: () => axiosInstance.get('/search/trending'),
    hashtag:  (name: string) => axiosInstance.get(`/search/hashtag/${name}`),
    history:  () => axiosInstance.get('/search/history'),
    clearHistory: () => axiosInstance.delete('/search/history'),
  },

  // Conversations / Messages
  conversations: {
    list:    () => axiosInstance.get('/conversations'),
    create:  (data: any) => axiosInstance.post('/conversations', data),
    get:     (id: string) => axiosInstance.get(`/conversations/${id}`),
    update:  (id: string, data: any) => axiosInstance.patch(`/conversations/${id}`, data),
    leave:   (id: string) => axiosInstance.delete(`/conversations/${id}/leave`),
    getMessages: (id: string, params?: any) => axiosInstance.get(`/conversations/${id}/messages`, { params }),
    sendMessage: (id: string, data: any) => axiosInstance.post(`/conversations/${id}/messages`, data),
    deleteMessage: (convId: string, msgId: string, forEveryone = false) =>
      axiosInstance.delete(`/conversations/${convId}/messages/${msgId}`, { params: { for_everyone: forEveryone } }),
    reactToMessage: (convId: string, msgId: string, emoji: string) =>
      axiosInstance.post(`/conversations/${convId}/messages/${msgId}/react`, { emoji }),
    markRead: (id: string) => axiosInstance.post(`/conversations/${id}/mark-read`),
    getMembers: (id: string) => axiosInstance.get(`/conversations/${id}/members`),
  },

  // Notifications
  notifications: {
    list:           (params?: any) => axiosInstance.get('/notifications', { params }),
    getUnreadCount: () => axiosInstance.get('/notifications/unread-count'),
    markRead:       (ids?: string[]) => axiosInstance.post('/notifications/mark-read', { notification_ids: ids }),
    updatePrefs:    (data: any) => axiosInstance.put('/notifications/preferences', data),
    registerPushToken: (data: any) => axiosInstance.post('/notifications/push-token', data),
    delete: (id: string) => axiosInstance.delete(`/notifications/${id}`),
  },

  // Relationships
  relationships: {
    follow:   (userId: string) => axiosInstance.post(`/relationships/follow/${userId}`),
    unfollow: (userId: string) => axiosInstance.delete(`/relationships/follow/${userId}`),
    block:    (userId: string) => axiosInstance.post(`/relationships/block/${userId}`),
    unblock:  (userId: string) => axiosInstance.delete(`/relationships/block/${userId}`),
    mute:     (userId: string) => axiosInstance.post(`/relationships/mute/${userId}`),
    unmute:   (userId: string) => axiosInstance.delete(`/relationships/mute/${userId}`),
    acceptFollowRequest:  (userId: string) => axiosInstance.post(`/relationships/follow-requests/${userId}/accept`),
    declineFollowRequest: (userId: string) => axiosInstance.delete(`/relationships/follow-requests/${userId}/decline`),
    getFollowRequests: () => axiosInstance.get('/relationships/follow-requests'),
    getBlocked: () => axiosInstance.get('/relationships/blocked'),
  },

  // Communities
  communities: {
    list:  (params?: any) => axiosInstance.get('/communities', { params }),
    mine:  () => axiosInstance.get('/communities?mine=true'),
    get:   (slug: string) => axiosInstance.get(`/communities/${slug}`),
    create: (data: any) => axiosInstance.post('/communities', data),
    update: (id: string, data: any) => axiosInstance.patch(`/communities/${id}`, data),
    join:   (id: string) => axiosInstance.post(`/communities/${id}/join`),
    leave:  (id: string) => axiosInstance.delete(`/communities/${id}/leave`),
    getPosts: (id: string, params?: any) => axiosInstance.get(`/communities/${id}/posts`, { params }),
    getMembers: (id: string) => axiosInstance.get(`/communities/${id}/members`),
  },

  // Explore
  explore: {
    get: (params?: any) => axiosInstance.get('/explore', { params }),
  },

  // Live
  live: {
    list:  (params?: any) => axiosInstance.get('/live', { params }),
    get:   (id: string) => axiosInstance.get(`/live/${id}`),
    start: (title: string, data?: any) => axiosInstance.post('/live', { title, ...data }),
    end:   (id: string) => axiosInstance.delete(`/live/${id}`),
  },

  // Calls
  calls: {
    create: (data: any) => axiosInstance.post('/calls', data),
    end:    (id: string) => axiosInstance.patch(`/calls/${id}`, { status: 'ended' }),
  },

  // Wallet
  wallet: {
    get:          () => axiosInstance.get('/wallet'),
    tip:          (recipientId: string, amount: number, message?: string) =>
      axiosInstance.post('/wallet/tip', { recipient_id: recipientId, amount_tokens: amount, message }),
    getTransactions: (params?: any) => axiosInstance.get('/wallet/transactions', { params }),
    getNFTs:         () => axiosInstance.get('/wallet/nfts'),
  },

  // AI
  ai: {
    status:           () => axiosInstance.get('/ai/status'),
    getConversations: () => axiosInstance.get('/ai/conversations'),
    createConversation: () => axiosInstance.post('/ai/conversations'),
    deleteConversation: (id: string) => axiosInstance.delete(`/ai/conversations/${id}`),
    getMessages:        (id: string) => axiosInstance.get(`/ai/conversations/${id}/messages`),
    sendMessage:        (id: string, content: string) => axiosInstance.post(`/ai/conversations/${id}/messages`, { content }),
    quickTask:          (task: string, context: string) => axiosInstance.post('/ai/quick', { task, context }),
  },

  // Creator
  creator: {
    getStats:   () => axiosInstance.get('/creator/stats'),
    getContent: (params?: any) => axiosInstance.get('/creator/content', { params }),
  },

  // Settings
  settings: {
    get:    () => axiosInstance.get('/settings'),
    update: (data: any) => axiosInstance.patch('/settings', data),
  },

  // Media
  media: {
    upload: (data: FormData) => axiosInstance.post('/media/upload', data, multipart()),
    delete: (id: string) => axiosInstance.delete(`/media/${id}`),
  },

  // Location
  location: {
    update:    (data: any) => axiosInstance.post('/location', data),
    getNearby: (params: any) => axiosInstance.get('/location/nearby', { params }),
  },

  // Reports
  reports: {
    create: (data: any) => axiosInstance.post('/reports', data),
  },
};

export default axiosInstance;
