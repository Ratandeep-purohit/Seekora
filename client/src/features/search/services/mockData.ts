export interface SearchResult {
    id: string;
    title: string;
    url: string;
    displayUrl: string;
    snippet: string;
    tags?: string[];
    type?: 'web' | 'news' | 'academic' | 'video';
    publishedAt?: string;
}

export const mockSearchResults: SearchResult[] = [
    {
        id: '1',
        title: 'Quantum Computing: A Subatomic Revolution in Processing Power',
        url: 'https://science.example/quantum-computing-2025',
        displayUrl: 'science.example › tech › quantum',
        snippet: 'Quantum computing leverages the principles of superposition and entanglement to solve problems that are classically intractable. Recent breakthroughs in 2025 show qubit stability...',
        tags: ['Quantum', 'Physics', 'Technology'],
        type: 'academic'
    },
    {
        id: '2',
        title: 'NVIDIA Announces H200 NVL for Enterprise AI Workloads',
        url: 'https://tech-news.example/nvidia-h200-nvl',
        displayUrl: 'tech-news.example › news › hardware',
        snippet: 'The silicon giant unveils its latest AI accelerator, specifically designed for large language model inference and massive-scale data processing in Seekora-like environments.',
        tags: ['AI', 'Hardware', 'NVIDIA'],
        type: 'news',
        publishedAt: '2 hours ago'
    },
    {
        id: '3',
        title: 'How Seekora is Redefining the Search Experience',
        url: 'https://blog.seekora.io/design-philosophy',
        displayUrl: 'blog.seekora.io › philosophy',
        snippet: 'Search is no longer about finding links; it is about finding answers. Seekora utilizes advanced intent detection and real-time computation to prioritize human understanding over indexing.',
        tags: ['Design', 'UX', 'Search'],
        type: 'web'
    },
    {
        id: '4',
        title: 'TypeScript 5.8 Release Notes: Improved Narrowing and Typed JSON',
        url: 'https://dev-resource.example/ts-5-8-guide',
        displayUrl: 'dev-resource.example › coding › typescript',
        snippet: 'The latest version of TypeScript introduces significant improvements to control flow analysis and better support for modern React 19 concurrent features.',
        tags: ['Coding', 'WebDev', 'TypeScript'],
        type: 'web'
    },
    {
        id: '5',
        title: 'Top 10 High-Growth Markets for 2025 Financial Planning',
        url: 'https://finance.example/markets-2025',
        displayUrl: 'finance.example › analysis › future',
        snippet: 'Venture capital is shifting towards sustainable energy and personalized medicine as the next global drivers of economic expansion. Diversification remains key in a volatile landscape.',
        tags: ['Finance', 'Economy', 'Trends'],
        type: 'news',
        publishedAt: 'Yesterday'
    }
];
