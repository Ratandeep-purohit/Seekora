import { create } from 'zustand';

interface SearchState {
  query: string;
  isTyping: boolean;
  activeFilter: 'all' | 'images' | 'news' | 'videos';
  suggestions: string[];
  searchHistory: string[];

  // Actions
  setQuery: (query: string) => void;
  setTyping: (isTyping: boolean) => void;
  setFilter: (filter: SearchState['activeFilter']) => void;
  setSuggestions: (suggestions: string[]) => void;
  addToHistory: (query: string) => void;
  clearHistory: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  isTyping: false,
  activeFilter: 'all',
  suggestions: [],
  searchHistory: JSON.parse(localStorage.getItem('seekora_history') || '[]'),

  setQuery: (query) => set({ query }),
  setTyping: (isTyping) => set({ isTyping }),
  setFilter: (activeFilter) => set({ activeFilter }),
  setSuggestions: (suggestions) => set({ suggestions }),
  addToHistory: (query) => {
    const current = get().searchHistory.filter(q => q !== query);
    const updated = [query, ...current].slice(0, 10);
    localStorage.setItem('seekora_history', JSON.stringify(updated));
    set({ searchHistory: updated });
  },
  clearHistory: () => {
    localStorage.removeItem('seekora_history');
    set({ searchHistory: [] });
  },
}));
