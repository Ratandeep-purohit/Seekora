import { motion } from 'framer-motion';
import { ResultCard, ResultHeader, ResultTitle, ResultSnippet, ResultFooter } from './ResultCard';

interface SearchResult {
    id: string;
    title: string;
    url: string;
    displayUrl: string;
    snippet: string;
    tags?: string[];
    images?: { url: string; alt_text: string }[];
    videos?: { url: string; title: string; provider: string }[];
}

export default function ResultList({ results, query }: { results: SearchResult[], query: string }) {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-4"
        >
            {results.map((result) => (
                <motion.div key={result.id} variants={item}>
                    <ResultCard url={result.url}>
                        <ResultHeader site={result.displayUrl} />
                        <ResultTitle url={result.url}>{result.title}</ResultTitle>
                        <ResultSnippet terms={[query]}>{result.snippet}</ResultSnippet>
                        <ResultFooter tags={result.tags} />
                    </ResultCard>
                </motion.div>
            ))}
        </motion.div>
    );
}
