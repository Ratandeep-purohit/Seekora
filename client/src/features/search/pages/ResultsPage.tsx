import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Mic, Camera, X, Image as ImageIcon, Newspaper, PlayCircle, ChevronLeft, ChevronRight, Globe, ExternalLink, BookOpen, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchStore } from '../stores/searchStore';
import { useQuery } from '@tanstack/react-query';

const fetchResults = async (query: string, type: string = 'all', page: number = 1) => {
    if (!query) return { results: [], images: [], news: [], videos: [] };
    const limit = type === 'images' ? 40 : 10;
    const response = await fetch(`http://localhost:8000/api/search/?q=${encodeURIComponent(query)}&type=${type}&page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
};

// Tab icon mapping
const TAB_CONFIG = [
    { id: 'all', label: 'All', icon: Search },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'videos', label: 'Videos', icon: PlayCircle },
    { id: 'news', label: 'News', icon: Newspaper },
] as const;

export default function ResultsPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get('q') || '';
    const [localQuery, setLocalQuery] = useState(query);
    const { activeFilter, setFilter, addToHistory } = useSearchStore();
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync filter from URL
    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam && typeParam !== activeFilter) {
            setFilter(typeParam as any);
        }
    }, [searchParams, activeFilter, setFilter]);

    // Sync local query when URL changes
    useEffect(() => {
        setLocalQuery(query);
    }, [query]);

    const [currentPage, setCurrentPage] = useState(1);

    const { data: results, isLoading, isError } = useQuery({
        queryKey: ['search', query, activeFilter, currentPage],
        queryFn: () => fetchResults(query, activeFilter, currentPage),
        enabled: !!query,
        placeholderData: (previousData: any) => previousData,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!localQuery.trim()) return;
        addToHistory(localQuery.trim());
        navigate(`/search?q=${encodeURIComponent(localQuery)}&type=${activeFilter}`);
    };

    const handleFilterChange = (filterId: string) => {
        setFilter(filterId as any);
        setCurrentPage(1);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('type', filterId);
        navigate(`/search?${newParams.toString()}`);
    };

    // Pagination
    const ITEMS_PER_PAGE = activeFilter === 'images' ? 40 : 10;
    let currentData: any[] = [];
    let totalItems = 0;

    if (results) {
        if (activeFilter === 'images') {
            currentData = results.images || [];
            totalItems = results.count || 0;
        } else if (activeFilter === 'news') {
            currentData = results.news || [];
            totalItems = results.count || 0;
        } else if (activeFilter === 'videos') {
            currentData = results.videos || [];
            totalItems = results.count || 0;
        } else {
            currentData = results.results || [];
            totalItems = results.count || results.meta?.result_count || 0;
        }
    }

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [query, activeFilter]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen relative flex flex-col text-slate-200 overflow-hidden font-sans">
            {/* Background elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none fixed" />
            <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none fixed" />

            {/* ===== MODERN HEADER ===== */}
            <header className="sticky top-0 z-50 glass-panel border-b border-white/5 backdrop-blur-xl">
                <div className="flex items-center gap-6 px-6 lg:px-8 py-4">
                    {/* Logo */}
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 shrink-0 group"
                    >
                        <Sparkles className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                        <span className="font-display font-semibold text-xl tracking-wide text-white group-hover:text-indigo-100 transition-colors">Seekora</span>
                    </button>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-[720px]">
                        <div className="relative flex items-center h-12 glass-panel border border-white/10 rounded-2xl px-5 focus-within:border-indigo-500/50 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all bg-white/5">
                            <Search className="w-5 h-5 text-indigo-400/80 mr-3 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={localQuery}
                                onChange={(e) => setLocalQuery(e.target.value)}
                                className="flex-1 bg-transparent text-[16px] text-white outline-none font-light placeholder:text-slate-500"
                                placeholder="Search the web..."
                            />
                            {localQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLocalQuery('');
                                        inputRef.current?.focus();
                                    }}
                                    className="p-1 hover:bg-white/10 rounded-full mr-2"
                                >
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            )}
                            <div className="flex items-center gap-1 pl-3 border-l border-white/10">
                                <button type="button" className="p-2 hover:bg-white/10 rounded-xl" title="Voice search">
                                    <Mic className="w-4 h-4 text-slate-400 hover:text-indigo-400" />
                                </button>
                                <button type="button" className="p-2 hover:bg-white/10 rounded-xl" title="Image search">
                                    <Camera className="w-4 h-4 text-slate-400 hover:text-indigo-400" />
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Right side */}
                    <div className="hidden md:flex items-center gap-4 ml-auto shrink-0">
                        <button className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all font-semibold border border-white/10">
                            S
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 ml-[210px] lg:ml-[220px] overflow-x-auto no-scrollbar pb-0 px-2">
                    {TAB_CONFIG.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleFilterChange(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-[14px] font-medium transition-all relative
                                    ${isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full shadow-[0_-2px_8px_rgba(99,102,241,0.5)]"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 relative z-10 mx-auto w-full max-w-[1400px]">
                {/* Result Count */}
                {results?.meta && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="ml-[20px] md:ml-[170px] lg:ml-[220px] px-4 md:px-0 pt-6 pb-4"
                    >
                        <p className="text-[13px] text-slate-400 font-light flex items-center gap-2">
                            Found {totalItems?.toLocaleString()} intelligence nodes in
                            <span className="text-indigo-300 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{results.meta.query_time}s</span>
                            {results.meta.crawl_stats?.urls_crawled > 0 && (
                                <span className="text-emerald-400 flex items-center gap-1 ml-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Live crawled {results.meta.crawl_stats.urls_crawled} domains
                                </span>
                            )}
                        </p>
                    </motion.div>
                )}

                {isLoading ? (
                    <LoadingSkeleton />
                ) : isError ? (
                    <div className="max-w-[720px] ml-[20px] md:ml-[170px] lg:ml-[220px] mt-8">
                        <div className="glass-card p-8 text-center rounded-2xl border-red-500/20 bg-red-500/5">
                            <p className="text-red-400 font-medium text-lg mb-2">Neural Link Severed</p>
                            <p className="text-slate-400 text-sm">Failed to establish connection with the indexing core. Ensure the backend matrix is online.</p>
                        </div>
                    </div>
                ) : currentData.length === 0 && (!results?.images?.length && !results?.videos?.length && !results?.news?.length) ? (
                    <div className="max-w-[720px] ml-[20px] md:ml-[170px] lg:ml-[220px] mt-8 px-4 lg:px-0">
                        <div className="glass-card p-8 rounded-2xl">
                            <p className="text-white text-lg font-light mb-4">
                                No data nodes match query <span className="text-indigo-400 font-medium">"{query}"</span>
                            </p>
                            <p className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wider">Troubleshooting Protocol:</p>
                            <ul className="text-slate-300 text-sm space-y-2 list-none pl-0">
                                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500"></div>Verify spelling alignment</li>
                                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500"></div>Broaden search parameters</li>
                                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500"></div>Reduce query complexity</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ALL TAB */}
                        {activeFilter === 'all' && (
                            <AllTabContent
                                results={results}
                                currentData={currentData}
                                query={query}
                                currentPage={currentPage}
                                navigate={navigate}
                                setLocalQuery={setLocalQuery}
                            />
                        )}

                        {/* IMAGES TAB */}
                        {activeFilter === 'images' && (
                            <ImagesTabContent currentData={currentData} />
                        )}

                        {/* VIDEOS TAB */}
                        {activeFilter === 'videos' && (
                            <VideosTabContent currentData={currentData} />
                        )}

                        {/* NEWS TAB */}
                        {activeFilter === 'news' && (
                            <NewsTabContent currentData={currentData} />
                        )}

                        {/* PAGINATION */}
                        {totalPages > 1 && (
                            <GooglePagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        )}
                    </>
                )}
            </main>

            {/* Minimal Footer */}
            <footer className="mt-auto py-6 border-t border-white/5 relative z-10 bg-black/20 backdrop-blur-md">
                <div className="max-w-[1400px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-medium tracking-wide">
                    <div className="mb-4 sm:mb-0">
                        <span className="text-indigo-400 mr-2">●</span> Global Index Node
                    </div>
                    <div className="flex items-center gap-6">
                        <a href="#" className="hover:text-slate-300 transition-colors">Documentation</a>
                        <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

/* ==========================================
   ALL TAB CONTENT
   ========================================== */
function AllTabContent({ results, currentData, query, currentPage, navigate, setLocalQuery }: any) {
    return (
        <div className="flex flex-col xl:flex-row gap-8 ml-[20px] md:ml-[170px] lg:ml-[220px] pr-4 lg:pr-8 pb-12">
            {/* Left Column - Main Results */}
            <div className="w-full max-w-[720px]">

                {/* News Reel (Page 1 Only) */}
                {currentPage === 1 && results?.news?.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                <Newspaper className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h3 className="text-lg text-white font-medium">Real-time Intel</h3>
                        </div>
                        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
                            {results.news.slice(0, 3).map((news: any, i: number) => (
                                <a key={i} href={news.url} target="_blank" rel="noopener noreferrer" className="flex gap-4 p-5 hover:bg-white/5 transition-colors group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 text-xs text-slate-400 font-medium">
                                            <span className="px-2 py-0.5 rounded text-indigo-300 bg-indigo-500/10 border border-indigo-500/20">{news.source}</span>
                                            <span>• {news.time}</span>
                                        </div>
                                        <h4 className="text-base text-slate-200 font-medium leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors mb-2">
                                            {news.title}
                                        </h4>
                                    </div>
                                    {news.thumbnail && (
                                        <div className="w-28 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 group-hover:border-indigo-500/30 transition-colors">
                                            <img src={news.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>
                                    )}
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Main Search Results */}
                <div className="space-y-8">
                    {currentData.map((result: any, i: number) => (
                        <motion.article
                            key={result.id || result.url || i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="group glass-card p-5 rounded-2xl hover:bg-white/5 transition-colors border-transparent hover:border-white/10"
                        >
                            {/* Meta Track */}
                            <div className="flex items-center gap-3 mb-2.5">
                                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0 overflow-hidden">
                                    {result.favicon ? (
                                        <img src={result.favicon} alt="" className="w-4 h-4" />
                                    ) : (
                                        <Globe className="w-3.5 h-3.5 text-indigo-400" />
                                    )}
                                </div>
                                <div className="min-w-0 flex flex-col justify-center">
                                    <span className="text-sm text-slate-300 truncate font-medium block leading-tight">
                                        {result.displayUrl || new URL(result.url).hostname.replace('www.', '')}
                                    </span>
                                    <span className="text-[11px] text-slate-500 truncate block font-mono">
                                        {result.url}
                                    </span>
                                </div>
                            </div>

                            {/* Title Component */}
                            <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xl text-indigo-300 hover:text-indigo-200 font-medium leading-snug block mb-3 result-link-hover"
                            >
                                {result.title}
                            </a>

                            {/* Data Snippet */}
                            <p className="text-[15px] text-slate-400 leading-relaxed line-clamp-3 font-light">
                                {result.snippet}
                            </p>

                            {/* Sitelinks - Mockup for depth */}
                            {i === 0 && result.source === 'google' && (
                                <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4 pt-4 border-t border-white/5">
                                    {['Documentation Architecture', 'Implementation Details', 'API Reference'].map((link, j) => (
                                        <a key={j} href="#" className="flex items-center gap-1.5 text-[13px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                                            <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                            {link}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </motion.article>
                    ))}
                </div>
            </div>

            {/* Right Column - Deep Knowledge Panels */}
            <aside className="w-full xl:w-[400px] shrink-0 xl:pt-4">
                {results?.knowledge_panel && (
                    <KnowledgePanel data={results.knowledge_panel} query={query} />
                )}

                {/* Related Search Matrix */}
                <div className="mt-8 glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm text-white font-medium uppercase tracking-wider">Related Vectors</h4>
                    </div>
                    <div className="space-y-2">
                        {[
                            `Advanced ${query} concepts`,
                            `${query} system design`,
                            `history of ${query}`,
                            `${query} vs alternatives`,
                        ].map((item, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    navigate(`/search?q=${encodeURIComponent(item)}`);
                                    setLocalQuery(item);
                                }}
                                className="flex items-center gap-3 w-full text-left bg-white/5 hover:bg-white/10 px-4 py-3 rounded-xl transition-all border border-transparent hover:border-white/10 group"
                            >
                                <Search className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{item}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>
        </div>
    );
}

/* ==========================================
   IMAGES TAB (MASONRY GRID)
   ========================================== */
function ImagesTabContent({ currentData }: { currentData: any[] }) {
    const [selectedImage, setSelectedImage] = useState<any>(null);

    return (
        <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto z-10 relative">
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                {currentData.map((img: any, i: number) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="break-inside-avoid mb-4 group cursor-pointer relative"
                        onClick={() => setSelectedImage(img)}
                    >
                        <div className="rounded-2xl overflow-hidden glass-panel border-white/5 relative bg-white/5">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                            <img
                                src={img.thumbnail || img.url}
                                alt={img.alt_text}
                                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                loading="lazy"
                                onError={(e) => {
                                    (e.target as HTMLElement).parentElement!.parentElement!.style.display = 'none';
                                }}
                            />

                            {/* Hover info overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 translate-y-2 group-hover:translate-y-0">
                                <p className="text-sm text-white line-clamp-2 font-medium mb-1 drop-shadow-md">{img.alt_text || 'Visual Asset'}</p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                    <Globe className="w-3 h-3" />
                                    <span className="truncate">{img.parent_url ? new URL(img.parent_url).hostname.replace('www.', '') : 'External Source'}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Image Detail Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-6xl glass-card rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/10 flex flex-col md:flex-row max-h-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Image Canvas */}
                            <div className="flex-1 bg-black/50 p-6 flex items-center justify-center min-h-[40vh] md:min-h-[70vh]">
                                <img
                                    src={selectedImage.url}
                                    alt={selectedImage.alt_text}
                                    className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-lg"
                                />
                            </div>

                            {/* Metadata Panel */}
                            <div className="w-full md:w-[360px] bg-white/5 border-l border-white/10 p-6 flex flex-col">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg text-white font-medium mb-2">{selectedImage.alt_text || 'Image Details'}</h3>
                                        <a href={selectedImage.parent_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                            <Globe className="w-4 h-4" />
                                            {selectedImage.parent_url ? new URL(selectedImage.parent_url).hostname : 'Source Link'}
                                        </a>
                                    </div>
                                    <button
                                        onClick={() => setSelectedImage(null)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5"
                                    >
                                        <X className="w-5 h-5 text-slate-300" />
                                    </button>
                                </div>

                                <div className="mt-auto pt-6 border-t border-white/10">
                                    <a
                                        href={selectedImage.parent_url || selectedImage.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                                    >
                                        Visit Source Node <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ==========================================
   VIDEOS TAB
   ========================================== */
function VideosTabContent({ currentData }: { currentData: any[] }) {
    return (
        <div className="max-w-[800px] ml-[20px] md:ml-[170px] lg:ml-[220px] pt-6 pb-12 px-4 lg:px-0 relative z-10">
            {currentData.map((vid: any, i: number) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="mb-6 group glass-card p-4 rounded-2xl hover:bg-white/5 transition-all"
                >
                    <a href={vid.url} target="_blank" rel="noopener noreferrer" className="flex flex-col sm:flex-row gap-5">
                        {/* Futuristic Thumbnail */}
                        <div className="relative w-full sm:w-[280px] aspect-video rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                            <img src={vid.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-indigo-500/50 group-hover:border-indigo-400 group-hover:scale-110 transition-all duration-300 shadow-xl">
                                    <PlayCircle className="w-7 h-7 text-white fill-white/80 group-hover:fill-white" />
                                </div>
                            </div>
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-mono font-medium rounded-md border border-white/10">
                                {vid.provider.toUpperCase()}
                            </div>
                        </div>

                        {/* Data */}
                        <div className="flex-1 min-w-0 py-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20">Media Node</span>
                            </div>
                            <h3 className="text-lg text-white font-medium leading-snug line-clamp-2 mb-2 group-hover:text-indigo-300 transition-colors">
                                {vid.title}
                            </h3>
                            <p className="text-sm text-slate-400 line-clamp-2 font-light">
                                Video data source extracted from {vid.provider} networks matching search parameters.
                            </p>
                        </div>
                    </a>
                </motion.div>
            ))}
        </div>
    );
}

/* ==========================================
   NEWS TAB
   ========================================== */
function NewsTabContent({ currentData }: { currentData: any[] }) {
    return (
        <div className="max-w-[720px] ml-[20px] md:ml-[170px] lg:ml-[220px] pt-6 pb-12 px-4 lg:px-0 relative z-10">
            {currentData.map((news: any, i: number) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="mb-6"
                >
                    <a href={news.url} target="_blank" rel="noopener noreferrer" className="flex flex-col sm:flex-row gap-5 group glass-card p-5 rounded-2xl hover:bg-white/5 transition-all">
                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2.5">
                                <div className="flex items-center gap-2 text-xs font-medium">
                                    <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                        {news.source.toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-slate-500 text-xs font-mono border-l border-white/10 pl-3">
                                    {news.time}
                                </span>
                            </div>
                            <h3 className="text-xl text-indigo-300 font-medium leading-tight mb-2 group-hover:text-indigo-200 transition-colors result-link-hover">
                                {news.title}
                            </h3>
                            <p className="text-[15px] text-slate-400 line-clamp-2 font-light leading-relaxed">
                                {news.snippet}
                            </p>
                        </div>

                        {/* Thumbnail */}
                        {news.thumbnail && (
                            <div className="w-full sm:w-[160px] h-[120px] rounded-xl overflow-hidden bg-white/5 shrink-0 border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                                <img src={news.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                        )}
                    </a>
                </motion.div>
            ))}
        </div>
    );
}

/* ==========================================
   KNOWLEDGE PANEL
   ========================================== */
function KnowledgePanel({ data, query }: { data: any; query: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/5 border border-indigo-500/20"
        >
            {/* Image Header */}
            {data.image && (
                <div className="w-full h-[220px] bg-black/20 relative group">
                    <img src={data.image} alt={data.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14161e] via-transparent to-transparent" />
                </div>
            )}

            <div className="p-6 relative">
                {/* Float tag */}
                <span className="absolute top-[-14px] right-6 bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full shadow-lg">
                    Verified Schema
                </span>

                <h2 className="text-3xl font-display font-semibold text-white mb-2 tracking-tight">
                    {data.title || query}
                </h2>
                <div className="flex items-center gap-2 mb-4 text-xs font-medium text-indigo-300 bg-indigo-500/10 inline-flex px-2 py-1 rounded border border-indigo-500/20">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Entity Profile</span>
                </div>

                <p className="text-[15px] text-slate-300 leading-relaxed font-light mb-5">
                    {data.description}
                </p>

                {data.url && (
                    <a href={data.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-all shadow-md">
                        Explore Full Wikipedia Archive <ExternalLink className="w-4 h-4 ml-2 text-slate-400" />
                    </a>
                )}
            </div>

            <div className="border-t border-white/5 bg-white/[0.02] px-6 py-4">
                <p className="text-xs text-slate-500 text-center font-medium tracking-wide">
                    Knowledge Graph Node: Alpha-7
                </p>
            </div>
        </motion.div>
    );
}

/* ==========================================
   PAGINATION
   ========================================== */
function GooglePagination({ currentPage, totalPages, onPageChange }: any) {
    const maxVisible = Math.min(totalPages, 7);

    return (
        <div className="flex flex-col items-center py-10 mt-8 border-t border-white/5 relative z-10 w-full max-w-[720px] ml-[20px] md:ml-[170px] lg:ml-[220px]">
            <div className="flex items-center gap-2">
                {currentPage > 1 && (
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        className="glass-panel w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-indigo-400 transition-colors mr-2"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}

                {Array.from({ length: maxVisible }, (_, i) => i + 1).map((p) => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`w-10 h-10 flex items-center justify-center text-[14px] transition-all rounded-full font-medium
                            ${currentPage === p
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400'
                                : 'glass-panel text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        {p}
                    </button>
                ))}

                {currentPage < totalPages && (
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        className="glass-panel w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-indigo-400 transition-colors ml-2"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}

/* ==========================================
   LOADING SKELETON
   ========================================== */
function LoadingSkeleton() {
    return (
        <div className="max-w-[720px] ml-[20px] md:ml-[170px] lg:ml-[220px] pt-8 space-y-6 px-4 lg:px-0 relative z-10">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="glass-card p-5 rounded-2xl border border-white/5 skeleton-shimmer bg-white/[0.02]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-7 h-7 rounded-full bg-white/10" />
                        <div className="h-4 w-32 bg-white/10 rounded" />
                    </div>
                    <div className="h-6 w-[80%] bg-white/10 rounded mb-3" />
                    <div className="h-4 w-full bg-white/5 rounded mb-2" />
                    <div className="h-4 w-5/6 bg-white/5 rounded" />
                </div>
            ))}
        </div>
    );
}
