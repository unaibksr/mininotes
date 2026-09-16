import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Note, Folder } from '../types';

interface NotesDBSchema extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: {
      by_updatedAt: number;
      by_folderId: string;
    };
  };
  folders: {
    key: string;
    value: Folder;
    indexes: {
      by_updatedAt: number;
    };
  };
  tombstones: {
    key: string;
    value: { id: string; type: 'note' | 'folder'; deletedAt: number };
  };
}

const DB_NAME = 'minimalist_notes_db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<NotesDBSchema>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<NotesDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<NotesDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        // Handle store creation & indexes
        if (oldVersion < 1) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('by_updatedAt', 'updatedAt');
          notesStore.createIndex('by_folderId', 'folderId');

          const foldersStore = db.createObjectStore('folders', { keyPath: 'id' });
          foldersStore.createIndex('by_updatedAt', 'updatedAt');
        } else if (oldVersion === 1) {
          // Upgrade to version 2 if missing indexes
          const notesStore = transaction.objectStore('notes');
          if (!notesStore.indexNames.contains('by_updatedAt')) {
            notesStore.createIndex('by_updatedAt', 'updatedAt');
          }
          if (!notesStore.indexNames.contains('by_folderId')) {
            notesStore.createIndex('by_folderId', 'folderId');
          }
          if (!db.objectStoreNames.contains('folders')) {
            const foldersStore = db.createObjectStore('folders', { keyPath: 'id' });
            foldersStore.createIndex('by_updatedAt', 'updatedAt');
          }
        } else if (oldVersion < 3) {
          // Upgrade to version 3: tombstones store to prevent resurrection
          if (!db.objectStoreNames.contains('tombstones')) {
            db.createObjectStore('tombstones', { keyPath: 'id' });
          }
        }
      },
    });
  }
  return dbPromise;
}

const tombstoneKey = (type: 'note' | 'folder', id: string) => `${type}:${id}`;

export async function addTombstone(type: 'note' | 'folder', id: string): Promise<void> {
  const db = await getDatabase();
  await db.put('tombstones', { id: tombstoneKey(type, id), type, deletedAt: Date.now() });
}

export async function isTombstoned(type: 'note' | 'folder', id: string): Promise<boolean> {
  const db = await getDatabase();
  const t = await db.get('tombstones', tombstoneKey(type, id));
  return !!t;
}

export async function getAllTombstones(): Promise<{ id: string; type: 'note' | 'folder' }[]> {
  const db = await getDatabase();
  return db.getAll('tombstones');
}

// ---------------- NOTES STORAGE ----------------

export async function getActiveNotes(): Promise<Note[]> {
  const db = await getDatabase();
  const all = await db.getAll('notes');
  return all.filter((n) => !n.deleted);
}

export async function getAllNotesIncludingDeleted(): Promise<Note[]> {
  const db = await getDatabase();
  return db.getAll('notes');
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  const db = await getDatabase();
  return db.get('notes', id);
}

export async function putNote(note: Note): Promise<void> {
  const db = await getDatabase();
  await db.put('notes', note);
}

export async function putNotesBatch(notes: Note[]): Promise<void> {
  if (!notes.length) return;
  const db = await getDatabase();
  const tx = db.transaction('notes', 'readwrite');
  for (const note of notes) {
    await tx.store.put(note);
  }
  await tx.done;
}

export async function softDeleteNote(id: string): Promise<Note | null> {
  const db = await getDatabase();
  const note = await db.get('notes', id);
  if (!note) return null;
  const updatedNote: Note = {
    ...note,
    deleted: true,
    synced: false,
    updatedAt: Date.now(),
  };
  await db.put('notes', updatedNote);
  // Permanent tombstone so the note never resurrects from sync/realtime.
  await addTombstone('note', id);
  return updatedNote;
}

export async function restoreNote(id: string): Promise<Note | null> {
  const db = await getDatabase();
  const note = await db.get('notes', id);
  if (!note) return null;
  const restored: Note = {
    ...note,
    deleted: false,
    synced: false,
    updatedAt: Date.now(),
  };
  await db.put('notes', restored);
  // Clear the tombstone so a future restore is allowed.
  await db.delete('tombstones', tombstoneKey('note', id));
  return restored;
}

export async function hardDeleteNote(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('notes', id);
}

export async function hardDeleteFolder(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('folders', id);
}

// ---------------- FOLDERS STORAGE ----------------

export async function getActiveFolders(): Promise<Folder[]> {
  const db = await getDatabase();
  const all = await db.getAll('folders');
  return all.filter((f) => !f.deleted);
}

export async function getAllFoldersIncludingDeleted(): Promise<Folder[]> {
  const db = await getDatabase();
  return db.getAll('folders');
}

export async function putFolder(folder: Folder): Promise<void> {
  const db = await getDatabase();
  await db.put('folders', folder);
}

export async function putFoldersBatch(folders: Folder[]): Promise<void> {
  if (!folders.length) return;
  const db = await getDatabase();
  const tx = db.transaction('folders', 'readwrite');
  for (const folder of folders) {
    await tx.store.put(folder);
  }
  await tx.done;
}

export async function softDeleteFolder(id: string): Promise<Folder | null> {
  const db = await getDatabase();
  const folder = await db.get('folders', id);
  if (!folder) return null;
  const updatedFolder: Folder = {
    ...folder,
    deleted: true,
    synced: false,
    updatedAt: Date.now(),
  };
  await db.put('folders', updatedFolder);
  await addTombstone('folder', id);

  // Unfile notes that were in this folder
  const allNotes = await db.getAll('notes');
  const tx = db.transaction('notes', 'readwrite');
  for (const note of allNotes) {
    if (note.folderId === id && !note.deleted) {
      await tx.store.put({
        ...note,
        folderId: null,
        synced: false,
        updatedAt: Date.now(),
      });
    }
  }
  await tx.done;

  return updatedFolder;
}

export async function markNotesAsSynced(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDatabase();
  const tx = db.transaction('notes', 'readwrite');
  for (const id of ids) {
    const note = await tx.store.get(id);
    if (note) {
      if (note.deleted) {
        // Soft delete can now be cleaned up after successful push to Supabase
        await tx.store.delete(id);
      } else {
        await tx.store.put({ ...note, synced: true });
      }
    }
  }
  await tx.done;
}

export async function markFoldersAsSynced(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDatabase();
  const tx = db.transaction('folders', 'readwrite');
  for (const id of ids) {
    const folder = await tx.store.get(id);
    if (folder) {
      if (folder.deleted) {
        await tx.store.delete(id);
      } else {
        await tx.store.put({ ...folder, synced: true });
      }
    }
  }
  await tx.done;
}
