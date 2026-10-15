import { useState, useEffect, useCallback } from 'react';
import { staffService, StaffInsideNow } from '../services/staffService';

/**
 * Staff allocated to the caller's units who are currently inside the community.
 * Self-contained (no store) because it is a small, read-only, always-fresh view.
 */
export function useStaffInsideNow(enabled: boolean = true) {
  const [staffInside, setStaffInside] = useState<StaffInsideNow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      setStaffInside(await staffService.getStaffInsideMyUnits());
    } catch {
      // Non-critical widget: keep the previous list instead of surfacing an error banner.
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { staffInside, isLoading, refresh };
}
