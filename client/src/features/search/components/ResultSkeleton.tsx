import { motion } from 'framer-motion';

export function ResultSkeleton() {
    return (
        <div className="p-6 rounded-2xl bg-slate-800/20 border border-slate-700/30 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-700/50 animate-pulse" />
                <div className="h-3 w-32 bg-slate-700/50 rounded animate-pulse" />
            </div>

            <div className="h-6 w-3/4 bg-slate-700/50 rounded animate-pulse" />

            <div className="space-y-2">
                <div className="h-3 w-full bg-slate-700/30 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-slate-700/30 rounded animate-pulse" />
            </div>

            <div className="flex gap-2">
                <div className="h-4 w-12 bg-slate-700/40 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-700/40 rounded animate-pulse" />
            </div>
        </div>
    );
}

export function ResultListSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                >
                    <ResultSkeleton />
                </motion.div>
            ))}
        </div>
    );
}
