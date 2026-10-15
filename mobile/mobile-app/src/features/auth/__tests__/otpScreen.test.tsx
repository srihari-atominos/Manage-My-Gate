/**
 * Code screen: the story's OTP messages (attempts remaining, Request New OTP once a
 * code is used up, resend countdown) and the invitation hand-off after verification.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = { email: 'resident@example.com' };
jest.mock('expo-router', () => ({
  router: { replace: (...args: any[]) => mockReplace(...args), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));

const mockVerifyOtp = jest.fn();
const mockRequestOtp = jest.fn();
let mockAuthState: any = {};
jest.mock('@/src/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ ...mockAuthState, verifyOtp: mockVerifyOtp, requestOtp: mockRequestOtp, clearStatus: jest.fn() }),
}));
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ ...mockAuthState, verifyOtp: mockVerifyOtp, requestOtp: mockRequestOtp, clearStatus: jest.fn() }),
}));

jest.mock('@/components/layout/KeyboardAwareScrollView', () => {
  const { View } = require('react-native');
  return { KeyboardAwareScrollView: ({ children }: any) => <View>{children}</View> };
});

import OtpScreen from '../../../../app/(auth)/otp';
import { setPendingInviteToken, clearPendingInviteToken, getPendingInviteToken } from '../utils/inviteContext';

describe('OTP screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockParams = { email: 'resident@example.com' };
    mockAuthState = { loading: false, error: null, errorDetail: null };
    clearPendingInviteToken();
  });
  afterEach(() => jest.useRealTimers());

  it('shows the resend countdown before resending is allowed', async () => {
    await render(<OtpScreen />);
    expect(screen.getByTestId('otp-resend-countdown')).toBeTruthy();
    expect(screen.getByText(/Didn't receive the OTP\?/)).toBeTruthy();
  });

  it('shows the attempts-remaining message from the server', async () => {
    mockAuthState = { loading: false, error: 'Incorrect OTP. 2 attempts remaining.', errorDetail: { code: 'OTP_INVALID', attemptsRemaining: 2 } };
    await render(<OtpScreen />);
    expect(screen.getByText('Incorrect OTP. 2 attempts remaining.')).toBeTruthy();
    expect(screen.getByTestId('otp-verify')).toBeTruthy();
  });

  it('offers Request New OTP once the code is used up', async () => {
    mockAuthState = {
      loading: false,
      error: 'Too many incorrect attempts. Your current OTP is no longer valid. Please request a new OTP to continue.',
      errorDetail: { code: 'OTP_EXHAUSTED', attemptsRemaining: 0 },
    };
    await render(<OtpScreen />);
    expect(screen.getByTestId('otp-request-new')).toBeTruthy();
    expect(screen.queryByTestId('otp-verify')).toBeNull();
  });

  it('verifies with the pending invitation and opens the app', async () => {
    setPendingInviteToken('invite-xyz');
    mockVerifyOtp.mockResolvedValue({ meta: { requestStatus: 'fulfilled' }, payload: { token: 't', user: { id: 'u' } } });
    await render(<OtpScreen />);
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('otp-code-input'), '123456');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('otp-verify'));
    });
    expect(mockVerifyOtp).toHaveBeenCalledWith('resident@example.com', '123456', true, 'invite-xyz');
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(getPendingInviteToken()).toBeNull();
  });

  it('sends an invitee without the link to choose an invitation', async () => {
    mockVerifyOtp.mockResolvedValue({ meta: { requestStatus: 'fulfilled' }, payload: { selection: { ticket: 'tk', pendingInvitations: [] } } });
    await render(<OtpScreen />);
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('otp-code-input'), '654321');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('otp-verify'));
    });
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/pending-invitations');
  });
});
