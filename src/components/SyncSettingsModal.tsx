import React, { useState } from 'react';
import {
  X,
  Cloud,
  Check,
  Copy,
  RefreshCw,
  Database,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import {
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  triggerSync,
  getCapabilities,
  SUPABASE_SQL_SETUP,
} from '../lib/supabase';
import { resetLocalDatabase, clearAllTombstones, getAllTombstones } from '../lib/db';
import { SyncState, ConnectionStatus } from '../types';

interface SyncSettingsModalProps {
  isOpen: boolean;
  syncState: SyncState;
  connection: ConnectionStatus;
  errorMessage: string | null;
  onClose: () => void;
  onRefreshData: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  syncState,
  connection,
  errorMessage,
  onClose,
  onRefreshData,
}) => {
  const currentConfig = getSavedSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const caps = getCapabilities();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig({
      url: url.trim(),
      anonKey: anonKey.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);

    setIsSyncing(true);
    await triggerSync();
    setIsSyncing(false);
    onRefreshData();
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await triggerSync();
    setIsSyncing(false);
    onRefreshData();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cloud Sync & Settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 my-8 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Supabase Cloud Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auth-free anon key sync with realtime updates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connection.online && connection.configured && (connection.reachable || syncState === 'synced')
                  ? 'bg-emerald-500'
                  : syncState === 'syncing'
                  ? 'bg-blue-500 animate-pulse'
                  : syncState === 'error' || (connection.configured && !connection.reachable)
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {connection.online && connection.configured && (connection.reachable || syncState === 'synced')
                ? 'Online'
                : !connection.online
                ? 'No internet — offline'
                : !connection.configured
                ? 'Offline (Local Only)'
                : syncState === 'syncing'
                ? 'Syncing…'
                : syncState === 'error'
                ? 'Sync error'
                : 'Connecting…'}
            </span>
            {connection.projectRef && (
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                · {connection.projectRef}
              </span>
            )}
            {connection.lastChecked > 0 && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                · last checked {new Date(connection.lastChecked).toLocaleTimeString()}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing || !url}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Now</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="supabase-url"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Supabase Project URL
            </label>
            <input
              id="supabase-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="supabase-key"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Supabase Anon Public Key (Auth-Free)
            </label>
            <input
              id="supabase-key"
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-blue-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {savedSuccess ? 'Saved & initiated!' : 'Saved in secure browser storage'}
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Connect</span>
            </button>
          </div>
        </form>

        {/* Capability Probes display */}
        {caps.probed && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Detected Capabilities:</span>
            </div>
            <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
              <div>folders table: {caps.foldersTable ? '✅ Yes' : '⚠️ Missing'}</div>
              <div>folder color: {caps.folderColor ? '✅ Yes' : '⚠️ Missing'}</div>
              <div>notes.folder_id: {caps.noteFolderId ? '✅ Yes' : '⚠️ Missing'}</div>
              <div>notes.pinned: {caps.notePinned ? '✅ Yes' : '⚠️ Missing'}</div>
              <div>notes.deleted: {caps.noteDeleted ? '✅ Yes' : '⚠️ Run SQL'}</div>
              <div>folders.deleted: {caps.folderDeleted ? '✅ Yes' : '⚠️ Run SQL'}</div>
            </div>
            {(!caps.noteDeleted || !caps.folderDeleted) && (
              <div className="mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300">
                <strong>Run the SQL below</strong> to add the <code>deleted</code> column.
                Without it, deleted notes may resurrect across devices.
              </div>
            )}
          </div>
        )}

        {/* SQL Setup Script Helper */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>Supabase SQL Setup Script</span>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Paste this in your Supabase project's SQL Editor to create tables, RLS policies, and realtime publications.
          </p>
          <pre className="max-h-28 overflow-y-auto text-[10px] p-2.5 rounded-lg bg-slate-100 dark:bg-slate-950 font-mono text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
            {SUPABASE_SQL_SETUP}
          </pre>
        </div>

        {/* Local data controls */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Local Data Controls</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Clear tombstones? Deleted notes may resurrect on next pull if other devices still have them.')) return;
                await clearAllTombstones();
                onRefreshData();
              }}
              className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              Clear tombstones
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Reset local data? This wipes all notes, folders, and tombstones from THIS device. Reload to start fresh.')) return;
                await resetLocalDatabase();
                // Also clear all app-level localStorage so the next reload
                // starts truly fresh (no sync state, no Supabase config).
                try {
                  localStorage.clear();
                } catch (e) {
                  console.warn('localStorage.clear failed', e);
                }
                window.location.reload();
              }}
              className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
            >
              Reset local data
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
            Tombstone count: <span className="font-mono">{useTombstoneCount()}</span>. After reset, the app will re-seed 2 welcome notes.
          </p>
        </div>
      </div>
    </div>
  );
};

// Tiny hook to read tombstone count for display
function useTombstoneCount(): number {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    let mounted = true;
    getAllTombstones().then((t) => {
      if (mounted) setCount(t.length);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return count;
}
