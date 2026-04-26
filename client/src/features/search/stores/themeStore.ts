import { create } from 'zustand';

export const THEMES = [
    'indigo', 'rose', 'emerald', 'violet', 'amber', 'blue',
    'cyan', 'teal', 'fuchsia', 'pink', 'red', 'orange',
    'green', 'sky'
];

interface ThemeState {
    theme: string;
    mode: 'dark' | 'light';
    setTheme: (theme: string) => void;
    setMode: (mode: 'dark' | 'light') => void;
    initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    theme: localStorage.getItem('seekora_theme') || 'indigo',
    mode: (localStorage.getItem('seekora_mode') as 'dark' | 'light') || 'dark',

    setTheme: (theme) => {
        localStorage.setItem('seekora_theme', theme);
        document.documentElement.className = `theme-${theme} ${useThemeStore.getState().mode}`;
        set({ theme });
    },

    setMode: (mode) => {
        localStorage.setItem('seekora_mode', mode);
        document.documentElement.className = `theme-${useThemeStore.getState().theme} ${mode}`;
        set({ mode });
    },

    initializeTheme: () => {
        const theme = localStorage.getItem('seekora_theme') || 'indigo';
        const mode = (localStorage.getItem('seekora_mode') as 'dark' | 'light') || 'dark';
        
        document.documentElement.className = `theme-${theme} ${mode}`;
        set({ theme, mode });
    }
}));
