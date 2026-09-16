import { useEffect, useState, useCallback } from 'react';
import {
  triggerSync,
  setupRealtimeSubscription,
  onSyncStatusChange,
  getSavedSupabaseConfig,
  onRemoteDataChange,
} from '../lib/supabase';
import { SyncState } from '../types';

export function useSyncCoordinator(onRefreshData: () => void) {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubStatus = onSyncStatusChange((state, msg) => {
      setSyncState(state);
      setErrorMessage(msg || null);
    });

    const unsubData = onRemoteDataChange(() => {
      onRefreshData();
    });

    return () => {
      unsubStatus();
      unsubData();
    };
  }, [onRefreshData]);

  useEffect(() => {
    const config = getSavedSupabaseConfig();
    if (!config.url || !config.anonKey) {
      setSyncState('unconfigured');
    }

    // Trigger 1: App mount
    triggerSync();

    // Setup realtime
    const cleanupRealtime = setupRealtimeSubscription();

    // Trigger 3: visibilitychange when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Trigger 4: focus
    const handleFocus = () => {
      triggerSync();
    };
    window.addEventListener('focus', handleFocus);

    // Trigger 5: Every 30 seconds
    const interval = setInterval(() => {
      triggerSync();
    }, 30000);

    return () => {
      cleanupRealtime();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const manualSync = useCallback(() => {
    triggerSync();
  }, []);

  return {
    syncState,
    errorMessage,
    manualSync,
  };
}
