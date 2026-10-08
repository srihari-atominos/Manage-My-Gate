/**
 * Picks the first screen after sign-in from the server's `landing` hint. The hint is
 * derived server-side from permissions (never role names) and only chooses a screen;
 * every request is still authorised by the server.
 *
 * - community_admin / member / platform → the dashboard (its tiles follow permissions)
 * - pending_invitations → choose an invitation to accept
 * - no_community (or no active community) → "not part of a community yet"
 */
export const hasActiveCommunity = (user: any): boolean =>
  !!(
    user &&
    (user.orgId ||
      user.activeOrgId ||
      user.organizationId ||
      (Array.isArray(user.availableWorkspaces) && user.availableWorkspaces.length > 0))
  );

export const resolveHomeRoute = (user: any): string => {
  const landing = user?.landing;
  if (landing === 'pending_invitations') return '/(auth)/pending-invitations';
  if (landing === 'no_community' || !hasActiveCommunity(user)) return '/(auth)/no-community';
  return '/(resident)';
};

/** Auth-group screens a signed-in user may stay on. */
export const SIGNED_IN_AUTH_ROUTES = new Set(['no-community', 'pending-invitations', 'accept-invite']);
