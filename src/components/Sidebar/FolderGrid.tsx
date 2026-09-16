import React, { useState } from 'react';
import {
  Folder as FolderIcon,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Inbox,
  Check,
  X,
} from 'lucide-react';
import {
  Folder,
  FolderColor,
  FOLDER_COLORS,
  FOLDER_COLOR_MAP,
} from '../../types';

interface FolderGridProps {
  folders: Folder[];
  countsByFolder: Record<string, number>;
  totalNotesCount: number;
  unfiledNotesCount: number;
  activeFolderFilter: string | null; // null for All, 'unfiled' for Unfiled, or folder.id
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, color: FolderColor) => Promise<void>;
  onRenameFolder: (id: string, newName: string, newColor: FolderColor) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
}

export const FolderGrid: React.FC<FolderGridProps> = React.memo(({
  folders,
  countsByFolder,
  totalNotesCount,
  unfiledNotesCount,
  activeFolderFilter,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<FolderColor>('sky');

  // Edit/Rename state
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<FolderColor>('sky');

  // Delete confirm state
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  // Auto-assign first unused color
  const getFirstUnusedColor = (): FolderColor => {
    const used = new Set(folders.map((f) => f.color));
    for (const c of FOLDER_COLORS) {
      if (!used.has(c)) return c;
    }
    return FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewFolderName('');
    setNewFolderColor(getFirstUnusedColor());
  };

  const handleFinishCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) {
      setIsCreating(false);
      return;
    }
    await onCreateFolder(newFolderName.trim(), newFolderColor);
    setIsCreating(false);
    setNewFolderName('');
  };

  const handleStartEdit = (f: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(f.id);
    setEditName(f.name);
    setEditColor(f.color);
  };

  const handleFinishEdit = async (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editName.trim()) {
      await onRenameFolder(id, editName.trim(), editColor);
    }
    setEditingFolderId(null);
  };

  const handleConfirmDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onDeleteFolder(id);
    setDeletingFolderId(null);
  };

  return (
    <div className="space-y-4 p-3">
      {/* 2 / 3 / 4 col responsive grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Pseudo-card 1: All Notes */}
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={`flex flex-col justify-between p-3 rounded-xl border text-left transition duration-200 cursor-pointer ${
            activeFolderFilter === null
              ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
              : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {totalNotesCount}
            </span>
          </div>
          <div className="mt-3">
            <span className="font-semibold text-xs text-slate-900 dark:text-white">
              All Notes
            </span>
          </div>
        </button>

        {/* Pseudo-card 2: Unfiled */}
        <button
          type="button"
          onClick={() => onSelectFolder('unfiled')}
          className={`flex flex-col justify-between p-3 rounded-xl border text-left transition duration-200 cursor-pointer ${
            activeFolderFilter === 'unfiled'
              ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
              : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <Inbox className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {unfiledNotesCount}
            </span>
          </div>
          <div className="mt-3">
            <span className="font-semibold text-xs text-slate-900 dark:text-white">
              Unfiled
            </span>
          </div>
        </button>

        {/* User Folders */}
        {folders.map((f) => {
          const count = countsByFolder[f.id] || 0;
          const colorStyles = FOLDER_COLOR_MAP[f.color] || FOLDER_COLOR_MAP.sky;
          const isSelected = activeFolderFilter === f.id;
          const isEditing = editingFolderId === f.id;
          const isDeleting = deletingFolderId === f.id;

          if (isEditing) {
            return (
              <div
                key={f.id}
                className="col-span-2 p-3.5 rounded-xl border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-800 shadow-md space-y-3"
              >
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Rename Folder
                </div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  placeholder="Folder name"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-blue-500"
                />

                {/* 10-color swatch picker */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      aria-label={`Color ${c}`}
                      className={`w-5 h-5 rounded-full ${
                        FOLDER_COLOR_MAP[c].dot
                      } transition-transform cursor-pointer ${
                        editColor === c
                          ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                          : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingFolderId(null)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleFinishEdit(f.id, e)}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={f.id}
              onClick={() => onSelectFolder(f.id)}
              onDoubleClick={(e) => handleStartEdit(f, e)}
              className={`group relative flex flex-col justify-between p-3 rounded-xl border text-left transition duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              {/* Folder Header: Color dot + Count & Actions */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${colorStyles.dot}`} />
                  <FolderIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {count}
                  </span>
                </div>
              </div>

              {/* Folder Name & Hover Action Buttons */}
              <div className="mt-3 flex items-center justify-between gap-1">
                <span className="font-semibold text-xs text-slate-900 dark:text-white truncate max-w-[90px]">
                  {f.name}
                </span>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(f, e)}
                    aria-label={`Rename folder ${f.name}`}
                    title="Rename"
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingFolderId(f.id);
                    }}
                    aria-label={`Delete folder ${f.name}`}
                    title="Delete"
                    className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Delete confirmation overlay */}
              {isDeleting && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 p-2 rounded-xl flex flex-col justify-center items-center gap-2 text-center"
                >
                  <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    Delete folder?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeletingFolderId(null)}
                      className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleConfirmDelete(f.id, e)}
                      className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-semibold rounded hover:bg-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* "+ New" tile creates folder inline */}
        {!isCreating ? (
          <button
            type="button"
            onClick={handleStartCreate}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer min-h-[88px]"
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-xs font-semibold">+ New</span>
          </button>
        ) : (
          <div className="col-span-2 p-3.5 rounded-xl border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-800 shadow-md space-y-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              New Folder
            </div>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              placeholder="e.g. Work, Journal, Ideas"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishCreate();
                if (e.key === 'Escape') setIsCreating(false);
              }}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-blue-500"
            />

            {/* 10-color swatch picker */}
            <div>
              <span className="text-[10px] font-medium text-slate-400 mb-1 block">
                Select Color:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewFolderColor(c)}
                    aria-label={`Color ${c}`}
                    className={`w-5 h-5 rounded-full ${
                      FOLDER_COLOR_MAP[c].dot
                    } transition-transform cursor-pointer ${
                      newFolderColor === c
                        ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                        : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleFinishCreate()}
                className="px-3 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

FolderGrid.displayName = 'FolderGrid';
