import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface VoiceOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function VoiceOverlay({ isOpen, onClose }: VoiceOverlayProps) {
    const navigate = useNavigate();
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTranscript('');
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            const current = event.resultIndex;
            const text = event.results[current][0].transcript;
            setTranscript(text);
        };

        recognition.onend = () => {
            setIsListening(false);
            if (transcript) {
                // Short delay to show the final transcript before navigating
                setTimeout(() => {
                    onClose();
                    navigate(`/search?q=${encodeURIComponent(transcript)}`);
                }, 800);
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.error(e);
        }

        return () => recognition.abort();
    }, [isOpen, transcript, navigate, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 p-3 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <div className="relative mb-12">
                        <motion.div
                            animate={{
                                scale: isListening ? [1, 1.5, 1] : 1,
                                opacity: isListening ? [0.3, 0.1, 0.3] : 0.2
                            }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute inset-[-40px] bg-indigo-500 rounded-full blur-3xl opacity-20"
                        />
                        <div className="w-32 h-32 rounded-full bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 relative z-10">
                            <Mic className={cn("w-12 h-12 text-white", isListening && "animate-pulse")} />
                        </div>
                    </div>

                    <motion.h2
                        key={transcript}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-4xl font-bold text-white text-center mb-4 min-h-[1.2em]"
                    >
                        {transcript || (isListening ? "Listening..." : "Ready")}
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-slate-400 text-lg font-medium text-center max-w-md"
                    >
                        {isListening ? "Speak clearly into your microphone" : "Processings..."}
                    </motion.p>

                    <div className="mt-20 flex gap-2">
                        {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                            <motion.div
                                key={i}
                                animate={{ height: isListening ? [10, h * 10, 10] : 10 }}
                                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                                className="w-1.5 bg-indigo-400 rounded-full"
                            />
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Helper function in case cn is not imported correctly in this file, 
// though it should be available via global core/primitives
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
