import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import voiceAssistantReducer from '../store/voiceAssistantSlice';
import speechRecognitionService from '../services/speechRecognitionService';
import textToSpeechService from '../services/textToSpeechService';
import * as aiAssistantApi from '../services/aiAssistantApi';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';

// Mock dependencies
jest.mock('expo-speech', () => ({
  speak: jest.fn((text, options) => {
    options?.onDone?.();
    return Promise.resolve();
  }),
  stop: jest.fn(() => Promise.resolve()),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    isRecognitionAvailable: jest.fn().mockReturnValue(true),
    start: jest.fn().mockResolvedValue(true),
    stop: jest.fn().mockResolvedValue(true),
    abort: jest.fn().mockResolvedValue(true),
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

jest.mock('../services/aiAssistantApi', () => ({
  fetchAssistantConfig: jest.fn().mockResolvedValue({
    enabled: true,
    model: 'gemini-3.5-flash',
    authorizedFeatures: [
      { id: 'billing_my_invoices', name: 'My Invoices & Dues', route: '/(resident)/billing/my-dues' },
      { id: 'amenities_discover', name: 'Discover Amenities', route: '/(resident)/amenities/discover' },
    ],
  }),
  sendChatMessage: jest.fn(),
  executeAssistantTool: jest.fn(),
  requestSessionToken: jest.fn().mockResolvedValue({ token: 'test-token' }),
  releaseAssistantSession: jest.fn().mockResolvedValue({ released: true }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: jest.fn() }),
}));

const createMockStore = (initialOverride = {}) => {
  return configureStore({
    reducer: {
      voiceAssistant: voiceAssistantReducer,
    },
    preloadedState: {
      voiceAssistant: {
        status: 'idle',
        mode: 'chat',
        isModalOpen: true,
        isMuted: false,
        isTtsEnabled: true,
        isGeneratingText: false,
        errorMessage: null,
        transcriptSnippet: '',
        elapsedSeconds: 0,
        maxDurationSeconds: 600,
        authorizedFeatures: [
          { id: 'billing_my_invoices', name: 'My Invoices & Dues', route: '/(resident)/billing/my-dues' },
          { id: 'amenities_discover', name: 'Discover Amenities', route: '/(resident)/amenities/discover' },
        ],
        lastNavigatedScreen: null,
        conversationState: null,
        messages: [],
        ...initialOverride,
      },
    },
  });
};

describe('NAHOM Voice Agent — Phase 2 Multi-Module & Safe Mutation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    speechRecognitionService.clearSubmissionHistory();
  });

  // --------------------------------------------------------------------------
  // 1. Amenity Booking with Insufficient Wallet -> Online Payment Proposal
  // --------------------------------------------------------------------------
  describe('1. Amenity Booking & Safe Payments', () => {
    it('renders proposal card with online payment recommendation when wallet is insufficient', async () => {
      const store = createMockStore({
        status: 'awaiting_confirmation',
        messages: [
          {
            id: 'user_1',
            sender: 'user',
            text: 'Book badminton court tomorrow at 6 PM',
            timestamp: Date.now() - 2000,
          },
          {
            id: 'asst_1',
            sender: 'assistant',
            text: 'I have prepared your reservation for Badminton Court on 2026-10-29 from 18:00 to 19:00 (₹500). Note: Your wallet balance is ₹100, which is insufficient. Please click below to proceed with Online Payment.',
            timestamp: Date.now() - 1000,
            metadata: {
              actionCard: {
                type: 'confirmation',
                actionType: 'CREATE_AMENITY_BOOKING',
                actionId: 'act_bkg_12345',
                confirmationToken: 'act_bkg_12345.1793190000.signature',
                title: 'Confirm Badminton Court Booking',
                confirmLabel: 'Click to Pay Online (GPay / PhonePe / UPI)',
                cancelLabel: 'Cancel',
                summary: 'Booking for Badminton Court on 2026-10-29 from 18:00 to 19:00 (₹500) [Insufficient wallet - Online payment required]',
                details: {
                  'Amenity': 'Badminton Court',
                  'Date': '2026-10-29',
                  'Time': '18:00 - 19:00',
                  'Cost': '₹500',
                  'Payment Method': 'Online Payment (GPay, PhonePe, UPI, Cards)',
                  'Wallet Status': '₹100 (Insufficient - ₹400 short)',
                },
              },
            },
          },
        ],
      });

      await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      expect(screen.getByText('Confirm Badminton Court Booking')).toBeTruthy();
      expect(screen.getByText('Click to Pay Online (GPay / PhonePe / UPI)')).toBeTruthy();
      expect(screen.getByText('₹100 (Insufficient - ₹400 short)')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Two-Phase Action Confirmation & Cancellation
  // --------------------------------------------------------------------------
  describe('2. Two-Phase Action Confirmation Flow', () => {
    it('executes chat confirmation with actionId and token when user confirms proposal', async () => {
      (aiAssistantApi.sendChatMessage as jest.Mock).mockResolvedValueOnce({
        message: 'Booking confirmed for Badminton Court on 2026-10-29! Booking ID: BKG-2026-0001.',
        actions: [
          {
            type: 'action_result',
            status: 'success',
            actionType: 'CREATE_AMENITY_BOOKING',
            title: 'Amenity Booking Confirmed',
            referenceId: 'BKG-2026-0001',
            route: '/(resident)/amenities/my-bookings',
          },
        ],
        conversationState: {
          awaitingConfirmation: false,
          pendingAction: null,
        },
      });

      const store = createMockStore({
        status: 'awaiting_confirmation',
        conversationState: {
          awaitingConfirmation: true,
          pendingAction: {
            id: 'act_bkg_12345',
            confirmationToken: 'act_bkg_12345.1793190000.signature',
          },
        },
        messages: [
          {
            id: 'asst_1',
            sender: 'assistant',
            text: 'Please confirm your booking for Badminton Court.',
            timestamp: Date.now(),
            metadata: {
              actionCard: {
                type: 'confirmation',
                actionType: 'CREATE_AMENITY_BOOKING',
                actionId: 'act_bkg_12345',
                confirmationToken: 'act_bkg_12345.1793190000.signature',
                title: 'Confirm Badminton Court Booking',
                confirmLabel: 'Confirm Booking',
                cancelLabel: 'Cancel',
              },
            },
          },
        ],
      });

      await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      const confirmBtn = screen.getByLabelText('Confirm Booking');
      await act(async () => {
        fireEvent.press(confirmBtn);
      });

      await waitFor(() => {
        expect(aiAssistantApi.sendChatMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Confirm',
          }),
          expect.anything()
        );
      });
    });

    it('submits cancellation when user taps cancel button on proposal card', async () => {
      (aiAssistantApi.sendChatMessage as jest.Mock).mockResolvedValueOnce({
        message: 'Action was cancelled.',
        conversationState: {
          awaitingConfirmation: false,
          pendingAction: null,
        },
      });

      const store = createMockStore({
        status: 'awaiting_confirmation',
        conversationState: {
          awaitingConfirmation: true,
          pendingAction: {
            id: 'act_vp_99999',
            confirmationToken: 'act_vp_99999.signature',
          },
        },
        messages: [
          {
            id: 'asst_1',
            sender: 'assistant',
            text: 'I have prepared a visitor pass for Rahul.',
            timestamp: Date.now(),
            metadata: {
              actionCard: {
                type: 'confirmation',
                actionType: 'CREATE_VISITOR_PASS',
                actionId: 'act_vp_99999',
                confirmationToken: 'act_vp_99999.signature',
                title: 'Confirm Visitor Pass',
                confirmLabel: 'Confirm Pass',
                cancelLabel: 'Cancel',
              },
            },
          },
        ],
      });

      await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      const cancelBtn = screen.getByLabelText('Cancel');
      await act(async () => {
        fireEvent.press(cancelBtn);
      });

      await waitFor(() => {
        expect(aiAssistantApi.sendChatMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Cancel',
          }),
          expect.anything()
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. Multi-Module Execution Result Cards
  // --------------------------------------------------------------------------
  describe('3. Execution Result Cards for Multiple Modules', () => {
    it('displays successful action result card with reference code and navigation button for visitor pass', async () => {
      const store = createMockStore({
        status: 'idle',
        messages: [
          {
            id: 'asst_res_1',
            sender: 'assistant',
            text: 'Visitor pass created successfully for Rahul Sharma! Pass ID: VP-2026-7890, Entry Code: 492810.',
            timestamp: Date.now(),
            metadata: {
              actionCard: {
                type: 'action_result',
                status: 'success',
                actionType: 'CREATE_VISITOR_PASS',
                title: 'Visitor Pass Issued',
                referenceId: '492810',
                route: '/(resident)/visitor',
              },
            },
          },
        ],
      });

      await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      expect(screen.getByText('Visitor Pass Issued')).toBeTruthy();
      expect(screen.getByText('492810')).toBeTruthy();
      expect(screen.getByText('View in App')).toBeTruthy();
    });

    it('displays successful complaint registration card with SLA and ticket number', async () => {
      const store = createMockStore({
        status: 'idle',
        messages: [
          {
            id: 'asst_cmp_1',
            sender: 'assistant',
            text: 'Complaint registered successfully! Ticket #CMP-2026-000452. Priority: Critical. Status: Open.',
            timestamp: Date.now(),
            metadata: {
              actionCard: {
                type: 'action_result',
                status: 'success',
                actionType: 'CREATE_COMPLAINT',
                title: 'Complaint Submitted',
                referenceId: 'CMP-2026-000452',
                route: '/(resident)/complaints/manage',
              },
            },
          },
        ],
      });

      await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      expect(screen.getByText('Complaint Submitted')).toBeTruthy();
      expect(screen.getByText('CMP-2026-000452')).toBeTruthy();
      expect(screen.getByText('View in App')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // 4. TTS Toggle & Speech Cleansing
  // --------------------------------------------------------------------------
  describe('4. Text-to-Speech Control', () => {
    it('stops speech when TTS toggle button is tapped to mute', async () => {
      const stopSpy = jest.spyOn(textToSpeechService, 'stop').mockResolvedValue();

      const store = createMockStore({
        isTtsEnabled: true,
        status: 'speaking',
      });

      await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      const ttsToggle = screen.getByLabelText('Mute voice audio output');
      await act(async () => {
        fireEvent.press(ttsToggle);
      });

      expect(stopSpy).toHaveBeenCalled();
      expect(store.getState().voiceAssistant.isTtsEnabled).toBe(false);
    });
  });
});
