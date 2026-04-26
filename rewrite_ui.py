import os
import glob

replacements = {
    "text-white": "text-[var(--color-text-primary)]",
    "text-slate-200": "text-[var(--color-text-primary)]",
    "text-slate-300": "text-[var(--color-text-secondary)]",
    "text-slate-400": "text-[var(--color-text-secondary)]",
    "text-slate-500": "text-[var(--color-text-tertiary)]",
    "bg-white/5": "bg-[var(--color-surface)]",
    "bg-white/10": "bg-[var(--color-surface-hover)]",
    "bg-white/15": "bg-[var(--color-surface-hover)]",
    "border-white/5": "border-[var(--color-border)]",
    "border-white/10": "border-[var(--color-border)]",
    "border-white/20": "border-[var(--color-border-hover)]",
    "text-white/80": "text-[var(--color-text-primary)]/80",
    "hover:text-white": "hover:text-[var(--color-text-primary)]",
    "hover:bg-white/5": "hover:bg-[var(--color-surface)]",
    "hover:bg-white/10": "hover:bg-[var(--color-surface-hover)]",
    "hover:border-white/10": "hover:border-[var(--color-border)]",
}

for filepath in glob.glob("client/src/**/*.tsx", recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
