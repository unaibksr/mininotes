import { useEffect, useState, useCallback } from 'react';
import {
  triggerSync,
  setupRealtimeSubscription,
  onSyncStatusChange,
  getSavedSupabaseConfig,
  onRemoteDataChange,
  verifyConnection,
  getConnectionStatus,
  onConnectionStatusChange,
} from '../lib/supabase';
import { SyncState, ConnectionStatus } from '../types';

export function useSyncCoordinator(onRefreshData: () => void) {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>(getConnectionStatus());

  useEffect(() => {
    const unsubStatus = onSyncStatusChange((state, msg) => {
      setSyncState(state);
      setErrorMessage(msg || null);
    });

    const unsubConn = onConnectionStatusChange((status) => {
      setConnection(status);
    });

    const unsubData = onRemoteDataChange(() => {
      onRefreshData();
    });

    return () => {
      unsubStatus();
      unsubConn();
      unsubData();
    };
  }, [onRefreshData]);

  useEffect(() => {
    const config = getSavedSupabaseConfig();
    if (!config.url || !config.anonKey) {
      setSyncState('unconfigured');
    }

    // Probe reachability immediately on mount so the UI can render a real status.
    void verifyConnection();

    // Trigger 1: App mount
    triggerSync();

    // Setup realtime
    const cleanupRealtime = setupRealtimeSubscription();

    // Trigger 3: visibilitychange when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void verifyConnection();
        triggerSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Trigger 4: focus
    const handleFocus = () => {
      void verifyConnection();
      triggerSync();
    };
    window.addEventListener('focus', handleFocus);

    // Trigger 5: Every 5 seconds for fast cross-device reconciliation
    const interval = setInterval(() => {
      void verifyConnection();
      triggerSync();
    }, 5000);

    // Re-probe whenever the browser's online state flips.
    const handleOnline = () => void verifyConnection();
    const handleOffline = () => void verifyConnection();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cleanupRealtime();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const manualSync = useCallback(async () => {
    await verifyConnection();
    await triggerSync();
  }, []);

  return {
    syncState,
    errorMessage,
    connection,
    manualSync,
  };
}
