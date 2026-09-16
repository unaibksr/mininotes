import React from 'react';
import {
  ArrowLeft,
  Pin,
  Copy,
  Trash2,
  Folder as FolderIcon,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  ListOrdered,
  List,
  Check,
  RefreshCw,
  Cloud,
  CloudOff,
  Maximize2,
  Minimize2,
  Maximize,
  Minimize,
  Wand2,
  HelpCircle,
  Undo2,
  Redo2,
  FoldVertical,
} from 'lucide-react';
import { Editor } from '@tiptap/react';
import { Note, Folder, SyncState, EditorFont } from '../../types';
import { ExportMenu } from './ExportMenu';

interface EditorHeaderProps {
  note: Note;
  folders: Folder[];
  editor: Editor | null;
  syncState: SyncState;
  isSaving: boolean;
  isZenMode: boolean;
  isFullscreen: boolean;
  font: EditorFont;
  onBack: () => void;
  onTogglePin: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onCopyToFolder: () => void;
  onDeleteNote: () => void;
  onToggleZenMode: () => void;
  onToggleFullscreen: () => void;
  onConvertMarkdown: () => void;
  onCleanBlankLines: () => void;
  onChangeFont: (font: EditorFont) => void;
  onOpenShortcuts: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = React.memo(({
  note,
  folders,
  editor,
  syncState,
  isSaving,
  isZenMode,
  isFullscreen,
  font,
  onBack,
  onTogglePin,
  onMoveToFolder,
  onCopyToFolder,
  onDeleteNote,
  onToggleZenMode,
  onToggleFullscreen,
  onConvertMarkdown,
  onCleanBlankLines,
  onChangeFont,
  onOpenShortcuts,
}) => {
  return (
    <header
      id="editor-top-toolbar"
      className={`shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 z-20 transition-all ${
        isZenMode ? 'opacity-30 hover:opacity-100' : ''
      }`}
    >
      {/* Left side: Back button (desktop + mobile), Save/Sync status, Folder select */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Back button: Visible on all screens */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to notes list"
          title="Back to notes list (Esc)"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold shadow-2xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Sync & Save status announced politely */}
        <div
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium px-2 py-1 rounded-md bg-slate-100/80 dark:bg-slate-800/80"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Saving...</span>
            </>
          ) : syncState === 'syncing' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Syncing...</span>
            </>
          ) : syncState === 'offline' ? (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-500" />
              <span>Saved offline</span>
            </>
          ) : syncState === 'synced' ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-500" />
              <span>Synced</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Saved locally</span>
            </>
          )}
        </div>

        {/* Native <select> for Move note to folder */}
        <div className="flex items-center gap-1.5 text-xs">
          <FolderIcon className="w-3.5 h-3.5 text-slate-400 hidden sm:inline-block" />
          <label htmlFor="folder-picker-select" className="sr-only">
            Move to folder
          </label>
          <select
            id="folder-picker-select"
            value={note.folderId || ''}
            onChange={(e) => onMoveToFolder(e.target.value ? e.target.value : null)}
            aria-label="Move note to folder"
            className="text-xs font-medium py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 cursor-pointer shadow-2xs"
          >
            <option value="">Unfiled (No folder)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                📁 {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center/Right: Quick formatting buttons + Fullscreen + Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
        {/* Undo & Redo Action Buttons */}
        {editor && (
          <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-0.5">
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo() || isZenMode}
              aria-label="Undo"
              title="Undo (Ctrl+Z / ⌘Z)"
              className={`p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center gap-1 text-xs font-semibold ${
                !editor.can().undo() || isZenMode
                  ? 'opacity-35 cursor-not-allowed text-slate-400 dark:text-slate-600'
                  : 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo() || isZenMode}
              aria-label="Redo"
              title="Redo (Ctrl+Y / ⇧⌘Z)"
              className={`p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center text-xs font-semibold ${
                !editor.can().redo() || isZenMode
                  ? 'opacity-35 cursor-not-allowed text-slate-400 dark:text-slate-600'
                  : 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Editor Alignment & Format toggles */}
        {editor && (
          <div className="hidden md:flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              aria-label="Align text left"
              className={`p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 dark:bg-slate-700 text-blue-600' : ''
              }`}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              aria-label="Align text center"
              className={`p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 dark:bg-slate-700 text-blue-600' : ''
              }`}
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              aria-label="Align text justify"
              className={`p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-200 dark:bg-slate-700 text-blue-600' : ''
              }`}
            >
              <AlignJustify className="w-4 h-4" />
            </button>

            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              aria-label="Heading 1"
              className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-sky-300'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              aria-label="Heading 2"
              className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-violet-300'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              aria-label="Heading 3"
              className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                editor.isActive('heading', { level: 3 })
                  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label="Numbered list"
              className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                editor.isActive('orderedList')
                  ? 'bg-slate-200 dark:bg-slate-700 text-blue-600'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              aria-label="Bullet list"
              className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                editor.isActive('bulletList')
                  ? 'bg-slate-200 dark:bg-slate-700 text-blue-600'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              aria-label="Blockquote"
              className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                editor.isActive('blockquote')
                  ? 'bg-slate-200 dark:bg-slate-700 text-blue-600'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              aria-label="Code block"
              className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                editor.isActive('codeBlock')
                  ? 'bg-slate-200 dark:bg-slate-700 text-blue-600'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Code className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Convert Markdown into Beautiful Text Action */}
        <button
          type="button"
          onClick={onConvertMarkdown}
          disabled={isZenMode}
          aria-label="Convert Markdown syntax into beautiful formatted text"
          title="Convert Markdown to beautiful rich text"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Format Markdown</span>
        </button>

        {/* Remove Excess Blank Lines Action */}
        <button
          type="button"
          onClick={onCleanBlankLines}
          disabled={isZenMode}
          aria-label="Remove excess blank lines"
          title="Remove more than 1 blank line between texts"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <FoldVertical className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Clean Lines</span>
        </button>

        {/* Font Switcher (Sans / Serif / Mono) */}
        <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100/80 dark:bg-slate-800/80 text-xs">
          <button
            type="button"
            onClick={() => onChangeFont('sans')}
            title="Modern Sans Font"
            className={`px-2 py-0.5 rounded-md transition font-sans ${
              font === 'sans'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-semibold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sans
          </button>
          <button
            type="button"
            onClick={() => onChangeFont('serif')}
            title="Editorial Serif Font"
            className={`px-2 py-0.5 rounded-md transition font-serif ${
              font === 'serif'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-semibold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Serif
          </button>
          <button
            type="button"
            onClick={() => onChangeFont('mono')}
            title="Technical Monospace Font"
            className={`px-2 py-0.5 rounded-md transition font-mono ${
              font === 'mono'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-semibold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Mono
          </button>
        </div>

        {/* Full Screen Button */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          title={isFullscreen ? 'Exit Full Screen (F11/Esc)' : 'Full Screen (F11)'}
          className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer border shadow-2xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
            isFullscreen
              ? 'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
              : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Full</span>
            </>
          ) : (
            <>
              <Maximize className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Full Screen</span>
            </>
          )}
        </button>

        {/* Zen / Focus Mode Toggle */}
        <button
          type="button"
          onClick={onToggleZenMode}
          aria-label={isZenMode ? 'Exit Zen Mode (Esc)' : 'Zen Mode'}
          title={isZenMode ? 'Exit Zen Mode (Esc)' : 'Zen / Focus Mode (Cmd+Shift+F)'}
          className={`p-1.5 rounded-lg transition text-xs font-medium inline-flex items-center gap-1 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
            isZenMode
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Export / Share Dropdown */}
        <ExportMenu note={note} />

        {/* Copy Note to duplicate */}
        <button
          type="button"
          onClick={onCopyToFolder}
          aria-label="Duplicate note"
          title="Duplicate note"
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-medium inline-flex items-center cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <Copy className="w-4 h-4" />
        </button>

        {/* Pin / Unpin Toggle */}
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={note.pinned ? 'Unpin note' : 'Pin note to top'}
          title={note.pinned ? 'Unpin note' : 'Pin note to top'}
          className={`p-1.5 rounded-lg transition text-xs font-medium inline-flex items-center gap-1 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
            note.pinned
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Pin className={`w-4 h-4 ${note.pinned ? 'fill-current' : ''}`} />
        </button>

        {/* Delete Note */}
        <button
          type="button"
          onClick={onDeleteNote}
          aria-label="Delete note"
          title="Delete note"
          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Keyboard Shortcuts Helper */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          aria-label="Keyboard Shortcuts"
          title="Keyboard Shortcuts (?)"
          className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
});

EditorHeader.displayName = 'EditorHeader';
