import type { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-600 hover:bg-slate-800/60",
                className
            )}
        >
            {children}
        </div>
    );
}

interface ButtonProps {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost';
    className?: string;
    onClick?: () => void;
}

export function Button({ children, variant = 'primary', className, onClick }: ButtonProps) {
    const variants = {
        primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
        secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
        ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white"
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "px-4 py-2 rounded-xl font-medium transition-all duration-200 active:scale-95",
                variants[variant],
                className
            )}
        >
            {children}
        </button>
    );
}
