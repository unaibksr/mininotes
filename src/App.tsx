import React, { useState, useEffect, useMemo, useCallback, useRef, useDeferredValue, Suspense } from 'react';
import { Note, Folder, FolderColor, EditorFont, NoteSortOption } from './types';
import {
  getActiveNotes,
  getActiveFolders,
  putNote,
  softDeleteNote,
  restoreNote,
  putFolder,
  softDeleteFolder,
  putNotesBatch,
  putFoldersBatch,
} from './lib/db';
import { triggerSync } from './lib/supabase';
import { useSyncCoordinator } from './hooks/useSyncCoordinator';
import { useTheme } from './hooks/useTheme';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useFullscreen } from './hooks/useFullscreen';
import { Sidebar } from './components/Sidebar/Sidebar';
import { NoteEditor } from './components/Editor/NoteEditor';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Toast } from './components/Toast';
import { INITIAL_FOLDERS, INITIAL_NOTES } from './lib/initialData';
import { WifiOff, FileText, Plus } from 'lucide-react';

// Lazy load non-critical modals to reduce initial bundle and accelerate startup
const SyncSettingsModal = React.lazy(() =>
  import('./components/SyncSettingsModal').then((m) => ({ default: m.SyncSettingsModal }))
);
const ShortcutsModal = React.lazy(() =>
  import('./components/ShortcutsModal').then((m) => ({ default: m.ShortcutsModal }))
);

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'folders'>('notes');
  const [activeFolderFilter, setActiveFolderFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  // Real Browser Fullscreen Hook
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Search input ref for Ctrl+K
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Editor Font preference
  const [font, setFont] = useState<EditorFont>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('minimalist_notes_font') as EditorFont;
      if (saved === 'sans' || saved === 'serif' || saved === 'mono') {
        return saved;
      }
    }
    return 'sans';
  });

  const handleChangeFont = useCallback((newFont: EditorFont) => {
    setFont(newFont);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('minimalist_notes_font', newFont);
    }
  }, []);

  // Sort preference
  const [sortOption, setSortOption] = useState<NoteSortOption>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('minimalist_notes_sort') as NoteSortOption;
      if (saved === 'updated' || saved === 'created' || saved === 'alphabetical') {
        return saved;
      }
    }
    return 'updated';
  });

  const handleSortChange = useCallback((newSort: NoteSortOption) => {
    setSortOption(newSort);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('minimalist_notes_sort', newSort);
    }
  }, []);

  // Undo Toast state
  const [toast, setToast] = useState<{
    id: string;
    message: string;
    noteToUndo?: Note;
  } | null>(null);

  const { theme, cycleTheme } = useTheme();
  const isOnline = useOnlineStatus();

  // Load initial notes & folders from IndexedDB
  const reloadDataFromDb = useCallback(async () => {
    try {
      let loadedNotes = await getActiveNotes();
      let loadedFolders = await getActiveFolders();

      // Seed initial sample data if completely empty on first launch
      if (loadedNotes.length === 0 && loadedFolders.length === 0) {
        await putFoldersBatch(INITIAL_FOLDERS);
        await putNotesBatch(INITIAL_NOTES);
        loadedNotes = INITIAL_NOTES;
        loadedFolders = INITIAL_FOLDERS;
      }

      setNotes(loadedNotes);
      setFolders(loadedFolders);

      // Default select first note if none selected
      setSelectedNoteId((curr) => {
        if (curr && loadedNotes.some((n) => n.id === curr)) return curr;
        return loadedNotes.length > 0 ? loadedNotes[0].id : null;
      });
    } catch (e) {
      console.error('Failed to load data from IndexedDB:', e);
    }
  }, []);

  useEffect(() => {
    reloadDataFromDb();
  }, [reloadDataFromDb]);

  // Sync coordinator handles mount, write, visibilitychange, focus, 30s interval
  const { syncState, errorMessage, connection } = useSyncCoordinator(reloadDataFromDb);

  // Memoize counts by folder
  const countsByFolder = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.folderId) {
        counts[note.folderId] = (counts[note.folderId] || 0) + 1;
      }
    }
    return counts;
  }, [notes]);

  const totalNotesCount = notes.length;

  const unfiledNotesCount = useMemo(() => {
    return notes.filter((n) => !n.folderId).length;
  }, [notes]);

  // Defer search query so typing in search input is 100% non-blocking & 120fps responsive
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Visible Notes: Filtered by folder + Pinned first + Sorted + Searched strictly by title
  const visibleNotes = useMemo(() => {
    let list = notes;

    // Folder Filter
    if (activeFolderFilter === 'unfiled') {
      list = list.filter((n) => !n.folderId);
    } else if (activeFolderFilter) {
      list = list.filter((n) => n.folderId === activeFolderFilter);
    }

    // Search Filter: strictly by title of the notes
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.trim().toLowerCase();
      list = list.filter((n) => (n.title || '').toLowerCase().includes(q));
    }

    // Sort: pinned always prioritized first, then apply sort option
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      if (sortOption === 'created') {
        return a.updatedAt - b.updatedAt;
      }
      if (sortOption === 'alphabetical') {
        const titleA = (a.title || 'Untitled').trim().toLowerCase();
        const titleB = (b.title || 'Untitled').trim().toLowerCase();
        return titleA.localeCompare(titleB);
      }
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, activeFolderFilter, deferredSearchQuery, sortOption]);

  const selectedNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // Actions (stabilized with useCallback for React.memo on Sidebar and NoteCard)
  const handleSelectNote = useCallback((id: string) => {
    setSelectedNoteId(id);
    setMobileView('editor');
  }, []);

  // Back button handler: works seamlessly on desktop and mobile
  const handleBack = useCallback(() => {
    if (isZenMode) {
      setIsZenMode(false);
    }
    setMobileView('list');
    setSelectedNoteId(null);
  }, [isZenMode]);

  const handleCreateNote = useCallback(async () => {
    const newNote: Note = {
      id: generateUUID(),
      title: 'Untitled Note',
      content: '<p></p>',
      updatedAt: Date.now(),
      folderId:
        activeFolderFilter && activeFolderFilter !== 'unfiled' ? activeFolderFilter : null,
      pinned: false,
      tags: [],
      deleted: false,
      synced: false,
    };

    await putNote(newNote);
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    setActiveTab('notes');
    setMobileView('editor');
    triggerSync();
  }, [activeFolderFilter]);

  const handleSaveNote = useCallback(async (updatedNote: Note) => {
    await putNote(updatedNote);
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
    // Sync trigger: on every write (after debounce)
    triggerSync();
  }, []);

  const handleDeleteNote = useCallback(async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let noteToDelete: Note | undefined;
    setNotes((prev) => {
      noteToDelete = prev.find((n) => n.id === id);
      return prev.filter((n) => n.id !== id);
    });
    if (!noteToDelete) return;

    await softDeleteNote(id);

    // Show 6s undo toast
    setToast({
      id: generateUUID(),
      message: `"${noteToDelete.title || 'Note'}" deleted`,
      noteToUndo: noteToDelete,
    });

    setSelectedNoteId((curr) => {
      if (curr === id) {
        return null;
      }
      return curr;
    });

    triggerSync();
  }, []);

  const handleUndoDelete = useCallback(async () => {
    if (!toast?.noteToUndo) return;
    const restored = toast.noteToUndo;
    await restoreNote(restored.id);
    setNotes((prev) => [restored, ...prev]);
    setSelectedNoteId(restored.id);
    setToast(null);
    triggerSync();
  }, [toast]);

  const handleTogglePin = useCallback(async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotes((prev) => {
      const note = prev.find((n) => n.id === id);
      if (!note) return prev;
      const updated: Note = {
        ...note,
        pinned: !note.pinned,
        updatedAt: Date.now(),
        synced: false,
      };
      putNote(updated);
      triggerSync();
      return prev.map((n) => (n.id === id ? updated : n));
    });
  }, []);

  const handleDuplicateNote = useCallback(async (noteToDup: Note) => {
    const duplicated: Note = {
      ...noteToDup,
      id: generateUUID(),
      title: `${noteToDup.title} (Copy)`,
      updatedAt: Date.now(),
      synced: false,
    };
    await putNote(duplicated);
    setNotes((prev) => [duplicated, ...prev]);
    setSelectedNoteId(duplicated.id);
    triggerSync();
  }, []);

  const handleCreateFolder = useCallback(async (name: string, color: FolderColor) => {
    const newFolder: Folder = {
      id: generateUUID(),
      name,
      color,
      updatedAt: Date.now(),
      deleted: false,
      synced: false,
    };
    await putFolder(newFolder);
    setFolders((prev) => [...prev, newFolder]);
    triggerSync();
  }, []);

  const handleRenameFolder = useCallback(async (
    id: string,
    newName: string,
    newColor: FolderColor
  ) => {
    setFolders((prev) => {
      const folder = prev.find((f) => f.id === id);
      if (!folder) return prev;
      const updated: Folder = {
        ...folder,
        name: newName,
        color: newColor,
        updatedAt: Date.now(),
        synced: false,
      };
      putFolder(updated);
      triggerSync();
      return prev.map((f) => (f.id === id ? updated : f));
    });
  }, []);

  const handleDeleteFolder = useCallback(async (id: string) => {
    await softDeleteFolder(id);
    setFolders((prev) => prev.filter((f) => f.id !== id));

    setNotes((prev) => {
      const updatedList = prev.map((note) => {
        if (note.folderId === id) {
          const updatedNote = { ...note, folderId: null, updatedAt: Date.now() };
          putNote(updatedNote);
          return updatedNote;
        }
        return note;
      });
      return updatedList;
    });

    setActiveFolderFilter((curr) => (curr === id ? null : curr));
    triggerSync();
  }, []);

  const handleSelectFolderFilter = useCallback((fId: string | null) => {
    setActiveFolderFilter(fId);
    setActiveTab('notes');
  }, []);

  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleOpenShortcuts = useCallback(() => setIsShortcutsOpen(true), []);
  const handleCloseShortcuts = useCallback(() => setIsShortcutsOpen(false), []);
  const handleToggleZenMode = useCallback(() => setIsZenMode((prev) => !prev), []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const isInputOrEditor =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.classList.contains('ProseMirror');

      // Mod + N: New Note
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateNote();
        return;
      }

      // Mod + K: Focus Search
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveTab('notes');
        setMobileView('list');
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
        return;
      }

      // Mod + Shift + F: Toggle Zen Mode
      if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
        return;
      }

      // ?: Open Shortcuts Sheet when not actively writing in input/editor
      if (e.key === '?' && !isInputOrEditor) {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // Escape: Dismiss shortcuts / Exit Zen Mode / Clear Search / Back
      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (isZenMode) {
          setIsZenMode(false);
          return;
        }
        if (searchQuery) {
          setSearchQuery('');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsOpen, isZenMode, searchQuery, handleCreateNote]);

  return (
    <div
      id="app-root"
      className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans"
    >
      {/* Offline Status Top Banner */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 z-50 shrink-0 select-none shadow-xs"
        >
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Notes are safely saved to your local device.</span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar: In Zen Mode hidden; on mobile hidden if in editor view */}
        {!isZenMode && (
          <div
            className={`${
              mobileView === 'editor' ? 'hidden lg:flex' : 'flex'
            } w-full lg:w-80 h-full shrink-0`}
          >
            <Sidebar
              notes={visibleNotes}
              folders={folders}
              selectedNoteId={selectedNoteId}
              activeTab={activeTab}
              activeFolderFilter={activeFolderFilter}
              searchQuery={searchQuery}
              theme={theme}
              syncState={syncState}
              connection={connection}
              sortOption={sortOption}
              countsByFolder={countsByFolder}
              totalNotesCount={totalNotesCount}
              unfiledNotesCount={unfiledNotesCount}
              searchInputRef={searchInputRef}
              onTabChange={setActiveTab}
              onSearchChange={setSearchQuery}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              onTogglePin={handleTogglePin}
              onDeleteNote={handleDeleteNote}
              onSelectFolderFilter={handleSelectFolderFilter}
              onSortChange={handleSortChange}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              onCycleTheme={cycleTheme}
              onOpenSettings={handleOpenSettings}
              onOpenShortcuts={handleOpenShortcuts}
            />
          </div>
        )}

        {/* Editor Area: On mobile, visible when mobileView is 'editor'; on desktop always flex */}
        <div
          className={`${
            mobileView === 'list' && !isZenMode ? 'hidden lg:flex' : 'flex'
          } flex-1 h-full overflow-hidden`}
        >
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              note={selectedNote}
              folders={folders}
              syncState={syncState}
              connection={connection}
              font={font}
              isZenMode={isZenMode}
              isFullscreen={isFullscreen}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onDuplicateNote={handleDuplicateNote}
              onBack={handleBack}
              onToggleZenMode={handleToggleZenMode}
              onToggleFullscreen={toggleFullscreen}
              onChangeFont={handleChangeFont}
              onOpenShortcuts={handleOpenShortcuts}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 bg-[#f8fafc] dark:bg-[#0f172a]">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4 shadow-xs">
                <FileText className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                No note selected
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                Choose a note from the sidebar or start fresh with a new one.
              </p>
              <button
                type="button"
                onClick={handleCreateNote}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Note</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (hidden in Zen mode) */}
      {!isZenMode && (
        <div className="lg:hidden shrink-0">
          <MobileBottomNav
            activeTab={activeTab}
            theme={theme}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setMobileView('list');
            }}
            onCreateNote={handleCreateNote}
            onCycleTheme={cycleTheme}
          />
        </div>
      )}

      {/* Undo Toast Notification (6s window) */}
      {toast && (
        <Toast
          message={toast.message}
          actionLabel="Undo"
          onAction={handleUndoDelete}
          onDismiss={() => setToast(null)}
          durationMs={6000}
        />
      )}

      {/* Supabase Cloud Sync and Settings Modal (Lazy Loaded) */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SyncSettingsModal
            isOpen={isSettingsOpen}
            syncState={syncState}
            connection={connection}
            errorMessage={errorMessage}
            onClose={handleCloseSettings}
            onRefreshData={reloadDataFromDb}
          />
        </Suspense>
      )}

      {/* Keyboard Shortcuts Cheat Sheet Modal (Lazy Loaded) */}
      {isShortcutsOpen && (
        <Suspense fallback={null}>
          <ShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={handleCloseShortcuts}
          />
        </Suspense>
      )}
    </div>
  );
}
