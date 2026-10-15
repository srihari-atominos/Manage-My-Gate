import { useState, useEffect } from 'react';
import { staffService, StaffMember } from '../services/staffService';

/**
 * While the delete dialog is open, looks up how many units the staff member is currently allocated to
 * so the confirmation can say what will be lost. Failure just falls back to the generic wording.
 */
export function useStaffDeleteImpact(member: StaffMember | null) {
  const [unitCount, setUnitCount] = useState<number | null>(null);

  useEffect(() => {
    setUnitCount(null);
    if (!member?._id) return;
    let cancelled = false;
    staffService
      .getUnitAssociations({ technicianId: member._id, status: 'Active' })
      .then((list) => {
        if (!cancelled) setUnitCount(Array.isArray(list) ? list.length : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [member?._id]);

  return unitCount;
}

export function buildStaffDeleteMessage(
  name: string | undefined,
  unitCount: number | null,
  t: (key: string, fallback?: string, params?: Record<string, any>) => string
): string {
  const base = t(
    'staff_dir_delete_msg',
    'Delete {{name}}? They will be removed from the directory and checked out if they are inside.',
    { name: name || '' }
  );
  if (!unitCount || unitCount <= 0) return base;
  const units = t(
    'staff_dir_delete_units',
    'They are currently allocated to {{count}} unit(s) and will lose that access.',
    { count: unitCount }
  );
  return `${base} ${units}`;
}
