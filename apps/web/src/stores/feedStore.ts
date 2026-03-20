import { create } from 'zustand';

interface FeedStore {
  posts: any[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  setPosts: (posts: any[]) => void;
  appendPosts: (posts: any[]) => void;
  updatePost: (id: string, updates: any) => void;
  removePost: (id: string) => void;
  setNextCursor: (cursor: string | null) => void;
  setLoading: (v: boolean) => void;
  setLoadingMore: (v: boolean) => void;
  setHasMore: (v: boolean) => void;
}

export const useFeedStore = create<FeedStore>((set) => ({
  posts: [],
  nextCursor: null,
  hasMore: true,
  loading: true,
  loadingMore: false,
  setPosts:      (posts)      => set({ posts }),
  appendPosts:   (posts)      => set((s) => ({ posts: [...s.posts, ...posts] })),
  updatePost:    (id, updates) => set((s) => ({ posts: s.posts.map(p => p.id === id ? { ...p, ...updates } : p) })),
  removePost:    (id)         => set((s) => ({ posts: s.posts.filter(p => p.id !== id) })),
  setNextCursor: (nextCursor) => set({ nextCursor }),
  setLoading:    (loading)    => set({ loading }),
  setLoadingMore:(loadingMore) => set({ loadingMore }),
  setHasMore:    (hasMore)    => set({ hasMore }),
}));
