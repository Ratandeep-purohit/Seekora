import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Mic, Camera, Filter, Grid, List as ListIcon, TrendingUp, ArrowUpRight, Newspaper, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchStore } from '../stores/searchStore';
import ResultList from '../components/ResultList';
import { Card } from '@/core/primitives';
import { ResultListSkeleton } from '../components/ResultSkeleton';
import { VoiceOverlay } from '../../intelligence/components/VoiceOverlay';
import { useQuery } from '@tanstack/react-query';

const fetchResults = async (query: string, type: string = 'all') => {
    if (!query) return { results: [], featured_media: { images: [], videos: [] } };
    const response = await fetch(`http://localhost:8000/api/search/?q=${encodeURIComponent(query)}&type=${type}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
};

export default function ResultsPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get('q') || '';
    const [localQuery, setLocalQuery] = useState(query);
    const { activeFilter, setFilter } = useSearchStore(); // activeFilter state sync

    // Ensure activeFilter matches URL param if present, or update store
    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam && typeParam !== activeFilter) {
            setFilter(typeParam as any);
        }
    }, [searchParams, activeFilter, setFilter]);

    const [isVoiceOpen, setIsVoiceOpen] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    const { data: results, isLoading, isError } = useQuery({
        queryKey: ['search', query, activeFilter], // activeFilter in key ensures refetch
        queryFn: () => fetchResults(query, activeFilter),
        enabled: !!query,
    });

    // Handle Search Submit
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!localQuery.trim()) return;
        navigate(`/search?q=${encodeURIComponent(localQuery)}&type=${activeFilter}`);
    };

    // Filter Config
    const FILTERS = [
        { id: 'all', label: 'All' },
        { id: 'images', label: 'Images' },
        { id: 'news', label: 'News' },
        { id: 'videos', label: 'Videos' },
        { id: 'academic', label: 'Academic' },
    ];

    // --- Pagination Logic ---
    const ITEMS_PER_PAGE = activeFilter === 'images' ? 20 : 10;

    // Calculate current data slice
    let dataToPaginate = [];
    if (activeFilter === 'images') {
        dataToPaginate = results?.images || results?.featured_media?.images || [];
    } else if (activeFilter === 'news') {
        dataToPaginate = results?.news || [];
    } else if (activeFilter === 'videos') {
        dataToPaginate = results?.videos || results?.featured_media?.videos || [];
    } else {
        dataToPaginate = results?.results || [];
    }

    const totalItems = dataToPaginate.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Slice data for current page
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentData = dataToPaginate.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Reset pagination when query or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [query, activeFilter]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-indigo-500/30">
            {/* Search Header */}
            <header className="sticky top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                    {/* Logo */}
                    <button
                        onClick={() => navigate('/')}
                        className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent shrink-0"
                    >
                        Seekora
                    </button>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative group">
                        <div className="relative h-11 bg-slate-800/50 border border-slate-700/50 rounded-full flex items-center px-4 hover:border-slate-600 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/40">
                            <Search className="w-4 h-4 text-slate-500 mr-3" />
                            <input
                                type="text"
                                value={localQuery}
                                onChange={(e) => setLocalQuery(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                            />
                            <div className="flex items-center gap-2 text-slate-400 pl-2 border-l border-slate-700/50">
                                <Mic
                                    className="w-4 h-4 hover:text-blue-400 cursor-pointer transition-colors"
                                    onClick={() => setIsVoiceOpen(true)}
                                />
                                <Camera className="w-4 h-4 hover:text-blue-400 cursor-pointer transition-colors" />
                            </div>
                        </div>
                    </form>

                    {/* User Actions */}
                    <div className="hidden md:flex items-center gap-4 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700" />
                    </div>
                </div>

                {/* Filters Tab Bar */}
                <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                    {FILTERS.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => {
                                setFilter(f.id as any);
                                const newParams = new URLSearchParams(searchParams);
                                newParams.set('type', f.id);
                                navigate(`/search?${newParams.toString()}`);
                            }}
                            className={`
                              px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                              ${activeFilter === f.id
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'}
                            `}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 py-6">

                {/* Result Meta & Tools */}
                <div className="flex items-center justify-between mb-6">
                    <div className="text-xs text-slate-500 font-medium">
                        {results?.meta ? (
                            <span>
                                About {results.meta.result_count?.toLocaleString()} results ({results.meta.query_time} seconds)
                                {results.meta.crawl_stats?.urls_crawled > 0 && (
                                    <span className="ml-2 text-indigo-400">
                                        • Live crawled {results.meta.crawl_stats.urls_crawled} pages
                                    </span>
                                )}
                            </span>
                        ) : (
                            <span>Searching...</span>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <ResultListSkeleton />
                ) : isError ? (
                    <div className="p-8 text-center text-red-400 bg-red-400/10 rounded-2xl border border-red-400/20">
                        <p className="font-bold">Connection Error</p>
                        <p className="text-sm opacity-70">Could not retrieve results. Please ensure backend is running.</p>
                    </div>
                ) : (results?.results?.length === 0 && results?.images?.length === 0 && results?.videos?.length === 0 && results?.news?.length === 0) ? (
                    <div className="p-12 text-center text-slate-500 border border-slate-800 border-dashed rounded-3xl">
                        <h3 className="text-lg text-slate-300 font-medium mb-1">No results found</h3>
                        <p className="text-sm">Try using different keywords or checking your spelling.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-10">

                        {/* LEFT COLUMN: Results */}
                        <div className="min-w-0">

                            {/* --- NEWS TAB --- */}
                            {activeFilter === 'news' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                    {currentData.map((item: any, i: number) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 transition-all cursor-pointer group h-full hover:border-slate-600 shadow-sm hover:shadow-md"
                                        >
                                            {item.thumbnail && (
                                                <div className="h-40 w-full overflow-hidden bg-slate-950 border-b border-slate-800/50">
                                                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                                </div>
                                            )}
                                            <div className="p-4 flex flex-col flex-grow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">{item.source}</span>
                                                    <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
                                                </div>
                                                <h3 className="text-base font-semibold text-slate-200 group-hover:text-blue-400 transition-colors leading-snug mb-2">
                                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="focus:outline-none">
                                                        {item.title}
                                                    </a>
                                                </h3>
                                                <p className="text-xs text-slate-400 line-clamp-3 mb-3 flex-grow leading-relaxed">
                                                    {item.snippet}
                                                </p>
                                                <div className="flex items-center justify-end mt-auto pt-3 border-t border-slate-800/50">
                                                    <span className="text-[10px] font-medium text-slate-500 group-hover:text-blue-400 flex items-center gap-1 transition-colors">
                                                        Read Article <ArrowUpRight className="w-3 h-3" />
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                /* --- IMAGES TAB --- */
                            ) : activeFilter === 'images' ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {currentData.map((img: any, i: number) => {
                                        const domain = new URL(img.parent_url || 'https://seekora.com').hostname.replace('www.', '');
                                        const ext = img.url.split('.').pop()?.substring(0, 4).toUpperCase() || 'IMG';

                                        // Badge Color
                                        let badgeColor = "bg-slate-700";
                                        if (ext === 'JPG' || ext === 'JPEG') badgeColor = "bg-blue-600";
                                        if (ext === 'PNG') badgeColor = "bg-purple-600";
                                        if (ext === 'WEBP') badgeColor = "bg-green-600";

                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="group cursor-pointer rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all hover:shadow-lg relative"
                                            >
                                                <div className="aspect-[4/3] relative overflow-hidden bg-black">
                                                    <img
                                                        src={img.url}
                                                        alt={img.alt_text}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        loading="lazy"
                                                    />

                                                    {/* Badge */}
                                                    <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded ${badgeColor} backdrop-blur-md text-[9px] font-bold text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity delay-75 shadow-lg`}>
                                                        {ext}
                                                    </div>

                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] text-white font-bold uppercase border border-white/10">
                                                                {domain[0]}
                                                            </div>
                                                            <span className="text-[10px] text-slate-300 font-medium truncate">{domain}</span>
                                                        </div>
                                                        <p className="text-xs text-white font-medium line-clamp-2 leading-tight mb-3">{img.alt_text || img.parent_title}</p>

                                                        {/* Actions */}
                                                        <div className="flex gap-2">
                                                            <a
                                                                href={img.parent_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex-1 py-1.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-medium text-white text-center transition-colors border border-white/10"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                Visit
                                                            </a>
                                                            <a
                                                                href={img.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex-1 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-[10px] font-medium text-white text-center transition-colors shadow-lg"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                View
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                /* --- VIDEOS TAB --- */
                            ) : activeFilter === 'videos' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {currentData.map((vid: any, i: number) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer hover:border-slate-600 transition-all hover:shadow-lg"
                                        >
                                            <div className="aspect-video bg-black relative overflow-hidden">
                                                <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg group-hover:bg-red-600 group-hover:border-red-500">
                                                        <PlayCircle className="w-6 h-6 text-white fill-current" />
                                                    </div>
                                                </div>
                                                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">{vid.provider}</span>
                                            </div>
                                            <div className="p-3 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800">
                                                <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors mb-1">{vid.title}</h3>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-slate-500 truncate">{vid.parent_url.replace('www.', '')}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                /* --- ALL / WEB TAB --- */
                            ) : (
                                <div className="flex flex-col gap-8">
                                    {/* Top Stories (First Page Only) */}
                                    {currentPage === 1 && results.news?.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="border-b border-slate-800/50 pb-6"
                                        >
                                            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                                <Newspaper className="w-5 h-5 text-blue-400" /> Top Stories
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {results.news.slice(0, 3).map((news: any, i: number) => (
                                                    <a key={i} href={news.url} target="_blank" rel="noopener noreferrer" className="bg-slate-900 rounded-lg p-3 hover:bg-slate-800 transition-colors group border border-slate-800/50 block">
                                                        <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-2">
                                                            <span className="text-blue-400 font-bold">{news.source}</span>
                                                            <span>{news.time}</span>
                                                        </div>
                                                        <h4 className="text-sm font-medium text-slate-200 line-clamp-2 group-hover:text-blue-400 leading-snug">{news.title}</h4>
                                                    </a>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Videos (First Page Only) */}
                                    {currentPage === 1 && results.videos?.length > 0 && (
                                        <motion.div className="border-b border-slate-800/50 pb-6">
                                            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                                <PlayCircle className="w-5 h-5 text-red-500" /> Videos
                                            </h3>
                                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 snap-x">
                                                {results.videos.slice(0, 5).map((vid: any, i: number) => (
                                                    <div key={i} className="min-w-[260px] snap-center">
                                                        <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer hover:border-slate-600 transition-colors">
                                                            <div className="aspect-video bg-black relative">
                                                                <img src={vid.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                                        <PlayCircle className="w-4 h-4 text-white fill-white" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="p-3">
                                                                <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-blue-400">{vid.title}</h4>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Main List */}
                                    <ResultList results={currentData} query={query} />
                                </div>
                            )}

                            {/* --- PAGINATION CONTROLS --- */}
                            {totalPages > 1 && (
                                <div className="mt-12 flex items-center justify-center gap-2">
                                    {/* Previous Button (optional, sticking to requested 1,2,3 for now) */}

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                        <button
                                            key={n}
                                            onClick={() => handlePageChange(n)}
                                            className={`
                                              w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all
                                              ${currentPage === n
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                                                    : 'text-slate-500 hover:bg-slate-800 hover:text-white'}
                                            `}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Sidebar */}
                        <aside className="hidden lg:block space-y-6">
                            {(activeFilter === 'all' || activeFilter === 'academic') && (
                                <div className="space-y-6 sticky top-24">
                                    <Card className="p-5 border-slate-800 bg-slate-900/50">
                                        <h4 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-blue-400" /> Refine Search
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {[`${query} history`, `${query} news`, `${query} images`, `latest on ${query}`, `${query} wiki`].map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => {
                                                        navigate(`/search?q=${encodeURIComponent(tag)}`);
                                                        setLocalQuery(tag);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </aside>
                    </div>
                )}
            </main>

            {/* Voice Overlay */}
            <VoiceOverlay isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
        </div>
    );
}
