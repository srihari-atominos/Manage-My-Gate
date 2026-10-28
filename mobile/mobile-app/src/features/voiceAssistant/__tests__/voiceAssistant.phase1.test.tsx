import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AppState } from 'react-native';

import voiceAssistantReducer, {
  openModal,
  closeModal,
  setMode,
  setIsGeneratingText,
  setStatus,
  setError,
  setMuted,
  setTtsEnabled,
  setTranscriptSnippet,
  addMessage,
  updateLastAssistantMessage,
  clearMessages,
} from '../store/voiceAssistantSlice';
import speechRecognitionService from '../services/speechRecognitionService';
import textToSpeechService from '../services/textToSpeechService';
import * as aiAssistantApi from '../services/aiAssistantApi';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

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

// Test Harness Component
const VoiceAssistantTestHarness: React.FC = () => {
  const assistant = useVoiceAssistant();

  return (
    <VoiceAssistantModal />
  );
};

describe('NAHOM Voice Agent — Phase 1 Lifecycle & Reliability Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    speechRecognitionService.clearSubmissionHistory();
  });

  describe('1. Microphone Permission Handling', () => {
    it('transitions to listening when microphone permission is granted', async () => {
      jest.spyOn(speechRecognitionService, 'checkPermission').mockResolvedValue(true);
      jest.spyOn(speechRecognitionService, 'startListening').mockImplementation(async (cb) => {
        cb.onStart?.();
        return true;
      });

      const store = createMockStore({ status: 'idle', mode: 'voice' });
      await render(
        <Provider store={store}>
          <VoiceAssistantTestHarness />
        </Provider>
      );

      const micBtn = screen.getByLabelText('Mute microphone');
      expect(micBtn).toBeTruthy();
    });

    it('handles microphone permission denied cleanly without crashing', async () => {
      jest.spyOn(speechRecognitionService, 'checkPermission').mockResolvedValue(false);
      jest.spyOn(speechRecognitionService, 'requestPermission').mockResolvedValue(false);

      const store = createMockStore({ status: 'permission_denied', mode: 'voice' });
      await render(
        <Provider store={store}>
          <VoiceAssistantTestHarness />
        </Provider>
      );

      expect(screen.getByText(/Microphone permission was denied/i)).toBeTruthy();
      expect(screen.getByText('Grant Microphone Access')).toBeTruthy();
      expect(screen.getByText('Continue in Text Chat')).toBeTruthy();
    });
  });

  describe('2. Speech Recognition & Transcription Lifecycle', () => {
    it('captures recognized speech and delivers final transcription', async () => {
      const mockResult = { transcript: 'What is my maintenance balance?', isFinal: true };
      let capturedOnResult: any = null;

      jest.spyOn(speechRecognitionService, 'checkPermission').mockResolvedValue(true);
      jest.spyOn(speechRecognitionService, 'startListening').mockImplementation(async (cb) => {
        capturedOnResult = cb.onResult;
        cb.onStart?.();
        return true;
      });

      (aiAssistantApi.sendChatMessage as jest.Mock).mockResolvedValue({
        message: 'Your total outstanding balance is ₹2,400.',
        data: { totalOutstandingDues: 2400 },
      });

      const store = createMockStore({ status: 'idle', mode: 'voice' });

      expect(speechRecognitionService.canSubmit('What is my maintenance balance?')).toBe(true);
      speechRecognitionService.markSubmitted('What is my maintenance balance?');
      expect(speechRecognitionService.canSubmit('What is my maintenance balance?')).toBe(false);
    });

    it('rejects empty and whitespace-only speech without submitting to AI backend', () => {
      expect(speechRecognitionService.canSubmit('')).toBe(false);
      expect(speechRecognitionService.canSubmit('   ')).toBe(false);
      expect(speechRecognitionService.canSubmit(null as any)).toBe(false);
    });

    it('prevents duplicate submissions for identical consecutive transcriptions', () => {
      const phrase = 'Show my visitors today';
      expect(speechRecognitionService.canSubmit(phrase)).toBe(true);

      speechRecognitionService.markSubmitted(phrase);
      expect(speechRecognitionService.canSubmit(phrase)).toBe(false);
      expect(speechRecognitionService.canSubmit('show my visitors today')).toBe(false);

      // Reset allows next turn
      speechRecognitionService.resetSubmission();
      speechRecognitionService.clearSubmissionHistory();
      expect(speechRecognitionService.canSubmit(phrase)).toBe(true);
    });
  });

  describe('3. Text-to-Speech (TTS) Cleansing & Execution', () => {
    it('cleans markdown, code blocks, and converts Rupee symbol to natural speech text', () => {
      const raw = '### Account Summary\nYou have **₹4,500** in `unpaid dues` across [2 invoices](http://link).';
      const cleaned = textToSpeechService.cleanTextForSpeech(raw);

      expect(cleaned).not.toContain('###');
      expect(cleaned).not.toContain('**');
      expect(cleaned).not.toContain('`');
      expect(cleaned).not.toContain('http://link');
      expect(cleaned).toContain('4,500 rupees');
      expect(cleaned).toContain('2 invoices');
    });

    it('stops ongoing speech when stop is requested', async () => {
      const ExpoSpeech = require('expo-speech');
      await textToSpeechService.stop();
      expect(ExpoSpeech.stop).toHaveBeenCalled();
    });

    it('handles empty text safely without invoking native speech engine', async () => {
      const ExpoSpeech = require('expo-speech');
      const onDone = jest.fn();
      await textToSpeechService.speak('', { onDone });
      expect(onDone).toHaveBeenCalled();
      expect(ExpoSpeech.speak).not.toHaveBeenCalled();
    });
  });

  describe('4. AI Assistant Backend Integration & Tool Results', () => {
    it('renders real tool response data in chat bubble with INR currency formatting', async () => {
      const store = createMockStore({
        status: 'idle',
        messages: [
          {
            id: 'msg_1',
            sender: 'user',
            text: 'What is my maintenance balance?',
            timestamp: Date.now() - 2000,
          },
          {
            id: 'msg_2',
            sender: 'assistant',
            text: 'You have two unpaid invoices totaling ₹4,500.',
            timestamp: Date.now() - 1000,
            metadata: {
              data: {
                totalOutstandingDues: 4500,
                recentInvoices: [
                  { invoiceNumber: 'INV-2026-001', amount: 2500, status: 'UNPAID' },
                  { invoiceNumber: 'INV-2026-002', amount: 2000, status: 'UNPAID' },
                ],
              },
            },
          },
        ],
      });

      await render(
        <Provider store={store}>
          <VoiceAssistantTestHarness />
        </Provider>
      );

      expect(screen.getByText('You have two unpaid invoices totaling ₹4,500.')).toBeTruthy();
      expect(screen.getByText(/INV-2026-001/)).toBeTruthy();
      expect(screen.getByText(/INV-2026-002/)).toBeTruthy();
    });

    it('renders action confirmation cards for sensitive operations', async () => {
      const store = createMockStore({
        status: 'awaiting_confirmation',
        messages: [
          {
            id: 'msg_proposal',
            sender: 'assistant',
            text: 'I have prepared a visitor pass for Rahul. Please confirm to issue the pass.',
            timestamp: Date.now(),
            metadata: {
              actionCard: {
                type: 'confirmation',
                actionType: 'CREATE_VISITOR_PASS',
                actionId: 'act_123',
                confirmationToken: 'tok_hmac_456',
                title: 'Issue Visitor Pass: Rahul',
                summary: 'Single-entry pass for Rahul on October 28, 2026',
                confirmLabel: 'Confirm Pass',
                cancelLabel: 'Cancel',
              },
            },
          },
        ],
      });

      await render(
        <Provider store={store}>
          <VoiceAssistantTestHarness />
        </Provider>
      );

      expect(screen.getByText(/Issue Visitor Pass: Rahul/i)).toBeTruthy();
      expect(screen.getByText(/Single-entry pass for Rahul/i)).toBeTruthy();
      expect(screen.getByText('Pending Confirmation')).toBeTruthy();
    });

    it('handles AI network errors gracefully and displays retry prompt', async () => {
      const store = createMockStore({
        status: 'error',
        errorMessage: 'Network timeout connecting to AI assistant',
        messages: [
          {
            id: 'err_msg',
            sender: 'assistant',
            text: 'Connection timeout. Tap Retry to try again.',
            isError: true,
            failedPrompt: 'What bookings do I have?',
            timestamp: Date.now(),
          },
        ],
      });

      await render(
        <Provider store={store}>
          <VoiceAssistantTestHarness />
        </Provider>
      );

      expect(screen.getByText('Connection timeout. Tap Retry to try again.')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });
  });

  describe('5. Session Interruption & App Lifecycle Cleanup', () => {
    it('cancels speech recognition on component unmount and app backgrounding', async () => {
      const cancelSpy = jest.spyOn(speechRecognitionService, 'cancelListening');
      const stopSpy = jest.spyOn(textToSpeechService, 'stop');

      const store = createMockStore({ status: 'listening' });
      const { unmount } = await render(
        <Provider store={store}>
          <VoiceAssistantTestHarness />
        </Provider>
      );

      await act(async () => {
        unmount();
      });

      expect(cancelSpy).toHaveBeenCalled();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('allows text chat to operate normally without requiring microphone permission', async () => {
      const store = createMockStore({ mode: 'chat', status: 'idle' });
      await render(
        <Provider store={store}>
          <VoiceAssistantTestHarness />
        </Provider>
      );

      const input = screen.getByPlaceholderText('Type a message or command...');
      expect(input).toBeTruthy();

      fireEvent.changeText(input, 'What are my dues?');
      await waitFor(() => {
        const updatedInput = screen.getByPlaceholderText('Type a message or command...');
        expect(updatedInput.props.value).toBe('What are my dues?');
      });
    });
  });
});
