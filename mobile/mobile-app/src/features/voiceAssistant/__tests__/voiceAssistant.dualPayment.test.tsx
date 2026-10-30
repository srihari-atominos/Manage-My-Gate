import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react-native';
import { VoiceAssistantChatBubble } from '../components/VoiceAssistantChatBubble';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: jest.fn() }),
  usePathname: () => '/(resident)/dashboard',
}));

describe('VoiceAssistant Dual Payment & Navigation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      cleanup();
    });
  });

  it('renders dual payment buttons (Wallet Top Up & Online Payment) and triggers direct navigation on click', async () => {
    const mockNavigate = jest.fn();
    const mockConfirm = jest.fn();
    const mockCancel = jest.fn();

    const message: any = {
      id: 'asst_dual_1',
      sender: 'assistant',
      text: 'Total fee for 13 hours (6 AM - 7 PM) is ₹13,000. Please choose your payment method.',
      timestamp: Date.now(),
      metadata: {
        actionCard: {
          type: 'confirmation',
          actionType: 'CREATE_AMENITY_BOOKING',
          actionId: 'act_bkg_99999',
          confirmationToken: 'act_bkg_99999.token',
          title: 'Confirm Basketball Court Booking',
          confirmLabel: 'Confirm Booking',
          cancelLabel: 'Cancel',
          paymentOptions: [
            {
              id: 'WALLET',
              label: 'NAHOM Wallet',
              balance: 5000,
              isSufficient: false,
              shortageAmount: 8000,
              route: '/(resident)/billing/wallet?amount=8000',
              actionLabel: 'Top Up Wallet (₹8000 short)',
            },
            {
              id: 'ONLINE',
              label: 'Online Payment (UPI, Cards, Net Banking)',
              isSufficient: true,
              shortageAmount: 0,
              route: '/(resident)/amenities/booking/am_bball_1?date=2026-11-02&slot=06:00&payOnline=1',
              actionLabel: 'Pay Online (UPI / Card)',
            },
          ],
        },
      },
    };

    const { getByText, getByLabelText } = await render(
      <VoiceAssistantChatBubble
        message={message}
        onNavigate={mockNavigate}
        onConfirmAction={mockConfirm}
        onCancelAction={mockCancel}
      />
    );

    // Verify both options are presented
    expect(getByText('Choose Payment Method:')).toBeTruthy();
    expect(getByText('NAHOM Wallet')).toBeTruthy();
    expect(getByText('Top Up Wallet (₹8000 short)')).toBeTruthy();
    expect(getByText('Online Payment (UPI, Cards, Net Banking)')).toBeTruthy();
    expect(getByText('Pay Online (UPI / Card)')).toBeTruthy();

    // Clicking Online Payment triggers onNavigate with online checkout route
    await act(async () => {
      fireEvent.press(getByLabelText('Pay Online (UPI / Card)'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('/(resident)/amenities/booking/am_bball_1?date=2026-11-02&slot=06:00&payOnline=1');

    // Clicking Wallet (insufficient) triggers onNavigate to Wallet top up screen
    await act(async () => {
      fireEvent.press(getByLabelText('Top Up Wallet (₹8000 short)'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('/(resident)/billing/wallet?amount=8000');
  });

  it('allows one-click wallet payment when wallet balance is sufficient', async () => {
    const mockNavigate = jest.fn();
    const mockConfirm = jest.fn();
    const mockCancel = jest.fn();

    const message: any = {
      id: 'asst_dual_2',
      sender: 'assistant',
      text: 'Total fee: ₹1,100. Wallet balance: ₹2,000.',
      timestamp: Date.now(),
      metadata: {
        actionCard: {
          type: 'confirmation',
          actionType: 'CREATE_AMENITY_BOOKING',
          actionId: 'act_bkg_88888',
          confirmationToken: 'act_bkg_88888.token',
          title: 'Confirm Basketball Court Booking',
          paymentOptions: [
            {
              id: 'WALLET',
              label: 'NAHOM Wallet',
              balance: 2000,
              isSufficient: true,
              shortageAmount: 0,
              route: '/(resident)/billing/wallet',
              actionLabel: 'Pay ₹1100 via Wallet',
            },
            {
              id: 'ONLINE',
              label: 'Online Payment (UPI, Cards, Net Banking)',
              isSufficient: true,
              shortageAmount: 0,
              route: '/(resident)/amenities/booking/am_bball_2?payOnline=1',
              actionLabel: 'Pay Online (UPI / Card)',
            },
          ],
        },
      },
    };

    const { getByText, getByLabelText } = await render(
      <VoiceAssistantChatBubble
        message={message}
        onNavigate={mockNavigate}
        onConfirmAction={mockConfirm}
        onCancelAction={mockCancel}
      />
    );

    expect(getByText('NAHOM Wallet')).toBeTruthy();
    expect(getByLabelText('Pay ₹1100 via Wallet')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText('Pay ₹1100 via Wallet'));
    });
    expect(mockConfirm).toHaveBeenCalledWith('act_bkg_88888', 'act_bkg_88888.token');
  });
});
