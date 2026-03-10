import { create } from 'zustand';

export const THEMES = [
    'indigo', 'rose', 'emerald', 'violet', 'amber', 'blue',
    'cyan', 'teal', 'fuchsia', 'pink', 'red', 'orange',
    'green', 'sky'
];

interface ThemeState {
    theme: string;
    setTheme: (theme: string) => void;
    initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    theme: localStorage.getItem('seekora_theme') || 'indigo',

    setTheme: (theme) => {
        localStorage.setItem('seekora_theme', theme);
        document.documentElement.className = `theme-${theme}`;
        set({ theme });
    },

    initializeTheme: () => {
        const theme = localStorage.getItem('seekora_theme') || 'indigo';
        // Remove all existing theme classes first
        THEMES.forEach(t => document.documentElement.classList.remove(`theme-${t}`));
        // Add the active theme
        document.documentElement.classList.add(`theme-${theme}`);
        set({ theme });
    }
}));
