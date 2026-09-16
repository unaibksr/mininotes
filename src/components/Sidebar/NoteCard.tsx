import React, { memo } from 'react';
import { Pin } from 'lucide-react';
import { Note, Folder, FOLDER_COLOR_MAP } from '../../types';
import { getCachedSnippet } from '../../lib/textCache';

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  folder?: Folder;
  searchQuery: string;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
}

// Utility to render search highlights
function renderHighlightedText(text: string, query: string): React.ReactNode {
  if (!query || !query.trim()) {
    return text;
  }
  const cleanQuery = query.trim().toLowerCase();
  const index = text.toLowerCase().indexOf(cleanQuery);
  if (index === -1) {
    return text;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + cleanQuery.length);
  const after = text.slice(index + cleanQuery.length);

  return (
    <>
      {before}
      <mark className="bg-amber-200 text-amber-950 dark:bg-amber-400/30 dark:text-amber-200 px-0.5 rounded-xs font-semibold">
        {match}
      </mark>
      {renderHighlightedText(after, query)}
    </>
  );
}

export const NoteCard: React.FC<NoteCardProps> = memo(
  ({
    note,
    isSelected,
    folder,
    searchQuery,
    onSelect,
    onTogglePin,
  }) => {
    const formattedTime = (() => {
      const now = Date.now();
      const diff = now - note.updatedAt;
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;

      const d = new Date(note.updatedAt);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    })();

    const snippet = getCachedSnippet(note.id, note.updatedAt, note.content);
    const folderColors = folder ? FOLDER_COLOR_MAP[folder.color] : null;

    return (
      <div className="relative overflow-hidden rounded-xl my-1.5 group select-none transition-shadow">
        {/* Main Note Card Surface */}
        <div
          onClick={() => onSelect(note.id)}
          className={`relative z-10 w-full text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
            isSelected
              ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400/80 dark:border-blue-600/70 shadow-sm ring-1 ring-blue-400/30 dark:ring-blue-500/20'
              : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
          }`}
        >
          {/* Card Top Row: Title + Pin button */}
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`font-semibold text-sm leading-snug line-clamp-1 ${
                isSelected
                  ? 'text-blue-950 dark:text-blue-200 font-bold'
                  : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {renderHighlightedText(note.title || 'Untitled Note', searchQuery)}
            </h4>

            <div className="flex items-center gap-0.5 shrink-0">
              {/* Pin / Unpin button */}
              <button
                type="button"
                onClick={(e) => onTogglePin(note.id, e)}
                aria-label={note.pinned ? 'Unpin note' : 'Pin note to top'}
                title={note.pinned ? 'Unpin note' : 'Pin note to top'}
                className={`p-1 rounded-md transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                  note.pinned
                    ? 'text-amber-500 opacity-100'
                    : 'text-slate-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                }`}
              >
                <Pin
                  className={`w-3.5 h-3.5 ${note.pinned ? 'fill-current text-amber-500' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Snippet */}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-normal">
            {snippet}
          </p>

          {/* Card Bottom Row: Timestamp + Folder badge */}
          <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/40 text-[11px] text-slate-400 dark:text-slate-500">
            <span>{formattedTime}</span>

            {folder && folderColors && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${folderColors.bg} ${folderColors.text} ${folderColors.border} border`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${folderColors.dot}`} />
                <span className="truncate max-w-[90px]">{folder.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

NoteCard.displayName = 'NoteCard';
