import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Note, Folder, SyncCapabilities, SyncState, ConnectionStatus } from '../types';
import {
  getAllNotesIncludingDeleted,
  getAllFoldersIncludingDeleted,
  putNotesBatch,
  putFoldersBatch,
  markNotesAsSynced,
  markFoldersAsSynced,
  getAllTombstones,
  isTombstoned,
} from './db';

const STORAGE_KEY_CONFIG = 'minimalist_notes_supabase_config';
const STORAGE_KEY_LAST_SYNC = 'minimalist_notes_last_sync_timestamp';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedConfig: SupabaseConfig | null = null;

export function getSavedSupabaseConfig(): SupabaseConfig {
  if (cachedConfig) return cachedConfig;

  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        cachedConfig = parsed;
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }

  cachedConfig = { url: envUrl, anonKey: envKey };
  return cachedConfig;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  cachedConfig = config;
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  // Reset client instance
  clientInstance = null;
  capabilities = {
    foldersTable: false,
    noteFolderId: false,
    notePinned: false,
    folderColor: false,
    probed: false,
  };
  // Force a fresh connection probe on next verifyConnection().
  connectionStatus = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    configured: !!(config.url && config.anonKey),
    reachable: false,
    lastChecked: 0,
    projectRef: extractProjectRef(config.url || ''),
  };
  for (const fn of connectionListeners) {
    try {
      fn(connectionStatus);
    } catch (e) {
      // ignore
    }
  }
}

let clientInstance: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (clientInstance) return clientInstance;
  const config = getSavedSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  try {
    clientInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return clientInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Capabilities cache
let capabilities: SyncCapabilities = {
  foldersTable: false,
  noteFolderId: false,
  notePinned: false,
  folderColor: false,
  probed: false,
};

export function getCapabilities(): SyncCapabilities {
  return capabilities;
}

// ---------------- CONNECTION STATUS ----------------

let connectionStatus: ConnectionStatus = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  configured: false,
  reachable: false,
  lastChecked: 0,
  projectRef: null,
};

export function getConnectionStatus(): ConnectionStatus {
  return { ...connectionStatus };
}

