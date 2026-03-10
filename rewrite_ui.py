import os
import re

files = [
    'client/src/features/search/pages/HomePage.tsx',
    'client/src/features/search/pages/ResultsPage.tsx'
]

replacements = {
    'text-indigo-': 'text-primary-',
    'bg-indigo-': 'bg-primary-',
    'border-indigo-': 'border-primary-',
    'shadow-indigo-': 'shadow-primary-',
    
    'text-purple-': 'text-primary-',
    'bg-purple-': 'bg-primary-',
    'border-purple-': 'border-primary-',
    'shadow-purple-': 'shadow-primary-',

    'text-amber-': 'text-primary-',
    'from-indigo-500': 'from-primary-500',
    'to-purple-500': 'to-primary-600',
}

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import
    if 'ThemeSwitcher' not in content:
        content = content.replace(
            "import { useSearchStore } from '../stores/searchStore';",
            "import { useSearchStore } from '../stores/searchStore';\nimport ThemeSwitcher from '../components/ThemeSwitcher';"
        )
    
    # Insert ThemeSwitcher in UI
    if 'Workspace</a>' in content and 'ThemeSwitcher />' not in content:
        content = content.replace(
            '<a href="#" className="text-slate-400 hover:text-white transition-colors">Workspace</a>',
            '<ThemeSwitcher />\n                    <a href="#" className="text-slate-400 hover:text-white transition-colors">Workspace</a>'
        )
    elif '<button className="w-9 h-9 rounded-full' in content and 'ThemeSwitcher />' not in content:
        content = content.replace(
            '<button className="w-9 h-9 rounded-full',
            '<ThemeSwitcher />\n                        <button className="w-9 h-9 rounded-full'
        )

    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
