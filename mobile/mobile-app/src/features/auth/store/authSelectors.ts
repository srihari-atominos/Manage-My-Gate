import { RootState } from '../../../store/store';

export const selectAuthUser = (state: RootState) => (state as any).auth?.user;

export const selectCurrentUserId = (state: RootState): string => {
  const user = selectAuthUser(state);
  if (!user) return '';

  const rawId =
    user.id ||
    user._id ||
    user.userId ||
    user.user?.id ||
    user.user?._id ||
    user.sub ||
    '';

  if (typeof rawId === 'string') return rawId;
  if (typeof rawId === 'object' && rawId !== null) return rawId._id || rawId.id || '';
  return '';
};

/** The unit a resident is currently acting for (kept in sync by the villa switcher). */
export const selectActiveVillaId = (state: RootState): string => {
  const user = selectAuthUser(state);
  return user?.activeVillaId || user?.villaId || '';
};

export const selectActiveOrgId = (state: RootState): string => {
  const auth = (state as any).auth;
  const user = selectAuthUser(state);
  
  let orgId =
    auth?.activeOrgId ||
    auth?.organizationId ||
    user?.activeOrgId ||
    user?.orgId ||
    user?.organizationId ||
    user?.org?._id ||
    user?.org?.id ||
    user?.organization?._id ||
    user?.organization?.id ||
    user?.activeOrganizationId ||
    '';

  const available = user?.availableWorkspaces;
  if (Array.isArray(available) && available.length > 0) {
    const isValid = available.some(
      (w: any) => String(w?.orgId || w?._id || w?.id || '') === String(orgId)
    );
    if (!isValid) {
      orgId = available[0]?.orgId || available[0]?._id || available[0]?.id || '';
    }
  }

  return orgId ? String(orgId) : '';
};
