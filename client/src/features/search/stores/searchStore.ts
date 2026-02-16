import { create } from 'zustand';

interface SearchState {
  query: string;
  isTyping: boolean;
  activeFilter: 'all' | 'images' | 'news' | 'videos' | 'academic';
  suggestions: string[];

  // Actions
  setQuery: (query: string) => void;
  setTyping: (isTyping: boolean) => void;
  setFilter: (filter: SearchState['activeFilter']) => void;
  setSuggestions: (suggestions: string[]) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  isTyping: false,
  activeFilter: 'all',
  suggestions: [],

  setQuery: (query) => set({ query }),
  setTyping: (isTyping) => set({ isTyping }),
  setFilter: (activeFilter) => set({ activeFilter }),
  setSuggestions: (suggestions) => set({ suggestions }),
}));
