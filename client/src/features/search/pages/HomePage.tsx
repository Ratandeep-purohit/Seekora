import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, Camera, Command, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '../stores/searchStore';
import { VoiceOverlay } from '../../intelligence/components/VoiceOverlay';

const SUGGESTIONS = [
    "Quantum Computing breakthroughs 2025",
    "Best ramen in Tokyo",
    "Stock market live analysis",
    "React 19 new features"
];

export default function HomePage() {
    const navigate = useNavigate();
    const { query, setQuery, isTyping, setTyping, suggestions, setSuggestions } = useSearchStore();
    const [localQuery, setLocalQuery] = useState(query);
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);

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
        }, 300);

        return () => clearTimeout(timer);
    }, [localQuery, setSuggestions]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const finalQuery = localQuery.trim();
        if (!finalQuery) return;
        setQuery(finalQuery);
        navigate(`/search?q=${encodeURIComponent(finalQuery)}`);
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Gradient Mesh */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10 w-full max-w-2xl px-4 flex flex-col items-center gap-8"
            >
                {/* Logo */}
                <div className="text-center group cursor-default">
                    <h1 className="text-7xl font-bold tracking-tighter bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-lg">
                        Seekora
                    </h1>
                    <div className="flex items-center gap-2 justify-center mt-2 text-slate-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Sparkles className="w-3 h-3 text-yellow-400" />
                        <span>Intelligence First</span>
                    </div>
                </div>

                {/* Omnibox Container */}
                <div className="w-full relative group">
                    <form onSubmit={handleSearch} className="relative z-20">
                        <div className={`
              absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl transition-opacity duration-500
              ${isTyping ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
            `} />

                        <div className={`
              w-full h-16 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl flex items-center px-6 shadow-2xl transition-all duration-300
              ${isTyping ? 'ring-2 ring-blue-500/50 scale-[1.02]' : 'hover:border-slate-600'}
            `}>
                            <Search className={`w-6 h-6 mr-4 transition-colors ${isTyping ? 'text-blue-400' : 'text-slate-500'}`} />

                            <input
                                type="text"
                                value={localQuery}
                                onChange={(e) => {
                                    setLocalQuery(e.target.value);
                                    setTyping(true);
                                }}
                                onBlur={() => setTyping(false)}
                                placeholder="Ask anything..."
                                className="flex-1 bg-transparent text-lg text-white placeholder-slate-500 outline-none font-medium"
                                autoFocus
                            />

                            <div className="flex items-center gap-3 pl-4 border-l border-slate-700/50">
                                <button
                                    type="button"
                                    onClick={() => setIsVoiceOpen(true)}
                                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white group/mic"
                                >
                                    <Mic className="w-5 h-5 group-hover/mic:scale-110 transition-transform" />
                                </button>
                                <button type="button" className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white group/cam">
                                    <Camera className="w-5 h-5 group-hover/cam:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Suggestions (Dynamic or Trending) */}
                    <AnimatePresence>
                        {isTyping && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-4 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 p-2"
                            >
                                {!localQuery ? (
                                    <>
                                        <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3 text-indigo-400" /> Trending Topics
                                        </div>
                                        {SUGGESTIONS.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setLocalQuery(s);
                                                    setTimeout(() => {
                                                        navigate(`/search?q=${encodeURIComponent(s)}`);
                                                    }, 50);
                                                }}
                                                className="w-full text-left px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-white transition-all rounded-xl flex items-center justify-between group/item"
                                            >
                                                <span className="font-medium">{s}</span>
                                                <Command className="w-3 h-3 opacity-0 group-hover/item:opacity-50 transition-opacity" />
                                            </button>
                                        ))}
                                    </>
                                ) : suggestions.length > 0 ? (
                                    <>
                                        <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Sparkles className="w-3 h-3 text-indigo-400" /> Neural Predictions
                                        </div>
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setLocalQuery(s);
                                                    setTimeout(() => {
                                                        navigate(`/search?q=${encodeURIComponent(s)}`);
                                                    }, 50);
                                                }}
                                                className="w-full text-left px-4 py-3 text-slate-300 hover:bg-indigo-500/10 hover:text-white transition-all rounded-xl flex items-center gap-4 group/item"
                                            >
                                                <Clock className="w-4 h-4 text-slate-500 group-hover/item:text-indigo-400" />
                                                <span className="font-semibold">{s}</span>
                                            </button>
                                        ))}
                                    </>
                                ) : null}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer / Status */}
                <div className="flex gap-6 mt-8">
                    <button className="px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors text-sm text-slate-400 font-medium backdrop-blur-sm">
                        Deep Search
                    </button>
                    <button className="px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors text-sm text-slate-400 font-medium backdrop-blur-sm">
                        I'm Feeling Lucky
                    </button>
                </div>
            </motion.div>

            {/* Footer Copyright */}
            <footer className="absolute bottom-6 text-center w-full text-slate-600 text-xs font-medium tracking-wide">
                SEEKORA INTELLIGENCE &nbsp; • &nbsp; V2.0 ENTERPRISE
            </footer>

            <VoiceOverlay isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
        </div>
    );
}
