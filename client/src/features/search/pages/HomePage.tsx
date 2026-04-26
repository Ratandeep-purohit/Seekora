import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, Camera, X, Clock, TrendingUp, Sparkles, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '../stores/searchStore';
import ThemeSwitcher from '../components/ThemeSwitcher';

// Live Clock hook
function useLiveClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}

const TRENDING = [
    "Artificial General Intelligence",
    "Quantum Computing Startups",
    "Web3 Security Protocols",
    "Next.js vs Vite 2025",
    "Fusion Power Breakthroughs",
    "Neuralink Human Trials",
];

export default function HomePage() {
    const navigate = useNavigate();
    const now = useLiveClock();
    const { setQuery, suggestions, setSuggestions, searchHistory, addToHistory } = useSearchStore();
    const [localQuery, setLocalQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Autocomplete from backend
    useEffect(() => {
        if (!localQuery.trim() || localQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/autocomplete/?q=${encodeURIComponent(localQuery)}`);
                if (response.ok) {
                    const data = await response.json();
                    setSuggestions(data);
                }
            } catch (e) {
                console.error('Autocomplete failed', e);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [localQuery, setSuggestions]);

    const handleSearch = (searchQuery?: string) => {
        const finalQuery = (searchQuery || localQuery).trim();
        if (!finalQuery) return;
        setQuery(finalQuery);
        addToHistory(finalQuery);
        setShowSuggestions(false);
        navigate(`/search?q=${encodeURIComponent(finalQuery)}`);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIndex >= 0) {
            const allSuggestions = getSuggestionList();
            if (allSuggestions[selectedIndex]) {
                handleSearch(allSuggestions[selectedIndex]);
                return;
            }
        }
        handleSearch();
    };

    const getSuggestionList = (): string[] => {
        if (localQuery.trim()) {
            return suggestions.length > 0 ? suggestions.slice(0, 10) : [];
        }
        // Show history + trending when focused but empty
        const historyItems = searchHistory.slice(0, 4);
        return historyItems;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const list = getSuggestionList();
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, list.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }
    };

    // Close suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const suggestionList = getSuggestionList();

    return (
        <div className="min-h-screen relative flex flex-col text-[var(--color-text-primary)] overflow-hidden font-sans">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary-600/20 blur-[100px] rounded-full pointer-events-none" />

            {/* Top Navigation */}
            <header className="flex items-center justify-between px-6 py-4 z-10 relative">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary-400" />
                        <span className="font-display font-semibold text-lg tracking-wide text-[var(--color-text-primary)]">Seekora</span>
                    </div>
                    {/* Compact clock beside logo */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full glass-panel border border-white/8 text-xs">
                        <Clock className="w-3 h-3 text-primary-400" />
                        <span className="text-[var(--color-text-primary)] font-medium tabular-nums">
                            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                        <span className="text-[var(--color-text-tertiary)]">·</span>
                        <span className="text-[var(--color-text-secondary)]">
                            {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-6 text-sm font-medium">
                    <ThemeSwitcher />
                    <a href="#" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Workspace</a>
                    <a href="#" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Images</a>
                    <button className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-primary-600 flex items-center justify-center text-[var(--color-text-primary)] shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all border border-primary-400/30 font-semibold">
                        S
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-4xl mx-auto z-10 relative -mt-16">

                {/* Modern Identity / Logo area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-10 text-center"
                >
                    <div className="inline-block px-4 py-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-300 text-xs font-medium tracking-wider mb-6 backdrop-blur-md">
                        NEXT-GEN SEARCH ENGINE
                    </div>
                    <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight text-[var(--color-text-primary)] mb-4">
                        <span className="text-gradient">Seek</span>ora
                    </h1>
                    <p className="text-[var(--color-text-secondary)] text-lg md:text-xl font-light max-w-lg mx-auto">
                        Intelligent answers, deep insights, and instant discovery across the entire web.
                    </p>
                </motion.div>

                {/* Omni-search Box */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full relative"
                    ref={suggestionsRef}
                >
                    <form onSubmit={handleSubmit} className="relative z-20">
                        <div className={`
                            glass-panel rounded-2xl flex items-center h-16 px-6 relative transition-all duration-300 input-glow
                            ${showSuggestions && suggestionList.length > 0 ? 'rounded-b-none border-b-transparent' : ''}
                        `}>
                            <Search className="w-6 h-6 text-primary-400/80 mr-4" />

                            <input
                                ref={inputRef}
                                type="text"
                                value={localQuery}
                                onChange={(e) => {
                                    setLocalQuery(e.target.value);
                                    setSelectedIndex(-1);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                className="flex-1 bg-transparent text-xl text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] font-light"
                                placeholder="What are you looking for..."
                                autoComplete="off"
                                autoFocus
                            />

                            {localQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLocalQuery('');
                                        inputRef.current?.focus();
                                    }}
                                    className="p-1 hover:bg-[var(--color-surface-hover)] rounded-full mr-2 transition-colors"
                                >
                                    <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                                </button>
                            )}

                            <div className="h-6 w-px bg-[var(--color-surface-hover)] mx-2"></div>

                            <div className="flex items-center gap-1">
                                <button type="button" className="p-2.5 hover:bg-[var(--color-surface-hover)] rounded-xl transition-colors text-[var(--color-text-secondary)] hover:text-primary-400 focus:outline-none">
                                    <Mic className="w-5 h-5" />
                                </button>
                                <button type="button" className="p-2.5 hover:bg-[var(--color-surface-hover)] rounded-xl transition-colors text-[var(--color-text-secondary)] hover:text-primary-400 focus:outline-none">
                                    <Camera className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Dropdown Suggestions */}
                        <AnimatePresence>
                            {showSuggestions && suggestionList.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute left-0 right-0 top-full glass-panel border-t-0 rounded-b-2xl shadow-2xl shadow-black/50 overflow-hidden"
                                >
                                    <div className="h-px w-[calc(100%-3rem)] mx-auto bg-[var(--color-surface-hover)]" />
                                    <ul className="py-3">
                                        {suggestionList.map((item, i) => (
                                            <li key={i}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSearch(item)}
                                                    onMouseEnter={() => setSelectedIndex(i)}
                                                    className={`w-full text-left px-6 py-3 flex items-center gap-4 text-[16px] transition-colors focus:outline-none
                                                        ${selectedIndex === i ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]' : 'hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]'}`}
                                                >
                                                    {localQuery ? (
                                                        <Search className={`w-4 h-4 ${selectedIndex === i ? 'text-primary-400' : 'text-[var(--color-text-tertiary)]'}`} />
                                                    ) : (
                                                        <Clock className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                                                    )}
                                                    <span className="font-light tracking-wide flex-1">{item}</span>
                                                    {!localQuery && selectedIndex === i && (
                                                        <span className="text-xs text-primary-400 font-medium tracking-wider">SELECT</span>
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                        <button
                            onClick={() => handleSearch()}
                            className="px-8 py-3 bg-primary-600/20 border border-primary-500/30 rounded-xl text-primary-100 font-medium hover:bg-primary-600/40 hover:border-primary-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center gap-2"
                        >
                            <Search className="w-4 h-4" />
                            Explore Web
                        </button>
                        <button
                            onClick={() => {
                                if (localQuery.trim()) handleSearch();
                            }}
                            className="px-8 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] font-medium hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-hover)] transition-all flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4 text-primary-400" />
                            Deep Search
                        </button>
                    </div>
                </motion.div>

                {/* Trending Topics */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="mt-16 w-full max-w-4xl"
                >
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <TrendingUp className="w-4 h-4 text-primary-400" />
                        <span className="text-sm text-[var(--color-text-secondary)] font-medium uppercase tracking-widest">Trending Now</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        {TRENDING.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => handleSearch(item)}
                                className="px-4 py-2 glass-panel hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-full text-sm text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text-primary)] hover:border-primary-500/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] flex items-center gap-2"
                            >
                                {item}
                                <ExternalLink className="w-3 h-3 opacity-50" />
                            </button>
                        ))}
                    </div>
                </motion.div>
            </main>

            {/* Minimal Background Footer */}
            <footer className="mt-auto py-6 border-t border-[var(--color-border)] relative z-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--color-text-tertiary)] font-medium tracking-wide">
                    <div className="mb-4 sm:mb-0">
                        <span className="text-primary-400 mr-2">●</span> Seekora Systems 2026
                    </div>
                    <div className="flex items-center gap-8">
                        <a href="#" className="hover:text-[var(--color-text-secondary)] transition-colors">Privacy</a>
                        <a href="#" className="hover:text-[var(--color-text-secondary)] transition-colors">Terms</a>
                        <a href="#" className="hover:text-[var(--color-text-secondary)] transition-colors">Developers</a>
                        <a href="#" className="hover:text-[var(--color-text-secondary)] transition-colors">Settings</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

