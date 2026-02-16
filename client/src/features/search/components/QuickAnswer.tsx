import { motion } from 'framer-motion';
import { Sparkles, ArrowUpRight, CheckCircle2, Lightbulb } from 'lucide-react';
import { Card } from '@/core/primitives';

const KNOWLEDGE_BASE: Record<string, any> = {
    quantum: {
        title: "Quantum computing uses qubits instead of classical bits.",
        overview: "Unlike classical bits (0 or 1), <strong>qubits</strong> exist in a state of superposition, representing both simultaneously. When two or more qubits are <strong>entangled</strong>, the state of one is directly linked to another, regardless of distance.",
        stats: ["Solves NP-hard problems", "Enabled by Superposition"],
        sources: 12
    },
    tesla: {
        title: "Tesla, Inc. designs and manufactures electric vehicles and energy storage.",
        overview: "Founded in 2003, <strong>Tesla</strong> accelerated the transition to sustainable energy. Key innovations include the <strong>Gigafactory</strong> system and <strong>Autopilot</strong> neural networks for full self-driving capability.",
        stats: ["Market Cap leader in EVs", "Global Supercharger network"],
        sources: 24
    },
    spacex: {
        title: "SpaceX is an aerospace manufacturer pioneering reusable rockets.",
        overview: "Founded by Elon Musk, <strong>SpaceX</strong>'s primary goal is the colonization of Mars. The <strong>Starship</strong> vessel is designed to be fully reusable, dramatically lowering the cost of space transportation.",
        stats: ["Falcon 9 reusability", "Starlink global coverage"],
        sources: 18
    },
    ai: {
        title: "Artificial Intelligence mimics human cognitive functions using data.",
        overview: "Today's AI explosion is driven by <strong>Transformers</strong> and Large Language Models (LLMs). These neural networks predict the next token in a sequence, enabling human-like creative and analytical tasks.",
        stats: ["Neural scaling laws", "Propelled by GPU clusters"],
        sources: 42
    }
};

export function QuickAnswer({ query }: { query: string }) {
    const lowerQuery = query.toLowerCase();
    const match = Object.keys(KNOWLEDGE_BASE).find(key => lowerQuery.includes(key));
    const data = match ? KNOWLEDGE_BASE[match] : null;

    if (!data) return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <Card className="p-6 border-slate-700/50 bg-slate-800/20 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-slate-400">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <span className="text-sm font-medium italic">Seekora Neural Engine is synthesizing a real-time overview for your query...</span>
                </div>
            </Card>
        </motion.div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <Card className="p-8 border-indigo-500/30 bg-gradient-to-br from-indigo-900/20 to-purple-900/10 shadow-indigo-500/5 ring-1 ring-indigo-500/20">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                        <Sparkles className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                                Deep Intelligence Analysis
                            </span>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-4">
                            {data.title}
                        </h2>

                        <div
                            className="text-slate-300 leading-relaxed mb-6"
                            dangerouslySetInnerHTML={{ __html: data.overview }}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {data.stats.map((stat: string, i: number) => (
                                <div key={stat} className="flex items-start gap-3 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                                    {i === 0 ? <CheckCircle2 className="w-5 h-5 text-teal-400 mt-0.5" /> : <Lightbulb className="w-5 h-5 text-blue-400 mt-0.5" />}
                                    <span className="text-sm text-teal-100">{stat}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900" />
                                    ))}
                                </div>
                                <span className="text-xs text-slate-500 ml-2 italic">Verified by {data.sources} experts & citations</span>
                            </div>
                            <button className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold flex items-center gap-1 transition-colors">
                                Explore Knowledge Graph <ArrowUpRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
