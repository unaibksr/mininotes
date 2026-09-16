export type FolderColor =
  | 'amber'
  | 'rose'
  | 'sky'
  | 'emerald'
  | 'violet'
  | 'orange'
  | 'teal'
  | 'pink'
  | 'indigo'
  | 'lime';

export const FOLDER_COLORS: FolderColor[] = [
  'sky',
  'indigo',
  'violet',
  'emerald',
  'teal',
  'amber',
  'orange',
  'rose',
  'pink',
  'lime',
];

export const FOLDER_COLOR_MAP: Record<
  FolderColor,
  { bg: string; text: string; dot: string; border: string; darkBg: string }
> = {
  sky: {
    bg: 'bg-sky-50',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
    border: 'border-sky-200 dark:border-sky-800',
    darkBg: 'dark:bg-sky-950/40',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700 dark:text-indigo-300',
    dot: 'bg-indigo-500',
    border: 'border-indigo-200 dark:border-indigo-800',
    darkBg: 'dark:bg-indigo-950/40',
  },
  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
    border: 'border-violet-200 dark:border-violet-800',
    darkBg: 'dark:bg-violet-950/40',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-800',
    darkBg: 'dark:bg-emerald-950/40',
  },
  teal: {
    bg: 'bg-teal-50',
    text: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500',
    border: 'border-teal-200 dark:border-teal-800',
    darkBg: 'dark:bg-teal-950/40',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-800',
    darkBg: 'dark:bg-amber-950/40',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
    border: 'border-orange-200 dark:border-orange-800',
    darkBg: 'dark:bg-orange-950/40',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    border: 'border-rose-200 dark:border-rose-800',
    darkBg: 'dark:bg-rose-950/40',
  },
  pink: {
    bg: 'bg-pink-50',
    text: 'text-pink-700 dark:text-pink-300',
    dot: 'bg-pink-500',
    border: 'border-pink-200 dark:border-pink-800',
    darkBg: 'dark:bg-pink-950/40',
  },
  lime: {
    bg: 'bg-lime-50',
    text: 'text-lime-700 dark:text-lime-300',
    dot: 'bg-lime-500',
    border: 'border-lime-200 dark:border-lime-800',
    darkBg: 'dark:bg-lime-950/40',
  },
};

export interface Note {
  id: string; // uuid
  title: string;
  content: string; // HTML
  updatedAt: number; // timestamp ms
  folderId: string | null;
  pinned: boolean;
  tags?: string[];
  color?: string | null;
  deleted?: boolean;
  synced?: boolean;
}

export interface Folder {
  id: string; // uuid
  name: string;
  color: FolderColor;
  updatedAt: number;
  deleted?: boolean;
  synced?: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type EditorFont = 'sans' | 'serif' | 'mono';

export type NoteSortOption = 'updated' | 'created' | 'alphabetical';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline' | 'unconfigured';

export interface ConnectionStatus {
  online: boolean;
  configured: boolean;
  reachable: boolean;
  lastChecked: number;
  projectRef: string | null;
}

export interface SyncCapabilities {
  foldersTable: boolean;
  noteFolderId: boolean;
  notePinned: boolean;
  folderColor: boolean;
  probed: boolean;
}
