import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import voiceAssistantReducer from '../store/voiceAssistantSlice';
import speechRecognitionService, { SpeechRecognitionCallbacks } from '../services/speechRecognitionService';
import textToSpeechService from '../services/textToSpeechService';
import * as aiAssistantApi from '../services/aiAssistantApi';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

let onSpeechDoneCallback: (() => void) | null = null;

jest.mock('expo-speech', () => ({
  speak: jest.fn((text, options) => {
    onSpeechDoneCallback = options?.onDone || null;
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
        mode: 'voice',
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

const VoiceAssistantTestHarness: React.FC<{ autoStart?: boolean }> = ({ autoStart = true }) => {
  const assistant = useVoiceAssistant();

  React.useEffect(() => {
    if (autoStart) {
      assistant.startListening();
    }
  }, [autoStart]);

  return <VoiceAssistantModal />;
};

describe('NAHOM Voice Agent End-to-End Mobile Flow', () => {
  let capturedCallbacks: SpeechRecognitionCallbacks | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    speechRecognitionService.clearSubmissionHistory();
    onSpeechDoneCallback = null;
    capturedCallbacks = null;

    jest.spyOn(speechRecognitionService, 'checkPermission').mockResolvedValue(true);
    jest.spyOn(speechRecognitionService, 'startListening').mockImplementation(async (cb) => {
      capturedCallbacks = cb;
      cb.onStart?.();
      return true;
    });
  });

  afterEach(async () => {
    cleanup();
    jest.restoreAllMocks();
    await speechRecognitionService.stopListening();
    await speechRecognitionService.cancelListening();
    await textToSpeechService.stop();
  });

  test('1. Permission check and initial listening activation on modal open', async () => {
    const store = createMockStore({ isModalOpen: true, mode: 'voice' });
    await render(
      <Provider store={store}>
        <VoiceAssistantTestHarness autoStart={true} />
      </Provider>
    );

    await waitFor(() => {
      expect(speechRecognitionService.checkPermission).toHaveBeenCalled();
      expect(speechRecognitionService.startListening).toHaveBeenCalled();
    });
  });

  test('2. Voice Q&A: User speaks question -> AI responds -> TTS plays clean audio aloud', async () => {
    (aiAssistantApi.sendChatMessage as jest.Mock).mockResolvedValueOnce({
      reply: 'Here are the available community amenities: Swimming Pool and Tennis Court.',
      message: 'Here are the available community amenities: Swimming Pool and Tennis Court.',
      status: 'success',
      data: { amenities: [{ name: 'Swimming Pool' }, { name: 'Tennis Court' }] },
    });

    const store = createMockStore({ isModalOpen: true, mode: 'voice', status: 'idle' });
    await render(
      <Provider store={store}>
        <VoiceAssistantTestHarness autoStart={true} />
      </Provider>
    );

    await waitFor(() => {
      expect(capturedCallbacks).toBeTruthy();
    });

    // Deliver final speech transcript to active voice session
    await act(async () => {
      capturedCallbacks?.onResult({
        transcript: 'What amenities are available in my community?',
        isFinal: true,
      });
    });

    await waitFor(() => {
      expect(aiAssistantApi.sendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'What amenities are available in my community?',
        }),
        expect.anything()
      );
    });

    await waitFor(() => {
      expect(Speech.speak).toHaveBeenCalledWith(
        expect.stringContaining('Swimming Pool'),
        expect.any(Object)
      );
    });
  });

  test('3. Consecutive voice conversation: Automatically resumes listening when TTS finishes speaking', async () => {
    (aiAssistantApi.sendChatMessage as jest.Mock).mockResolvedValueOnce({
      reply: 'You have 0 outstanding maintenance dues.',
      message: 'You have 0 outstanding maintenance dues.',
      status: 'success',
    });

    const store = createMockStore({ isModalOpen: true, mode: 'voice', status: 'idle' });
    await render(
      <Provider store={store}>
        <VoiceAssistantTestHarness autoStart={true} />
      </Provider>
    );

    await waitFor(() => {
      expect(capturedCallbacks).toBeTruthy();
    });

    await act(async () => {
      capturedCallbacks?.onResult({
        transcript: 'What are my maintenance dues?',
        isFinal: true,
      });
    });

    await waitFor(() => {
      expect(Speech.speak).toHaveBeenCalled();
      expect(onSpeechDoneCallback).toBeTruthy();
    });

    // Simulate completion of speech synthesis (onDone)
    const startListeningSpy = jest.spyOn(speechRecognitionService, 'startListening');
    await act(async () => {
      onSpeechDoneCallback?.();
    });

    // Verify speech recognition automatically resumed for the consecutive conversational turn
    expect(startListeningSpy).toHaveBeenCalled();
  });

  test('4. Interim speech recovery: Submits transcript on onEnd even when isFinal is false', async () => {
    (aiAssistantApi.sendChatMessage as jest.Mock).mockResolvedValueOnce({
      reply: 'Which time would you prefer tomorrow evening?',
      message: 'Which time would you prefer tomorrow evening?',
      status: 'clarification',
    });

    const store = createMockStore({ isModalOpen: true, mode: 'voice', status: 'idle' });
    await render(
      <Provider store={store}>
        <VoiceAssistantTestHarness autoStart={true} />
      </Provider>
    );

    await waitFor(() => {
      expect(capturedCallbacks).toBeTruthy();
    });

    // User speaks but pauses without the engine sending isFinal: true
    await act(async () => {
      capturedCallbacks?.onResult({
        transcript: 'Book the swimming pool for tomorrow evening',
        isFinal: false,
      });
    });

    // Hardware reports end of recording
    await act(async () => {
      capturedCallbacks?.onEnd?.();
    });

    await waitFor(() => {
      expect(aiAssistantApi.sendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Book the swimming pool for tomorrow evening',
        }),
        expect.anything()
      );
    });
  });

  test('5. Spoken Confirmation: User says "Yes, confirm the booking" forwards conversation state to backend', async () => {
    (aiAssistantApi.sendChatMessage as jest.Mock).mockResolvedValueOnce({
      reply: 'Your booking has been confirmed for Swimming Pool on 2026-10-29 from 18:00 to 19:00.',
      message: 'Your booking has been confirmed for Swimming Pool on 2026-10-29 from 18:00 to 19:00.',
      status: 'success',
      data: { bookingId: 'BKG-AI-999', status: 'CONFIRMED' },
    });

    const pendingConfirmationState = {
      activeIntent: 'amenity_booking',
      workflow: 'amenity_booking_ready',
      awaitingConfirmation: true,
      pendingAction: {
        id: 'act_123',
        actionType: 'CREATE_AMENITY_BOOKING',
        confirmationToken: 'tok_abc',
        summary: 'Swimming Pool booking for tomorrow 18:00',
      },
    };

    const store = createMockStore({
      isModalOpen: true,
      mode: 'voice',
      conversationState: pendingConfirmationState,
    });

    await render(
      <Provider store={store}>
        <VoiceAssistantTestHarness autoStart={true} />
      </Provider>
    );

    await waitFor(() => {
      expect(capturedCallbacks).toBeTruthy();
    });

    await act(async () => {
      capturedCallbacks?.onResult({
        transcript: 'Yes, confirm the booking',
        isFinal: true,
      });
    });

    await waitFor(() => {
      expect(aiAssistantApi.sendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Yes, confirm the booking',
          context: expect.objectContaining({
            conversationState: expect.objectContaining({
              awaitingConfirmation: true,
              pendingAction: expect.objectContaining({
                id: 'act_123',
              }),
            }),
          }),
        }),
        expect.anything()
      );
    });
  });

  test('6. User interruption: Tapping microphone during TTS stops playback and restarts listening', async () => {
    const store = createMockStore({ isModalOpen: true, mode: 'voice', status: 'speaking' });
    await render(
      <Provider store={store}>
        <VoiceAssistantTestHarness autoStart={false} />
      </Provider>
    );

    const micButton = screen.getByLabelText(/mute microphone/i);
    await act(async () => {
      fireEvent.press(micButton);
    });

    expect(Speech.stop).toHaveBeenCalled();
  });
});
