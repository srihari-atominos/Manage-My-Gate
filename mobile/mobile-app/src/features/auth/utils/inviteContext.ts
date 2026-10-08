import { sessionStore } from '@/src/utils/storage';

/**
 * Keeps the invitation token from an invite link while the person signs in, so the
 * exact invitation can be accepted after OTP/SSO verification. Opening a link never
 * signs anyone in; this only remembers which invitation they are answering.
 * Lives for the app session only.
 */
const KEY = 'pending_invite_token';

export const setPendingInviteToken = (token: string | null | undefined) => {
  if (token && String(token).trim()) sessionStore.setItem(KEY, String(token).trim());
};

export const getPendingInviteToken = (): string | null => sessionStore.getItem(KEY);

export const clearPendingInviteToken = () => sessionStore.removeItem(KEY);
