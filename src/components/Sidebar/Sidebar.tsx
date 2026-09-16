import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  FileText,
  Folder as FolderIcon,
  Sun,
  Moon,
  Laptop,
  Settings,
  X,
  ArrowUpDown,
  HelpCircle,
  Check,
} from 'lucide-react';
import { Note, Folder, ThemeMode, SyncState, NoteSortOption } from '../../types';
import { NoteCard } from './NoteCard';
import { FolderGrid } from './FolderGrid';
import { PWAInstallButton } from '../PWAInstallButton';

interface SidebarProps {
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string | null;
  activeTab: 'notes' | 'folders';
  activeFolderFilter: string | null;
  searchQuery: string;
  theme: ThemeMode;
  syncState: SyncState;
  sortOption: NoteSortOption;
  countsByFolder: Record<string, number>;
  totalNotesCount: number;
  unfiledNotesCount: number;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  onTabChange: (tab: 'notes' | 'folders') => void;
  onSearchChange: (q: string) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onSelectFolderFilter: (folderId: string | null) => void;
  onSortChange: (sort: NoteSortOption) => void;
  onCreateFolder: (name: string, color: any) => Promise<void>;
  onRenameFolder: (id: string, newName: string, newColor: any) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onCycleTheme: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  notes,
  folders,
  selectedNoteId,
  activeTab,
  activeFolderFilter,
  searchQuery,
  theme,
  syncState,
  sortOption,
  countsByFolder,
  totalNotesCount,
  unfiledNotesCount,
  searchInputRef,
  onTabChange,
  onSearchChange,
  onSelectNote,
  onCreateNote,
  onTogglePin,
  onDeleteNote,
  onSelectFolderFilter,
  onSortChange,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onCycleTheme,
  onOpenSettings,
  onOpenShortcuts,
}) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortMenu]);

  const foldersById = React.useMemo(() => {
    const map = new Map<string, Folder>();
    for (const f of folders) {
      map.set(f.id, f);
    }
    return map;
  }, [folders]);

  const activeFolderName = React.useMemo(() => {
    if (!activeFolderFilter) return null;
    if (activeFolderFilter === 'unfiled') return 'Unfiled';
    return foldersById.get(activeFolderFilter)?.name || 'Folder';
  }, [activeFolderFilter, foldersById]);

  return (
    <aside
      id="app-sidebar"
      className="w-full lg:w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-[#0f172a] flex flex-col h-full overflow-hidden z-10 select-none"
    >
      {/* 1. App Top Header */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              Minimalist Notes
            </h1>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Fast • Offline • Sync
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <PWAInstallButton />

          <button
            type="button"
            onClick={onCycleTheme}
            aria-label={`Current theme: ${theme}. Click to change theme`}
            title={`Theme: ${theme}`}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : theme === 'dark' ? (
              <Moon className="w-4 h-4 text-blue-400" />
            ) : (
              <Laptop className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Cloud Sync and Settings"
            title="Cloud Sync and Settings"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer relative"
          >
            <Settings className="w-4 h-4" />
            {syncState === 'syncing' && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            )}
            {syncState === 'error' && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Shortcuts Cheat Sheet"
            title="Shortcuts (?)"
            className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onCreateNote}
            aria-label="Create new note"
            title={`New Note (${modKey}+N)`}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer ml-0.5 inline-flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Search Box with shortcut hint */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title..."
            aria-label="Search notes by title"
            className="w-full text-xs pl-9 pr-14 py-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-blue-500 shadow-2xs transition-colors"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block absolute right-2.5 top-2.5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/60 rounded border border-slate-200 dark:border-slate-700 pointer-events-none">
              {modKey}K
            </kbd>
          )}
        </div>
      </div>

      {/* 3. Navigation Tabs: "Notes" and "Folders" */}
      <div className="px-3 py-1">
        <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-800/60 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onTabChange('notes')}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notes</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              {totalNotesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('folders')}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'folders'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderIcon className="w-3.5 h-3.5" />
            <span>Folders</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              {folders.length}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-bar: Sort Options & Active Filters */}
      {activeTab === 'notes' && (
        <div className="px-3 pt-1.5 pb-1 flex items-center justify-between gap-1 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="truncate">
            {searchQuery
              ? `${notes.length} ${notes.length === 1 ? 'match' : 'matches'}`
              : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
          </span>

          {/* Sort Menu */}
          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer py-0.5 px-1.5 rounded"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>
                {sortOption === 'updated'
                  ? 'Updated'
                  : sortOption === 'created'
                  ? 'Created'
                  : 'Title'}
              </span>
            </button>

            {showSortMenu && (
              <div
                role="menu"
                className="absolute right-0 mt-1 w-40 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs text-slate-700 dark:text-slate-200"
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sort Notes By
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSortChange('updated');
                    setShowSortMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between cursor-pointer"
                >
                  <span>Recently Updated</span>
                  {sortOption === 'updated' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSortChange('created');
                    setShowSortMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between cursor-pointer"
                >
                  <span>Recently Created</span>
                  {sortOption === 'created' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSortChange('alphabetical');
                    setShowSortMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between cursor-pointer"
                >
                  <span>Alphabetical (A-Z)</span>
                  {sortOption === 'alphabetical' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Folder Filter Chip (if filtered) */}
      {activeFolderFilter && activeTab === 'notes' && (
        <div className="px-3 pt-1">
          <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300">
            <span className="truncate font-medium">📁 {activeFolderName}</span>
            <button
              type="button"
              onClick={() => onSelectFolderFilter(null)}
              aria-label="Clear folder filter"
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Tab Content Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {activeTab === 'notes' ? (
          <div>
            {notes.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center">
                <FileText className="w-8 h-8 mb-2 stroke-1 opacity-50" />
                <p className="font-medium text-slate-600 dark:text-slate-400">
                  {searchQuery
                    ? 'No notes matching title'
                    : 'No notes in this view'}
                </p>
                <button
                  type="button"
                  onClick={onCreateNote}
                  className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Create a new note
                </button>
              </div>
            ) : (
              notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isSelected={note.id === selectedNoteId}
                  folder={note.folderId ? foldersById.get(note.folderId) : undefined}
                  searchQuery={searchQuery}
                  onSelect={onSelectNote}
                  onTogglePin={onTogglePin}
                  onDelete={onDeleteNote}
                />
              ))
            )}
          </div>
        ) : (
          <FolderGrid
            folders={folders}
            countsByFolder={countsByFolder}
            totalNotesCount={totalNotesCount}
            unfiledNotesCount={unfiledNotesCount}
            activeFolderFilter={activeFolderFilter}
            onSelectFolder={(fId) => {
              onSelectFolderFilter(fId);
              onTabChange('notes');
            }}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
          />
        )}
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
