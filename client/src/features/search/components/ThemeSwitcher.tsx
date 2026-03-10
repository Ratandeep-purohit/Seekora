import { Settings, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useThemeStore, THEMES } from '../stores/themeStore';

// Theme swatch colors for the preview dot
const THEME_COLORS: Record<string, string> = {
    indigo: '#6366f1',
    rose: '#f43f5e',
    emerald: '#10b981',
    violet: '#8b5cf6',
    amber: '#f59e0b',
    blue: '#3b82f6',
    cyan: '#06b6d4',
    teal: '#14b8a6',
    fuchsia: '#c026d3',
    pink: '#ec4899',
    red: '#ef4444',
    orange: '#f97316',
    green: '#22c55e',
    sky: '#0ea5e9',
};

export default function ThemeSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const { theme, setTheme } = useThemeStore();
    const buttonRef = useRef<HTMLButtonElement>(null);

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY + 8,
                right: window.innerWidth - rect.right,
            });
        }
    };

    const toggle = () => {
        updatePosition();
        setIsOpen((v) => !v);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('[data-theme-dropdown]') && !target.closest('[data-theme-btn]')) {
                setIsOpen(false);
            }
        };
        const handleScroll = () => setIsOpen(false);
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    return (
        <>
            <button
                ref={buttonRef}
                data-theme-btn
                onClick={toggle}
                className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center group"
                title="Settings & Themes"
            >
                <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-200 transition-colors" />
            </button>

            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        data-theme-dropdown
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            top: dropdownPos.top,
                            right: dropdownPos.right,
                            zIndex: 99999,
                            width: 272,
                        }}
                        className="glass-panel rounded-2xl shadow-2xl border border-white/10"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/5">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Settings className="w-4 h-4 opacity-70" />
                                Choose Theme
                            </h3>
                        </div>

                        {/* Theme Grid */}
                        <div className="p-3 grid grid-cols-2 gap-1.5" style={{ maxHeight: 340, overflowY: 'auto' }}>
                            {THEMES.map((t) => {
                                const isActive = theme === t;
                                const swatchColor = THEME_COLORS[t] || '#6366f1';
                                return (
                                    <button
                                        key={t}
                                        onClick={() => {
                                            setTheme(t);
                                            setIsOpen(false);
                                        }}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left
                                            ${isActive
                                                ? 'bg-white/15 text-white border border-white/20'
                                                : 'text-slate-300 hover:bg-white/8 border border-transparent hover:border-white/10 hover:text-white'
                                            }`}
                                    >
                                        {/* Static color swatch - no dynamic CSS vars needed */}
                                        <div
                                            className="w-4 h-4 rounded-full shrink-0 shadow-md ring-1 ring-white/20"
                                            style={{ backgroundColor: swatchColor }}
                                        />
                                        <span className="capitalize">{t}</span>
                                        {isActive && (
                                            <Check
                                                className="w-3.5 h-3.5 ml-auto shrink-0 text-white/80"
                                                strokeWidth={2.5}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
