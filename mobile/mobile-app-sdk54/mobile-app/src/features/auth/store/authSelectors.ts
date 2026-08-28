import { RootState } from '../../../store/store';

export const selectAuthUser = (state: RootState) => (state as any).auth?.user;

export const selectActiveOrgId = (state: RootState): string => {
  const user = selectAuthUser(state);
  if (!user) return '';

  return (
    user.orgId ||
    user.organizationId ||
    user.org?._id ||
    user.organization?._id ||
    user.activeOrgId ||
    user.activeOrganizationId ||
    (Array.isArray(user.availableWorkspaces) && user.availableWorkspaces[0]?.orgId) ||
    (Array.isArray(user.availableWorkspaces) && user.availableWorkspaces[0]?._id) ||
    ''
  );
};
