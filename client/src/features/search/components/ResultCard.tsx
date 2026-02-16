import type { ReactNode } from 'react';
import { ExternalLink, Globe, MoreHorizontal } from 'lucide-react';
import { Card, cn } from '@/core/primitives';

interface ResultCardProps {
    children: ReactNode;
    className?: string;
    url: string;
}

export function ResultCard({ children, className, url }: ResultCardProps) {
    return (
        <Card className={cn("p-6 flex flex-col gap-3 group", className)}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-0" />
            <div className="relative z-10 flex flex-col gap-3">
                {children}
            </div>
        </Card>
    );
}

export function ResultHeader({ site, icon: Icon = Globe }: { site: string; icon?: any }) {
    return (
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center overflow-hidden">
                    <Icon className="w-3 h-3 text-slate-300" />
                </div>
                <span className="truncate max-w-[200px]">{site}</span>
            </div>
            <button className="p-1 hover:bg-slate-700/50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
            </button>
        </div>
    );
}

export function ResultTitle({ children }: { children: ReactNode; url: string }) {
    return (
        <h3 className="text-xl font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-2">
            <span className="line-clamp-1">{children}</span>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-y-1 group-hover:translate-y-0" />
        </h3>
    );
}

export function ResultSnippet({ children, terms = [] }: { children: string; terms?: string[] }) {
    // Simple highlighting logic
    let content = children;
    terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        content = content.replace(regex, '<span class="text-white font-semibold">$1</span>');
    });

    return (
        <p
            className="text-slate-400 text-sm leading-relaxed line-clamp-2"
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}

export function ResultMedia({ images = [], videos = [] }: { images?: { url: string; alt_text: string }[]; videos?: { url: string; title: string; provider: string }[] }) {
    if (images.length === 0 && videos.length === 0) return null;

    return (
        <div className="flex gap-2 py-2 overflow-x-auto no-scrollbar">
            {images.map((img, i) => (
                <div key={i} className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border border-slate-700/50 bg-slate-900 group/img relative">
                    <img src={img.url} alt={img.alt_text} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors" />
                </div>
            ))}
            {videos.map((vid, i) => (
                <div key={i} className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border border-slate-700/50 bg-slate-900 group/vid relative">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                        <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                        </div>
                    </div>
                    <span className="absolute bottom-1 right-1 px-1 rounded bg-black/60 text-[8px] text-white font-bold uppercase z-10">{vid.provider}</span>
                </div>
            ))}
        </div>
    );
}

export function ResultFooter({ tags = [] }: { tags?: string[] }) {
    if (tags.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-1">
            {tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {tag}
                </span>
            ))}
        </div>
    );
}