function extractProjectRef(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const m = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/**
 * Verifies the Supabase connection is properly configured AND reachable.
 * - Updates internal cache
 * - Notifies connection-status listeners
 */
export async function verifyConnection(): Promise<ConnectionStatus> {
  const config = getSavedSupabaseConfig();
  const isBrowserOnline =
    typeof navigator === 'undefined' ? true : navigator.onLine;
  const configured = !!(config.url && config.anonKey);
  const projectRef = configured ? extractProjectRef(config.url) : null;

  let reachable = false;
  if (configured && isBrowserOnline) {
    try {
      // Probe Supabase REST root with the anon key. A 200/401/403 = reachable.
      // We use a short timeout so the UI doesn't hang on bad config.
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(config.url + '/rest/v1/', {
        method: 'GET',
        headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}` },
        signal: controller.signal,
      });
      clearTimeout(t);
      // Any HTTP response means we reached the server.
      reachable = res.status >= 200 && res.status < 500;
    } catch {
      reachable = false;
    }
  }

  connectionStatus = {
    online: isBrowserOnline,
    configured,
    reachable,
    lastChecked: Date.now(),
    projectRef,
  };

  for (const fn of connectionListeners) {
    try {
      fn(connectionStatus);
    } catch (e) {
      // ignore
    }
  }

  return { ...connectionStatus };
}

type ConnectionListener = (status: ConnectionStatus) => void;
const connectionListeners = new Set<ConnectionListener>();

export function onConnectionStatusChange(fn: ConnectionListener): () => void {
  connectionListeners.add(fn);
  return () => connectionListeners.delete(fn);
}

/**
 * Capability detection at startup:
 * Probes folders table, notes.folder_id, notes.pinned, folders.color.
 * Only include columns in upsert/select if the probe succeeds.
 */
export async function probeCapabilities(supabase: SupabaseClient): Promise<SyncCapabilities> {
  const caps: SyncCapabilities = {
    foldersTable: false,
    noteFolderId: false,
    notePinned: false,
    folderColor: false,
    probed: true,
  };

  try {
    // 1. Probe folders table & color column
    const { data: folderData, error: folderErr } = await supabase
      .from('folders')
      .select('id, color')
      .limit(1);

    if (!folderErr) {
      caps.foldersTable = true;
      caps.folderColor = true;
    } else if (folderErr.code === '42703') {
      // column does not exist, but table might
      caps.foldersTable = true;
      caps.folderColor = false;
    } else {
      caps.foldersTable = false;
    }
  } catch (e) {
    caps.foldersTable = false;
  }

  try {
    // 2. Probe notes columns (folder_id, pinned)
    const { error: noteColErr } = await supabase
      .from('notes')
      .select('id, folder_id, pinned')
      .limit(1);

    if (!noteColErr) {
      caps.noteFolderId = true;
      caps.notePinned = true;
    } else if (noteColErr.code === '42703') {
      // Try individually
      const { error: fidErr } = await supabase.from('notes').select('folder_id').limit(1);
      caps.noteFolderId = !fidErr;
      const { error: pinErr } = await supabase.from('notes').select('pinned').limit(1);
      caps.notePinned = !pinErr;
    } else {
      caps.noteFolderId = false;
      caps.notePinned = false;
    }
  } catch (e) {
    caps.noteFolderId = false;
    caps.notePinned = false;
  }

  capabilities = caps;
  return caps;
}

// ---------------- SERIALIZED & COALESCED SYNC ENGINE ----------------

let isSyncInProgress = false;
let isSyncPending = false;
let activeEditingNoteId: string | null = null;
let unsavedNoteIds = new Set<string>();

export function setActiveEditingNote(noteId: string | null, isDirty: boolean): void {
  activeEditingNoteId = noteId;
  if (noteId) {
    if (isDirty) {
      unsavedNoteIds.add(noteId);
    } else {
      unsavedNoteIds.delete(noteId);
    }
  }
}

type SyncListener = (state: SyncState, message?: string) => void;
type DataChangeListener = () => void;

const syncListeners = new Set<SyncListener>();
const dataChangeListeners = new Set<DataChangeListener>();

export function onSyncStatusChange(fn: SyncListener): () => void {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
}

export function onRemoteDataChange(fn: DataChangeListener): () => void {
  dataChangeListeners.add(fn);
  return () => dataChangeListeners.delete(fn);
}

function notifySyncStatus(state: SyncState, msg?: string) {
  for (const fn of syncListeners) {
    try {
      fn(state, msg);
    } catch (e) {
      // ignore
    }
  }
}

function notifyDataChanged() {
  for (const fn of dataChangeListeners) {
    try {
      fn();
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Coalesced and serialized sync runner
 */
export async function triggerSync(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    notifySyncStatus('unconfigured');
    return;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    notifySyncStatus('offline');
    return;
  }

  if (isSyncInProgress) {
    isSyncPending = true;
    return;
  }

  isSyncInProgress = true;
  notifySyncStatus('syncing');

  try {
    if (!capabilities.probed) {
      await probeCapabilities(supabase);
    }

    const lastSync = Number(localStorage.getItem(STORAGE_KEY_LAST_SYNC) || '0');
    const syncStartTime = Date.now();

    // 1. PULL PHASE (Remote -> Local)
    // Notes: updated_at > lastSync
    const noteSelectCols = ['id', 'title', 'content', 'updated_at'];
    if (capabilities.noteFolderId) noteSelectCols.push('folder_id');
    if (capabilities.notePinned) noteSelectCols.push('pinned');
    noteSelectCols.push('color');

    const { data: remoteNotesRaw, error: notesPullErr } = (await supabase
      .from('notes')
      .select(noteSelectCols.join(','))
      .gt('updated_at', lastSync)) as { data: any[] | null; error: any };

    if (notesPullErr) {
      throw notesPullErr;
    }
    const remoteNotes: any[] = remoteNotesRaw || [];

    // Folders: updated_at > lastSync (if folders table exists)
    let remoteFolders: any[] = [];
    if (capabilities.foldersTable) {
      const folderSelectCols = ['id', 'name', 'updated_at'];
      if (capabilities.folderColor) folderSelectCols.push('color');

      const { data: fData, error: folderPullErr } = (await supabase
        .from('folders')
        .select(folderSelectCols.join(','))
        .gt('updated_at', lastSync)) as { data: any[] | null; error: any };

      if (folderPullErr) {
        throw folderPullErr;
      }
      remoteFolders = fData || [];
    }

    // Process pull with Last-Write-Wins and protect local unsaved rows
    const allLocalNotes = await getAllNotesIncludingDeleted();
    const localNoteMap = new Map(allLocalNotes.map((n) => [n.id, n]));
    const tombstones = await getAllTombstones();
    const tombstonedNoteIds = new Set(
      tombstones.filter((t) => t.type === 'note').map((t) => t.id.split(':')[1])
    );

    const notesToUpdateLocally: Note[] = [];
    if (remoteNotes && remoteNotes.length > 0) {
      for (const rNote of remoteNotes) {
        // Never resurrect a note the user deleted on this device.
        if (tombstonedNoteIds.has(rNote.id)) {
          continue;
        }
        const local = localNoteMap.get(rNote.id);
        const rUpdatedAt = Number(rNote.updated_at || 0);

        // If local is currently being edited or has unsaved edits, do NOT clobber
        if (unsavedNoteIds.has(rNote.id) || (activeEditingNoteId === rNote.id && local && !local.synced)) {
          continue;
        }

        // If local exists and local updatedAt >= remote, local wins
        if (local && local.updatedAt >= rUpdatedAt) {
          continue;
        }

        // Remote wins
        const updatedLocalNote: Note = {
          id: rNote.id,
          title: rNote.title || '',
          content: rNote.content || '',
          updatedAt: rUpdatedAt,
          folderId: rNote.folder_id || null,
          pinned: !!rNote.pinned,
          tags: local ? local.tags : [],
          color: rNote.color || null,
          deleted: false,
          synced: true,
        };
        notesToUpdateLocally.push(updatedLocalNote);
      }
    }

    if (notesToUpdateLocally.length > 0) {
      await putNotesBatch(notesToUpdateLocally);
      notifyDataChanged();
    }

    // Process remote folders
    const allLocalFolders = await getAllFoldersIncludingDeleted();
    const localFolderMap = new Map(allLocalFolders.map((f) => [f.id, f]));
    const foldersToUpdateLocally: Folder[] = [];

    if (remoteFolders && remoteFolders.length > 0) {
      const tombstonedFolderIds = new Set(
        tombstones.filter((t) => t.type === 'folder').map((t) => t.id.split(':')[1])
      );
      for (const rFolder of remoteFolders) {
        // Never resurrect a folder the user deleted on this device.
        if (tombstonedFolderIds.has(rFolder.id)) continue;
        const local = localFolderMap.get(rFolder.id);
        const rUpdatedAt = Number(rFolder.updated_at || 0);
        if (local && local.updatedAt >= rUpdatedAt) continue;
        foldersToUpdateLocally.push({
          id: rFolder.id,
          name: rFolder.name || 'Untitled',
          color: rFolder.color || 'sky',
          updatedAt: rUpdatedAt,
          deleted: false,
          synced: true,
        });
      }
    }

    if (foldersToUpdateLocally.length > 0) {
      await putFoldersBatch(foldersToUpdateLocally);
      notifyDataChanged();
    }

    // 2. PUSH PHASE (Local -> Remote)
    // Gather unsynced items
    const reloadedNotes = await getAllNotesIncludingDeleted();
    const unsyncedNotes = reloadedNotes.filter((n) => !n.synced);

    const successfulSyncedNoteIds: string[] = [];
    for (const note of unsyncedNotes) {
      if (note.deleted) {
        // Soft-deleted note -> delete in Supabase
        const { error: delErr } = await supabase.from('notes').delete().eq('id', note.id);
        if (!delErr) {
          successfulSyncedNoteIds.push(note.id);
        }
      } else {
        // Active note -> upsert
        const payload: Record<string, any> = {
          id: note.id,
          title: note.title,
          content: note.content,
          updated_at: note.updatedAt,
        };
        if (capabilities.noteFolderId) payload.folder_id = note.folderId;
        if (capabilities.notePinned) payload.pinned = note.pinned;
        if (note.color !== undefined) payload.color = note.color;

        const { error: upsertErr } = await supabase.from('notes').upsert(payload, {
          onConflict: 'id',
        });
        if (!upsertErr) {
          successfulSyncedNoteIds.push(note.id);
        }
      }
    }

    if (successfulSyncedNoteIds.length > 0) {
      await markNotesAsSynced(successfulSyncedNoteIds);
    }

    // Folders push
    if (capabilities.foldersTable) {
      const reloadedFolders = await getAllFoldersIncludingDeleted();
      const unsyncedFolders = reloadedFolders.filter((f) => !f.synced);
      const successfulSyncedFolderIds: string[] = [];

      for (const folder of unsyncedFolders) {
        if (folder.deleted) {
          const { error: delErr } = await supabase.from('folders').delete().eq('id', folder.id);
          if (!delErr) {
            successfulSyncedFolderIds.push(folder.id);
          }
        } else {
          const payload: Record<string, any> = {
            id: folder.id,
            name: folder.name,
            updated_at: folder.updatedAt,
          };
          if (capabilities.folderColor) payload.color = folder.color;

          const { error: upsertErr } = await supabase.from('folders').upsert(payload, {
            onConflict: 'id',
          });
          if (!upsertErr) {
            successfulSyncedFolderIds.push(folder.id);
          }
        }
      }

      if (successfulSyncedFolderIds.length > 0) {
        await markFoldersAsSynced(successfulSyncedFolderIds);
      }
    }

    localStorage.setItem(STORAGE_KEY_LAST_SYNC, syncStartTime.toString());
    notifySyncStatus('synced');
    // Refresh connection status so the UI shows "Online" with a real reachability probe.
    void verifyConnection();
  } catch (err: any) {
    console.error('Cloud Sync error:', err);
    notifySyncStatus('error', err?.message || 'Sync failed');
    // Re-probe connection so the UI can show the actual reachability state.
    void verifyConnection();
  } finally {
    isSyncInProgress = false;
    if (isSyncPending) {
      isSyncPending = false;
      // Trigger trailing sync
      setTimeout(() => {
        triggerSync();
      }, 100);
    }
  }
}

/**
 * Sets up Supabase Realtime subscription
 */
export function setupRealtimeSubscription(): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  try {
    realtimeChannel = supabase
      .channel('public_notes_and_folders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        async (payload) => {
          const record = (payload.new || payload.old) as any;
          if (!record || !record.id) return;

          // Skip incoming events if currently editing this note with unsaved changes
          if (unsavedNoteIds.has(record.id) || activeEditingNoteId === record.id) {
            return;
          }

          // Never resurrect a note the user deleted on this device.
          if (await isTombstoned('note', record.id)) {
            return;
          }

          if (payload.eventType === 'DELETE') {
            const all = await getAllNotesIncludingDeleted();
            const existing = all.find((n) => n.id === record.id);
            if (existing) {
              await markNotesAsSynced([record.id]);
              notifyDataChanged();
            }
          } else {
            // INSERT or UPDATE
            const rUpdatedAt = Number(record.updated_at || 0);
            const all = await getAllNotesIncludingDeleted();
            const existing = all.find((n) => n.id === record.id);

            if (!existing || existing.updatedAt < rUpdatedAt) {
              const newNote: Note = {
                id: record.id,
                title: record.title || '',
                content: record.content || '',
                updatedAt: rUpdatedAt,
                folderId: record.folder_id || null,
                pinned: !!record.pinned,
                tags: existing ? existing.tags : [],
                color: record.color || null,
                deleted: false,
                synced: true,
              };
              await putNotesBatch([newNote]);
              notifyDataChanged();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'folders' },
        async (payload) => {
          const record = (payload.new || payload.old) as any;
          if (!record || !record.id) return;

          // Never resurrect a folder the user deleted on this device.
          if (await isTombstoned('folder', record.id)) {
            return;
          }

          if (payload.eventType === 'DELETE') {
            const all = await getAllFoldersIncludingDeleted();
            const existing = all.find((f) => f.id === record.id);
            if (existing) {
              await markFoldersAsSynced([record.id]);
              notifyDataChanged();
            }
          } else {
            const rUpdatedAt = Number(record.updated_at || 0);
            const all = await getAllFoldersIncludingDeleted();
            const existing = all.find((f) => f.id === record.id);

            if (!existing || existing.updatedAt < rUpdatedAt) {
              const newFolder: Folder = {
                id: record.id,
                name: record.name || 'Untitled',
                color: record.color || 'sky',
                updatedAt: rUpdatedAt,
                deleted: false,
                synced: true,
              };
              await putFoldersBatch([newFolder]);
              notifyDataChanged();
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    };
  } catch (err) {
    console.error('Failed to subscribe to realtime:', err);
    return () => {};
  }
}

/**
 * Standard Supabase SQL migration script
 */
export const SUPABASE_SQL_SETUP = `-- 1. Create folders table
create table if not exists public.folders (
  id uuid primary key,
  name text not null,
  color text,
  updated_at bigint not null
);

-- 2. Create notes table
create table if not exists public.notes (
  id uuid primary key,
  title text not null default '',
  content text not null default '',
  updated_at bigint not null,
  folder_id uuid references public.folders(id) on delete set null,
  pinned boolean not null default false,
  color text
);

-- 3. Enable Row Level Security (RLS)
alter table public.folders enable row level security;
alter table public.notes enable row level security;

-- 4. Create policies allowing full access to anon users (auth-free)
create policy "Anon full access to folders" on public.folders
  for all to anon using (true) with check (true);

create policy "Anon full access to notes" on public.notes
  for all to anon using (true) with check (true);

-- 5. Enable Realtime publication for both tables
alter publication supabase_realtime add table public.folders;
alter publication supabase_realtime add table public.notes;
`;
