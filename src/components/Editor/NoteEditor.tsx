import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Note, Folder, SyncState, EditorFont } from '../../types';
import { EditorHeader } from './EditorHeader';
import { BubbleToolbar } from './BubbleToolbar';
import { setActiveEditingNote } from '../../lib/supabase';
import { Clock, BookOpen, Minimize2, Wand2, Check } from 'lucide-react';
import {
  looksLikeMarkdown,
  markdownToHtml,
  autoConvertMarkdownInHtml,
  removeExcessBlankLines,
} from '../../lib/markdownUtils';

interface NoteEditorProps {
  note: Note;
  folders: Folder[];
  syncState: SyncState;
  font: EditorFont;
  isZenMode: boolean;
  isFullscreen: boolean;
  onSaveNote: (updated: Note) => Promise<void>;
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
  onBack: () => void;
  onToggleZenMode: () => void;
  onToggleFullscreen: () => void;
  onChangeFont: (font: EditorFont) => void;
  onOpenShortcuts: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  folders,
  syncState,
  font,
  isZenMode,
  isFullscreen,
  onSaveNote,
  onDeleteNote,
  onDuplicateNote,
  onBack,
  onToggleZenMode,
  onToggleFullscreen,
  onChangeFont,
  onOpenShortcuts,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [convertedToast, setConvertedToast] = useState(false);
  const [cleanLinesToast, setCleanLinesToast] = useState(false);
  const [noExtraLinesToast, setNoExtraLinesToast] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Keep latest note values in refs to avoid stale closures during debounced save
  const currentNoteRef = useRef<Note>(note);
  currentNoteRef.current = note;

  const currentTitleRef = useRef<string>(note.title);
  const currentContentRef = useRef<string>(note.content);

  // Sync refs when active note changes
  useEffect(() => {
    currentTitleRef.current = note.title;
    currentContentRef.current = note.content;
    if (titleInputRef.current) {
      titleInputRef.current.value = note.title;
    }
  }, [note.id, note.title, note.content]);

  // Handle active editing note flag for conflict protection
  useEffect(() => {
    setActiveEditingNote(note.id, false);
    return () => {
      setActiveEditingNote(null, false);
    };
  }, [note.id]);

