import React from 'react';
import { FileText, Plus, Sun, Moon, Laptop, Folder as FolderIcon } from 'lucide-react';
import { ThemeMode } from '../types';

interface MobileBottomNavProps {
  activeTab: 'notes' | 'folders';
  theme: ThemeMode;
  onSelectTab: (tab: 'notes' | 'folders') => void;
  onCreateNote: () => void;
  onCycleTheme: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  theme,
  onSelectTab,
  onCreateNote,
  onCycleTheme,
}) => {
  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="lg:hidden shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-1.5 flex items-center justify-around z-30 shadow-lg select-none"
    >
      {/* 1. Notes Tab */}
      <button
        type="button"
        onClick={() => onSelectTab('notes')}
        aria-label="Notes Tab"
        className={`min-h-[44px] min-w-[44px] px-3 py-1 flex flex-col items-center justify-center gap-1 rounded-xl transition active:scale-95 cursor-pointer ${
          activeTab === 'notes'
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span className="text-[10px]">Notes</span>
      </button>

      {/* 2. Folders Tab */}
      <button
        type="button"
        onClick={() => onSelectTab('folders')}
        aria-label="Folders Tab"
        className={`min-h-[44px] min-w-[44px] px-3 py-1 flex flex-col items-center justify-center gap-1 rounded-xl transition active:scale-95 cursor-pointer ${
          activeTab === 'folders'
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <FolderIcon className="w-5 h-5" />
        <span className="text-[10px]">Folders</span>
      </button>

      {/* 3. New Note Button (Prominent Center/Action) */}
      <button
        type="button"
        onClick={onCreateNote}
        aria-label="Create New Note"
        className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* 4. Theme Cycle */}
      <button
        type="button"
        onClick={onCycleTheme}
        aria-label={`Current theme: ${theme}. Click to switch theme.`}
        className="min-h-[44px] min-w-[44px] px-3 py-1 flex flex-col items-center justify-center gap-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition active:scale-95 cursor-pointer"
      >
        {theme === 'light' ? (
          <Sun className="w-5 h-5 text-amber-500" />
        ) : theme === 'dark' ? (
          <Moon className="w-5 h-5 text-blue-400" />
        ) : (
          <Laptop className="w-5 h-5 text-slate-400" />
        )}
        <span className="text-[10px] capitalize">{theme}</span>
      </button>
    </nav>
  );
};
