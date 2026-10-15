import { configureStore } from '@reduxjs/toolkit';
import authReducer, { verifyOtpLogin, requestOtp, respondToInvitationThunk } from '../store/authSlice';
import authService from '../services/authService';
import { resolveHomeRoute, hasActiveCommunity } from '../utils/landing';
import { compareVersions, isVersionSupported } from '../utils/appVersion';
import { setPendingInviteToken, getPendingInviteToken, clearPendingInviteToken } from '../utils/inviteContext';

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    verifyEmailOtpLogin: jest.fn(),
    verifyPhoneLogin: jest.fn(),
    initiateEmailOtpLogin: jest.fn(),
    initiatePhoneLogin: jest.fn(),
    respondToInvitation: jest.fn(),
  },
}));

const createStore = () => configureStore({ reducer: { auth: authReducer } });
const apiError = (status: number, body: any) => Object.assign(new Error(body.message), { response: { status, data: body } });

describe('OTP sign-in with invitations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends the pending invitation token with the code', async () => {
    (authService.verifyEmailOtpLogin as jest.Mock).mockResolvedValue({
      success: true,
      data: { token: 't', refreshToken: 'r', user: { id: 'u1', orgId: 'o1' }, landing: 'member', pendingInvitations: [] },
    });
    const store = createStore();
    await store.dispatch(verifyOtpLogin({ identifier: 'a@b.co', code: '123456', isEmail: true, inviteToken: 'invite-abc' }));
    expect(authService.verifyEmailOtpLogin).toHaveBeenCalledWith('a@b.co', '123456', 'invite-abc');
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.user?.landing).toBe('member');
  });

  it('a not-yet-activated invitee gets an invitation choice, not a session', async () => {
    (authService.verifyPhoneLogin as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        requiresInvitationSelection: true,
        ticket: 'ticket-1',
        pendingInvitations: [{ id: 'i1', orgId: 'o1', communityName: 'Green Meadows' }],
        landing: 'pending_invitations',
      },
    });
    const store = createStore();
    const result: any = await store.dispatch(verifyOtpLogin({ identifier: '+919800000001', code: '123456', isEmail: false }));
    expect(result.payload.selection.ticket).toBe('ticket-1');
    const auth = store.getState().auth;
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.token).toBeNull();
    expect(auth.invitationSelection?.pendingInvitations).toHaveLength(1);
  });

  it('keeps attempts remaining from a wrong code', async () => {
    (authService.verifyEmailOtpLogin as jest.Mock).mockRejectedValue(
      apiError(400, { success: false, message: 'Incorrect OTP. 2 attempts remaining.', details: { code: 'OTP_INVALID', attemptsRemaining: 2 } })
    );
    const store = createStore();
    await store.dispatch(verifyOtpLogin({ identifier: 'a@b.co', code: '000000', isEmail: true }));
    const auth = store.getState().auth;
    expect(auth.error).toBe('Incorrect OTP. 2 attempts remaining.');
    expect(auth.errorDetail).toEqual({ code: 'OTP_INVALID', attemptsRemaining: 2, retryAfterSeconds: undefined });
  });

  it('keeps the retry time from a resend cooldown', async () => {
    (authService.initiateEmailOtpLogin as jest.Mock).mockRejectedValue(
      apiError(429, { success: false, message: 'Resend available in 18 seconds.', details: { code: 'OTP_COOLDOWN', retryAfterSeconds: 18 } })
    );
    const store = createStore();
    await store.dispatch(requestOtp({ identifier: 'a@b.co', isEmail: true }));
    expect(store.getState().auth.errorDetail).toEqual({ code: 'OTP_COOLDOWN', retryAfterSeconds: 18 });
  });

  it('accepting the chosen invitation with the ticket signs in', async () => {
    (authService.respondToInvitation as jest.Mock).mockResolvedValue({
      success: true,
      data: { token: 't2', refreshToken: 'r2', user: { id: 'u2', orgId: 'o2' }, landing: 'community_admin', pendingInvitations: [] },
    });
    const store = createStore();
    await store.dispatch(respondToInvitationThunk({ action: 'accept', invitationId: 'i1', ticket: 'ticket-1' }));
    expect(authService.respondToInvitation).toHaveBeenCalledWith('accept', { invitationId: 'i1', ticket: 'ticket-1' });
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.invitationSelection).toBeNull();
  });

  it('declining refreshes the list without signing in', async () => {
    (authService.verifyPhoneLogin as jest.Mock).mockResolvedValue({
      success: true,
      data: { requiresInvitationSelection: true, ticket: 'tk', pendingInvitations: [{ id: 'i1' }, { id: 'i2' }] },
    });
    (authService.respondToInvitation as jest.Mock).mockResolvedValue({
      success: true,
      data: { declined: true, pendingInvitations: [{ id: 'i2' }] },
    });
    const store = createStore();
    await store.dispatch(verifyOtpLogin({ identifier: '+919800000002', code: '111111', isEmail: false }));
    await store.dispatch(respondToInvitationThunk({ action: 'decline', invitationId: 'i1', ticket: 'tk' }));
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.invitationSelection?.pendingInvitations).toEqual([{ id: 'i2' }]);
  });
});

describe('landing routes', () => {
  it('sends members and community admins to the dashboard', () => {
    expect(resolveHomeRoute({ orgId: 'o1', landing: 'member' })).toBe('/(resident)');
    expect(resolveHomeRoute({ orgId: 'o1', landing: 'community_admin' })).toBe('/(resident)');
    expect(resolveHomeRoute({ orgId: 'p', landing: 'platform' })).toBe('/(resident)');
  });

  it('routes people without a community', () => {
    expect(resolveHomeRoute({ landing: 'pending_invitations' })).toBe('/(auth)/pending-invitations');
    expect(resolveHomeRoute({ landing: 'no_community' })).toBe('/(auth)/no-community');
    expect(resolveHomeRoute({ id: 'u' })).toBe('/(auth)/no-community');
    expect(hasActiveCommunity({ availableWorkspaces: [{ orgId: 'o' }] })).toBe(true);
  });
});

describe('minimum app version', () => {
  it('compares dotted versions', () => {
    expect(compareVersions('1.0.5', '1.1.0')).toBeLessThan(0);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
  });

  it('blocks only versions older than the minimum', () => {
    expect(isVersionSupported('1.0.5', '1.1.0')).toBe(false);
    expect(isVersionSupported('1.1.0', '1.1.0')).toBe(true);
    expect(isVersionSupported('1.0.5', null)).toBe(true);
    expect(isVersionSupported('1.0.5', '0.0.0')).toBe(true);
  });
});

describe('invitation context', () => {
  it('remembers the invitation being answered for the app session', () => {
    clearPendingInviteToken();
    expect(getPendingInviteToken()).toBeNull();
    setPendingInviteToken('  tok-1  ');
    expect(getPendingInviteToken()).toBe('tok-1');
    setPendingInviteToken('');
    expect(getPendingInviteToken()).toBe('tok-1');
    clearPendingInviteToken();
    expect(getPendingInviteToken()).toBeNull();
  });
});
