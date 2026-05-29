import { useOfflineSync } from '@/hooks/useOfflineSync';

/**
 * Mounts the offline sync hook globally so the pending queue drains
 * automatically whenever connectivity is restored, no matter which
 * screen the user is on. Renders nothing.
 */
export const OfflineSyncRunner = () => {
  useOfflineSync();
  return null;
};