  // Debounced save function (optimized: avoids repeated React re-renders while typing)
  const triggerDebouncedSave = useCallback(() => {
    if (!isSavingRef.current) {
      isSavingRef.current = true;
      setIsSaving(true);
      setActiveEditingNote(note.id, true);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const updatedNote: Note = {
        ...currentNoteRef.current,
        title: currentTitleRef.current,
        content: currentContentRef.current,
        updatedAt: Date.now(),
        synced: false,
      };

      try {
        await onSaveNote(updatedNote);
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
        setActiveEditingNote(note.id, false);
      }
    }, 600); // 600ms responsive debounce
  }, [note.id, onSaveNote]);

  // Clean up debounce on unmount or note switch; flush any pending edit immediately
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        const updatedNote: Note = {
          ...currentNoteRef.current,
          title: currentTitleRef.current,
          content: currentContentRef.current,
          updatedAt: Date.now(),
          synced: false,
        };
        onSaveNote(updatedNote);
        isSavingRef.current = false;
        setActiveEditingNote(note.id, false);
      }
    };
  }, [note.id, onSaveNote]);

  // Configure Tiptap editor with rich input rules and automatic markdown paste converter
  const editor = useEditor(
    {
      editable: !isZenMode,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
          bulletList: {
            keepMarks: true,
          },
          orderedList: {
            keepMarks: true,
          },
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Placeholder.configure({
          placeholder: 'Start typing thoughts here (supports markdown shortcuts like # or -)...',
          emptyEditorClass: 'is-editor-empty',
        }),
      ],
      content: note.content,
      editorProps: {
        attributes: {
          class:
            'focus:outline-none min-h-[400px] text-slate-800 dark:text-slate-100 text-base leading-relaxed',
        },
        // Automatically convert pasted Markdown into beautiful formatted HTML nodes
        handlePaste: (_view, event) => {
          const text = event.clipboardData?.getData('text/plain');
          if (text && looksLikeMarkdown(text)) {
            event.preventDefault();
            const html = markdownToHtml(text);
            editor?.commands.insertContent(html);
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        currentContentRef.current = html;
        triggerDebouncedSave();
      },
    },
    [note.id]
  );

  // Synchronize editable state when entering or exiting Zen Mode
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isZenMode);
    }
  }, [editor, isZenMode]);

  // Update editor content when note changes from external source or switch
  useEffect(() => {
    if (editor && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content, { emitUpdate: false });
    }
  }, [editor, note.id, note.content]);

  // Manual or one-click conversion of markdown in editor to beautiful text
  const handleConvertMarkdown = useCallback(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const converted = autoConvertMarkdownInHtml(currentHtml);

    if (converted !== currentHtml) {
      editor.commands.setContent(converted, { emitUpdate: true });
      currentContentRef.current = converted;
      triggerDebouncedSave();
      setConvertedToast(true);
      setTimeout(() => setConvertedToast(false), 2500);
    } else {
      const text = editor.getText();
      if (looksLikeMarkdown(text)) {
        const parsed = markdownToHtml(text);
        editor.commands.setContent(parsed, { emitUpdate: true });
        currentContentRef.current = parsed;
        triggerDebouncedSave();
        setConvertedToast(true);
        setTimeout(() => setConvertedToast(false), 2500);
      }
    }
  }, [editor, triggerDebouncedSave]);

  // Clean excessive blank lines (leaves at most 1 blank line between texts)
  const handleCleanBlankLines = useCallback(() => {
    if (!editor || isZenMode) return;
    const currentHtml = editor.getHTML();
    const cleaned = removeExcessBlankLines(currentHtml);

    if (cleaned !== currentHtml) {
      editor.commands.setContent(cleaned, { emitUpdate: true });
      currentContentRef.current = cleaned;
      triggerDebouncedSave();
      setCleanLinesToast(true);
      setTimeout(() => setCleanLinesToast(false), 2500);
    } else {
      const text = editor.getText();
      if (/\n{3,}/.test(text)) {
        const cleanedText = text.replace(/\n{3,}/g, '\n\n');
        editor.commands.setContent(cleanedText, { emitUpdate: true });
        currentContentRef.current = editor.getHTML();
        triggerDebouncedSave();
        setCleanLinesToast(true);
        setTimeout(() => setCleanLinesToast(false), 2500);
      } else {
        setNoExtraLinesToast(true);
        setTimeout(() => setNoExtraLinesToast(false), 2000);
      }
    }
  }, [editor, isZenMode, triggerDebouncedSave]);

  // Detect whether note has unrendered raw markdown tokens
  const hasRawMarkdown = useMemo(() => {
    if (!note.content) return false;
    const plain = note.content.replace(/<[^>]+>/g, ' ');
    return looksLikeMarkdown(plain);
  }, [note.content]);

  // Title change handler
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    currentTitleRef.current = e.target.value;
    triggerDebouncedSave();
  };

  // Move to folder
  const handleMoveToFolder = async (folderId: string | null) => {
    const updated: Note = {
      ...note,
      folderId,
      updatedAt: Date.now(),
      synced: false,
    };
    await onSaveNote(updated);
  };

  // Toggle pin
  const handleTogglePin = async () => {
    const updated: Note = {
      ...note,
      pinned: !note.pinned,
      updatedAt: Date.now(),
      synced: false,
    };
    await onSaveNote(updated);
  };

  // Duplicate note
  const handleDuplicate = () => {
    onDuplicateNote(note);
  };

  // Delete note
  const handleDelete = () => {
    onDeleteNote(note.id);
  };

  // Compute word, character count, and estimated reading time
  const stats = useMemo(() => {
    if (!editor) return { words: 0, chars: 0, readingTimeMinutes: 1 };
    const text = editor.getText();
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTimeMinutes };
  }, [editor, note.content]);

  const formattedDate = useMemo(() => {
    const d = new Date(note.updatedAt);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [note.updatedAt]);

  const fontClass =
    font === 'serif'
      ? 'font-serif-editor'
      : font === 'mono'
      ? 'font-mono-editor'
      : 'font-sans-editor';

  return (
    <main
      id="note-editor-container"
      className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] relative transition-colors"
    >
      {/* 1. Header Toolbar: OUTSIDE the scroll area */}
      <EditorHeader
        note={note}
        folders={folders}
        editor={editor}
        syncState={syncState}
        isSaving={isSaving}
        isZenMode={isZenMode}
        isFullscreen={isFullscreen}
        font={font}
        onBack={onBack}
        onTogglePin={handleTogglePin}
        onMoveToFolder={handleMoveToFolder}
        onCopyToFolder={handleDuplicate}
        onDeleteNote={handleDelete}
        onToggleZenMode={onToggleZenMode}
        onToggleFullscreen={onToggleFullscreen}
        onConvertMarkdown={handleConvertMarkdown}
        onCleanBlankLines={handleCleanBlankLines}
        onChangeFont={onChangeFont}
        onOpenShortcuts={onOpenShortcuts}
      />

      {/* 2. Floating Bubble Menu on text selection */}
      <BubbleToolbar editor={editor} />

      {/* Floating Zen Mode Exit Pill (when in Zen mode) */}
      {isZenMode && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/70 text-slate-200 dark:bg-slate-800/70 text-xs font-medium backdrop-blur-md border border-slate-700/50 shadow-md">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Zen Mode (Read-only)
          </span>
          <button
            type="button"
            onClick={onToggleZenMode}
            aria-label="Exit Zen Mode"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white dark:bg-slate-800/90 dark:hover:bg-slate-700 text-xs font-semibold backdrop-blur-md shadow-lg transition-all cursor-pointer border border-slate-700/50"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Zen Mode (Esc)</span>
          </button>
        </div>
      )}

      {/* Feedback Toast on Markdown Conversion */}
      {convertedToast && (
        <div className="fixed bottom-16 right-6 z-50 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>Converted Markdown into beautiful rich text!</span>
        </div>
      )}

      {/* Feedback Toast on Cleaning Excess Blank Lines */}
      {cleanLinesToast && (
        <div className="fixed bottom-16 right-6 z-50 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>Removed extra blank lines (kept max 1 blank line between texts)</span>
        </div>
      )}

      {noExtraLinesToast && (
        <div className="fixed bottom-16 right-6 z-50 px-3.5 py-2 rounded-xl bg-slate-800 text-white text-xs font-medium shadow-lg flex items-center gap-2">
          <span>No extra blank lines found. Spacing is already clean!</span>
        </div>
      )}

      {/* 3. Sibling Scrollable Canvas: centered editor canvas max-w-3xl mx-auto */}
      <div className={`flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 ${fontClass}`}>
        <div className="max-w-3xl mx-auto flex flex-col min-h-full">
          {/* Note Title Input with direct DOM write performance pattern */}
          <div className="mb-2">
            <input
              ref={titleInputRef}
              type="text"
              defaultValue={note.title}
              onChange={handleTitleChange}
              placeholder="Note Title"
              aria-label="Note Title"
              disabled={isZenMode}
              readOnly={isZenMode}
              className={`w-full text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white placeholder:text-slate-400/80 dark:placeholder:text-slate-600 bg-transparent border-none outline-none py-1 transition-all ${
                isZenMode ? 'cursor-default select-text' : 'focus:ring-0 focus-visible:outline-none'
              }`}
            />
          </div>

          {/* Folder badge (if assigned to a folder) */}
          {note.folderId && (
            <div className="mb-4 flex items-center gap-2 flex-wrap text-xs">
              {(() => {
                const folder = folders.find((f) => f.id === note.folderId);
                if (!folder) return null;
                return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    📁 {folder.name}
                  </span>
                );
              })()}
            </div>
          )}

          {/* Markdown Auto-Conversion Banner if raw markdown syntax is present (editing mode only) */}
          {!isZenMode && hasRawMarkdown && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between gap-2 text-xs text-indigo-900 dark:text-indigo-200">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-medium">Raw Markdown detected in this note</span>
              </div>
              <button
                type="button"
                onClick={handleConvertMarkdown}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition cursor-pointer shrink-0"
              >
                Convert to Beautiful Text
              </button>
            </div>
          )}

          {/* Tiptap Rich-Text Editor Content */}
          <div
            className={`flex-1 pb-12 ${isZenMode ? 'cursor-default select-text' : 'cursor-text'}`}
            onClick={() => {
              if (!isZenMode && editor && !editor.isFocused) {
                editor.commands.focus();
              }
            }}
          >
            <EditorContent editor={editor} />
          </div>

          {/* Footer with stats, reading time, and timestamp */}
          <footer className="mt-auto pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 dark:text-slate-500 select-none pb-8 sm:pb-4 gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span>{stats.words} words</span>
              <span>•</span>
              <span>{stats.chars} characters</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-slate-400" />
                <span>{stats.readingTimeMinutes} min read</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Updated {formattedDate}</span>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
};
