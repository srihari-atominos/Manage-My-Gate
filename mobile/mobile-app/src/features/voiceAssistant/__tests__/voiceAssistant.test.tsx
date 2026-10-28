import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import voiceAssistantReducer, {
  openModal,
  closeModal,
  setMode,
  setIsGeneratingText,
  setStatus,
  setError,
  setMuted,
  setTranscriptSnippet,
  incrementElapsed,
  setAuthorizedFeatures,
  setLastNavigatedScreen,
  setConversationState,
  resetVoiceSession,
  addMessage,
  updateLastAssistantMessage,
  clearMessages,
} from '../store/voiceAssistantSlice';
import { VoiceStateBadge } from '../components/VoiceStateBadge';
import { VoiceWaveform } from '../components/VoiceWaveform';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';
import { GeminiLiveSocket } from '../services/geminiLiveSocket';
import {
  validateVoiceNavigation,
  ALLOWED_VOICE_SCREENS,
} from '../services/voiceNavigationGuard';
import audioStreamService from '../services/audioStreamService';

// Mock audioStreamService
jest.mock('../services/audioStreamService', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn().mockReturnValue(true),
    checkMicrophonePermission: jest.fn().mockResolvedValue(true),
    requestMicrophonePermission: jest.fn().mockResolvedValue(true),
    startCapture: jest.fn().mockResolvedValue(true),
    stopCapture: jest.fn().mockResolvedValue(undefined),
    initPlayback: jest.fn().mockResolvedValue(undefined),
    playChunk: jest.fn().mockResolvedValue(undefined),
    clearPlayback: jest.fn().mockResolvedValue(undefined),
    stopPlayback: jest.fn().mockResolvedValue(undefined),
  },
  audioStreamService: {
    isSupported: jest.fn().mockReturnValue(true),
    checkMicrophonePermission: jest.fn().mockResolvedValue(true),
    requestMicrophonePermission: jest.fn().mockResolvedValue(true),
    startCapture: jest.fn().mockResolvedValue(true),
    stopCapture: jest.fn().mockResolvedValue(undefined),
    initPlayback: jest.fn().mockResolvedValue(undefined),
    playChunk: jest.fn().mockResolvedValue(undefined),
    clearPlayback: jest.fn().mockResolvedValue(undefined),
    stopPlayback: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock API calls
const mockReleaseSession = jest.fn().mockResolvedValue({ released: true });
const mockRequestSessionToken = jest.fn().mockResolvedValue({
  token: 'mock-ephemeral-token',
  expireTime: '2026-10-27T12:00:00Z',
  liveEndpoint: 'wss://generativelanguage.googleapis.com/ws/live',
  model: 'gemini-3.8-live',
  authorizedFeatures: [
    { id: 'amenities_discover', name: 'Discover Amenities', description: 'Book sports courts', route: '/(resident)/amenities/discover' },
    { id: 'billing_wallet', name: 'Digital Wallet', description: 'Prepaid balance', route: '/(resident)/billing/wallet' },
    { id: 'complaints_raise_ticket', name: 'Raise Ticket', description: 'Submit complaint', route: '/(resident)/complaints/raise-ticket' },
  ],
  sessionDurationSeconds: 180,
});

jest.mock('../services/aiAssistantApi', () => ({
  fetchAssistantConfig: jest.fn().mockResolvedValue({ enabled: true }),
  requestSessionToken: () => mockRequestSessionToken(),
  releaseAssistantSession: () => mockReleaseSession(),
}));

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: jest.fn() }),
}));

const createMockStore = (initialStateOverride = {}) => {
  return configureStore({
    reducer: {
      voiceAssistant: voiceAssistantReducer,
    },
    preloadedState: {
      voiceAssistant: {
        status: 'idle',
        mode: 'chat',
        isModalOpen: false,
        isMuted: false,
        isGeneratingText: false,
        errorMessage: null,
        transcriptSnippet: '',
        elapsedSeconds: 0,
        maxDurationSeconds: 180,
        authorizedFeatures: [],
        lastNavigatedScreen: null,
        conversationState: null,
        messages: [],
        ...initialStateOverride,
      },
    },
  });
};

describe('NAHOM Real-Time AI Voice Assistant — Hardened Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).WebSocket = Object.assign(jest.fn(), {
      OPEN: 1,
      CLOSED: 3,
      CLOSING: 2,
      CONNECTING: 0,
    });
  });

  describe('1. Redux Slice State Reducers', () => {
    it('initializes with default idle state', () => {
      const store = createMockStore();
      const state = store.getState().voiceAssistant;
      expect(state.status).toBe('idle');
      expect(state.isModalOpen).toBe(false);
      expect(state.isMuted).toBe(false);
      expect(state.maxDurationSeconds).toBe(180);
      expect(state.elapsedSeconds).toBe(0);
    });

    it('opens and closes modal correctly', () => {
      const store = createMockStore();
      store.dispatch(openModal());
      expect(store.getState().voiceAssistant.isModalOpen).toBe(true);

      store.dispatch(closeModal());
      expect(store.getState().voiceAssistant.isModalOpen).toBe(false);
      expect(store.getState().voiceAssistant.status).toBe('idle');
    });

    it('updates status and resets error message on non-error status', () => {
      const store = createMockStore({ errorMessage: 'Old error' });
      store.dispatch(setStatus('listening'));
      expect(store.getState().voiceAssistant.status).toBe('listening');
      expect(store.getState().voiceAssistant.errorMessage).toBeNull();
    });

    it('sets error status and stores message', () => {
      const store = createMockStore();
      store.dispatch(setError('Microphone hardware failure'));
      expect(store.getState().voiceAssistant.status).toBe('error');
      expect(store.getState().voiceAssistant.errorMessage).toBe('Microphone hardware failure');
    });

    it('handles mute toggle correctly when listening', () => {
      const store = createMockStore({ status: 'listening' });
      store.dispatch(setMuted(true));
      expect(store.getState().voiceAssistant.isMuted).toBe(true);
      expect(store.getState().voiceAssistant.status).toBe('muted');

      store.dispatch(setMuted(false));
      expect(store.getState().voiceAssistant.isMuted).toBe(false);
      expect(store.getState().voiceAssistant.status).toBe('listening');
    });

    it('increments elapsed duration seconds', () => {
      const store = createMockStore({ elapsedSeconds: 10 });
      store.dispatch(incrementElapsed());
      expect(store.getState().voiceAssistant.elapsedSeconds).toBe(11);
    });

    it('sets authorized features and last navigated screen', () => {
      const store = createMockStore();
      const features = [
        { id: 'visitor_resident_passes', name: 'Passes', description: 'Gate pass', route: '/visitor' },
      ];
      store.dispatch(setAuthorizedFeatures(features));
      expect(store.getState().voiceAssistant.authorizedFeatures).toHaveLength(1);

      store.dispatch(setLastNavigatedScreen('Passes'));
      expect(store.getState().voiceAssistant.lastNavigatedScreen).toBe('Passes');
    });

    it('resets temporary session state on resetVoiceSession', () => {
      const store = createMockStore({
        status: 'speaking',
        isMuted: true,
        transcriptSnippet: 'Hello NAHOM',
        elapsedSeconds: 45,
        lastNavigatedScreen: 'Passes',
      });
      store.dispatch(resetVoiceSession());
      const state = store.getState().voiceAssistant;
      expect(state.status).toBe('idle');
      expect(state.isMuted).toBe(false);
      expect(state.transcriptSnippet).toBe('');
      expect(state.elapsedSeconds).toBe(0);
      expect(state.lastNavigatedScreen).toBeNull();
    });

    it('adds messages and updates assistant messages correctly', () => {
      const store = createMockStore();
      store.dispatch(
        addMessage({
          id: 'msg-1',
          sender: 'user',
          text: 'Get my amenities data',
          timestamp: Date.now(),
        })
      );
      store.dispatch(
        addMessage({
          id: 'msg-2',
          sender: 'assistant',
          text: 'Fetching...',
          timestamp: Date.now(),
        })
      );
      expect(store.getState().voiceAssistant.messages).toHaveLength(2);
      expect(store.getState().voiceAssistant.messages[0].text).toBe('Get my amenities data');

      store.dispatch(updateLastAssistantMessage('Here are the available amenities in your community.'));
      expect(store.getState().voiceAssistant.messages[1].text).toBe('Here are the available amenities in your community.');

      store.dispatch(clearMessages());
      const state = store.getState().voiceAssistant;
      expect(state.messages).toHaveLength(0);
      expect(state.conversationState).toBeNull();
      expect(state.errorMessage).toBeNull();
      expect(state.transcriptSnippet).toBe('');
      expect(state.lastNavigatedScreen).toBeNull();
    });

    it('handles mode switching and generating text states in unified assistant', () => {
      const store = createMockStore();
      expect(store.getState().voiceAssistant.mode).toBe('chat');

      store.dispatch(setMode('voice'));
      expect(store.getState().voiceAssistant.mode).toBe('voice');

      store.dispatch(setIsGeneratingText(true));
      expect(store.getState().voiceAssistant.isGeneratingText).toBe(true);

      store.dispatch(setIsGeneratingText(false));
      expect(store.getState().voiceAssistant.isGeneratingText).toBe(false);
    });

    it('tracks and resets conversationState across multi-turn turns', () => {
      const store = createMockStore();
      expect(store.getState().voiceAssistant.conversationState).toBeNull();

      store.dispatch(
        setConversationState({
          activeIntent: 'amenity_booking',
          workflow: 'amenity_booking_intake',
          collectedDetails: { amenityName: 'Clubhouse' },
          missingFields: ['date', 'slotTime'],
          interactionType: 'clarification',
          awaitingConfirmation: false,
        })
      );

      const state = store.getState().voiceAssistant;
      expect(state.conversationState?.activeIntent).toBe('amenity_booking');
      expect(state.conversationState?.collectedDetails?.amenityName).toBe('Clubhouse');
      expect(state.conversationState?.interactionType).toBe('clarification');

      store.dispatch(resetVoiceSession());
      expect(store.getState().voiceAssistant.conversationState).toBeNull();
    });
  });

  describe('2. VoiceStateBadge Component', () => {
    it('renders listening badge correctly', async () => {
      const { getByText } = await render(<VoiceStateBadge status="listening" />);
      expect(getByText('Listening')).toBeTruthy();
    });

    it('renders speaking badge correctly', async () => {
      const { getByText } = await render(<VoiceStateBadge status="speaking" />);
      expect(getByText('Speaking')).toBeTruthy();
    });

    it('renders muted badge correctly', async () => {
      const { getByText } = await render(<VoiceStateBadge status="muted" />);
      expect(getByText('Muted')).toBeTruthy();
    });

    it('renders mic denied badge correctly', async () => {
      const { getByText } = await render(<VoiceStateBadge status="permission_denied" />);
      expect(getByText('Mic Denied')).toBeTruthy();
    });
  });

  describe('3. VoiceWaveform Component', () => {
    it('renders waveform visualizer with accessibility label', async () => {
      const { getByLabelText } = await render(<VoiceWaveform status="speaking" barCount={5} />);
      const visualizer = getByLabelText('Voice audio visualization, status is speaking');
      expect(visualizer).toBeTruthy();
    });
  });

  describe('4. VoiceAssistantModal UI Component', () => {
    it('renders mode switch pills (Chat / Live Voice) in unified assistant', async () => {
      const store = createMockStore({
        isModalOpen: true,
        mode: 'chat',
        status: 'idle',
      });
      const { getByText, getByLabelText } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      expect(getByText('Chat')).toBeTruthy();
      expect(getByText('Live Voice')).toBeTruthy();
      expect(getByLabelText('Activate live voice mode')).toBeTruthy();
    });

    it('renders guidance text when listening', async () => {
      const store = createMockStore({ isModalOpen: true, status: 'listening' });
      const { getByTestId } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );
      const helper = getByTestId('voice-status-helper-text');
      expect(helper.props.children).toContain('Listening');
    });

    it('renders permission denied instructions and action button', async () => {
      const store = createMockStore({ isModalOpen: true, status: 'permission_denied' });
      const { getByText, getByLabelText } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );
      expect(getByText(/Microphone permission was denied/i)).toBeTruthy();
      expect(getByLabelText('Grant microphone permission')).toBeTruthy();
    });

    it('renders live transcript snippet when available', async () => {
      const store = createMockStore({
        isModalOpen: true,
        status: 'speaking',
        transcriptSnippet: 'Sure, navigating you to amenity discover.',
      });
      const { getByText } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );
      expect(getByText('Sure, navigating you to amenity discover.')).toBeTruthy();
    });

    it('renders navigation feedback banner when lastNavigatedScreen is set', async () => {
      const store = createMockStore({
        isModalOpen: true,
        status: 'listening',
        lastNavigatedScreen: 'Discover Amenities',
      });
      const { getByText } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );
      expect(getByText('Discover Amenities')).toBeTruthy();
    });

    it('renders quick suggestion chips and text input bar during active session', async () => {
      const store = createMockStore({
        isModalOpen: true,
        status: 'listening',
      });
      const { getByText, getByPlaceholderText } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      expect(getByText('Check Amenities')).toBeTruthy();
      expect(getByText('My Bookings')).toBeTruthy();
      expect(getByPlaceholderText('Type a message or command...')).toBeTruthy();
    });

    it('renders conversation bubbles and interactive cards for messages', async () => {
      const store = createMockStore({
        isModalOpen: true,
        status: 'listening',
        messages: [
          {
            id: 'm-1',
            sender: 'user',
            text: 'Show my amenities',
            timestamp: Date.now(),
          },
          {
            id: 'm-2',
            sender: 'assistant',
            text: 'Here are the available amenities in your community.',
            timestamp: Date.now(),
            metadata: {
              targetName: 'Discover Amenities',
              targetRoute: '/(resident)/amenities',
              category: 'amenities',
            },
          },
        ],
      });
      const { getByText } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      expect(getByText('Show my amenities')).toBeTruthy();
      expect(getByText('Here are the available amenities in your community.')).toBeTruthy();
      expect(getByText('Discover Amenities')).toBeTruthy();
      expect(getByText('Tap to view details and options')).toBeTruthy();
    });

    it('renders Retry button on failed message and allows retrying failed prompts', async () => {
      const store = createMockStore({
        isModalOpen: true,
        mode: 'chat',
        status: 'idle',
        messages: [
          {
            id: 'u_1',
            sender: 'user',
            text: 'Check amenities',
            timestamp: Date.now() - 5000,
          },
          {
            id: 'a_1',
            sender: 'assistant',
            text: 'AI Assistant service is not configured on this server.',
            timestamp: Date.now() - 3000,
            isError: true,
            failedPrompt: 'Check amenities',
          },
        ],
      });
      const { getByText, getByLabelText } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      expect(getByText('AI Assistant service is not configured on this server.')).toBeTruthy();
      expect(getByText('Request failed')).toBeTruthy();
      const retryBtn = getByLabelText('Retry sending message');
      expect(retryBtn).toBeTruthy();
      fireEvent.press(retryBtn);
    });

    it('suppresses rendering of empty assistant placeholder messages without content', async () => {
      const store = createMockStore({
        isModalOpen: true,
        mode: 'chat',
        status: 'idle',
        messages: [
          {
            id: 'u_1',
            sender: 'user',
            text: 'What are the rules?',
            timestamp: Date.now() - 2000,
          },
          {
            id: 'a_empty',
            sender: 'assistant',
            text: '',
            timestamp: Date.now() - 1000,
          },
        ],
      });
      const { getByText, queryByText } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      expect(getByText('What are the rules?')).toBeTruthy();
      expect(queryByText('NAHOM is thinking...')).toBeNull();
    });

    it('renders Clear Chat button when messages exist and resets conversation on press', async () => {
      const store = createMockStore({
        isModalOpen: true,
        mode: 'chat',
        status: 'idle',
        messages: [
          {
            id: 'm-1',
            sender: 'user',
            text: 'Hello assistant',
            timestamp: Date.now() - 2000,
          },
          {
            id: 'm-2',
            sender: 'assistant',
            text: 'Hello! How can I help you today?',
            timestamp: Date.now() - 1000,
          },
        ],
      });
      const { getByTestId } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      const clearBtn = getByTestId('clear-chat-button');
      expect(clearBtn).toBeTruthy();

      fireEvent.press(clearBtn);

      const state = store.getState().voiceAssistant;
      expect(state.messages).toHaveLength(0);
      expect(state.conversationState).toBeNull();
    });

    it('disables text input and send button when isGeneratingText is active', async () => {
      const store = createMockStore({
        isModalOpen: true,
        mode: 'chat',
        isGeneratingText: true,
      });
      const { getByLabelText, getByPlaceholderText } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      const input = getByPlaceholderText('Type a message or command...');
      expect(input.props.editable).toBe(false);
      const stopBtn = getByLabelText('Stop response');
      expect(stopBtn).toBeTruthy();
    });

    it('renders Mute and End Call buttons during active session and handles press', async () => {
      const store = createMockStore({
        isModalOpen: true,
        status: 'listening',
        isMuted: false,
      });
      const { getByLabelText } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      const muteBtn = getByLabelText('Mute microphone');
      expect(muteBtn).toBeTruthy();
      fireEvent.press(muteBtn);
      expect(store.getState().voiceAssistant.isMuted).toBe(true);

      const endCallBtn = getByLabelText('End voice assistant session');
      expect(endCallBtn).toBeTruthy();
      fireEvent.press(endCallBtn);
      await waitFor(() => {
        expect(store.getState().voiceAssistant.isModalOpen).toBe(false);
        expect(store.getState().voiceAssistant.status).toBe('idle');
      });
    });
  });

  describe('5. Gemini Live WebSocket Protocol', () => {
    it('formats setup payload correctly with navigate_to_screen tool', async () => {
      let sentPayload: any = null;
      const mockWs: any = {
        readyState: 1, // OPEN
        send: jest.fn((data) => {
          sentPayload = JSON.parse(data);
        }),
        close: jest.fn(),
      };

      (global as any).WebSocket = Object.assign(jest.fn(() => mockWs), {
        OPEN: 1,
        CLOSED: 3,
        CLOSING: 2,
        CONNECTING: 0,
      });

      const socket = new GeminiLiveSocket({});
      const connectPromise = socket.connect(
        'wss://generativelanguage.googleapis.com/ws/live',
        'test-token',
        'gemini-3.8-live',
        'Puck',
        [{ id: 'billing_wallet', name: 'Wallet', description: 'Prepaid', route: '/wallet' }]
      );

      mockWs.onopen();
      await connectPromise;

      expect(mockWs.send).toHaveBeenCalled();
      expect(sentPayload?.setup?.model).toBe('models/gemini-3.8-live');
      expect(sentPayload?.setup?.generationConfig?.responseModalities).toEqual(['AUDIO']);
      expect(sentPayload?.setup?.tools[0]?.functionDeclarations[0]?.name).toBe('navigate_to_screen');
    });

    it('formats clientContent message correctly when sending text message', async () => {
      let sentPayload: any = null;
      const mockWs: any = {
        readyState: 1, // OPEN
        send: jest.fn((data) => {
          sentPayload = JSON.parse(data);
        }),
        close: jest.fn(),
      };

      (global as any).WebSocket = Object.assign(jest.fn(() => mockWs), {
        OPEN: 1,
        CLOSED: 3,
        CLOSING: 2,
        CONNECTING: 0,
      });

      const socket = new GeminiLiveSocket({});
      const connectPromise = socket.connect('wss://example.com', 'token', 'model');
      mockWs.onopen();
      await connectPromise;

      // Simulate setupComplete
      mockWs.onmessage({ data: JSON.stringify({ setupComplete: {} }) });

      const sent = socket.sendTextMessage('get my amenities data');
      expect(sent).toBe(true);
      expect(sentPayload?.clientContent?.turns[0]?.parts[0]?.text).toBe('get my amenities data');
      expect(sentPayload?.clientContent?.turnComplete).toBe(true);
    });

    it('triggers onInterrupted callback and clears audio buffer on barge-in', () => {
      const onInterruptedMock = jest.fn();
      const mockWs: any = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
      };
      (global as any).WebSocket = Object.assign(jest.fn(() => mockWs), {
        OPEN: 1,
        CLOSED: 3,
        CLOSING: 2,
        CONNECTING: 0,
      });

      const socket = new GeminiLiveSocket({ onInterrupted: onInterruptedMock });
      socket.connect('wss://example.com', 'token', 'model');
      mockWs.onopen();

      // Simulate Gemini sending serverContent with interrupted: true
      mockWs.onmessage({
        data: JSON.stringify({
          serverContent: {
            interrupted: true,
          },
        }),
      });

      expect(onInterruptedMock).toHaveBeenCalledTimes(1);
    });

    it('triggers onToolCall callback for function declarations', () => {
      const onToolCallMock = jest.fn();
      const mockWs: any = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
      };
      (global as any).WebSocket = Object.assign(jest.fn(() => mockWs), {
        OPEN: 1,
        CLOSED: 3,
        CLOSING: 2,
        CONNECTING: 0,
      });

      const socket = new GeminiLiveSocket({ onToolCall: onToolCallMock });
      socket.connect('wss://example.com', 'token', 'model');
      mockWs.onopen();

      mockWs.onmessage({
        data: JSON.stringify({
          toolCall: {
            functionCalls: [
              {
                id: 'call_123',
                name: 'navigate_to_screen',
                args: { screenId: 'billing_wallet' },
              },
            ],
          },
        }),
      });

      expect(onToolCallMock).toHaveBeenCalledWith('call_123', 'navigate_to_screen', {
        screenId: 'billing_wallet',
      });
    });
  });

  describe('6. Role-Aware Navigation Guard (Strict Allowlisting & Hardening)', () => {
    const authorizedFeatures = [
      { id: 'amenities_discover', name: 'Discover Amenities', description: 'Book facility', route: '/(resident)/amenities/discover' },
      { id: 'billing_wallet', name: 'Digital Wallet', description: 'Prepaid ledger', route: '/(resident)/billing/wallet' },
    ];

    it('allows navigation to a known screen present in authorizedFeatures', () => {
      const decision = validateVoiceNavigation(
        'navigate_to_screen',
        { screenId: 'amenities_discover' },
        authorizedFeatures
      );

      expect(decision.allowed).toBe(true);
      expect(decision.screenId).toBe('amenities_discover');
      expect(decision.targetRoute).toBe(ALLOWED_VOICE_SCREENS.amenities_discover.route);
      expect(decision.targetName).toBe('Discover Amenities');
    });

    it('rejects navigation if screenId is unknown to the static catalog', () => {
      const decision = validateVoiceNavigation(
        'navigate_to_screen',
        { screenId: 'completely_unknown_feature' },
        authorizedFeatures
      );

      expect(decision.allowed).toBe(false);
      expect(decision.error).toContain('not a registered voice navigation target');
    });

    it('rejects navigation if screenId is in static catalog but NOT in user authorizedFeatures', () => {
      // 'visitor_admin_dashboard' is in ALLOWED_VOICE_SCREENS, but NOT in this resident's authorizedFeatures
      const decision = validateVoiceNavigation(
        'navigate_to_screen',
        { screenId: 'visitor_admin_dashboard' },
        authorizedFeatures
      );

      expect(decision.allowed).toBe(false);
      expect(decision.error).toContain('does not have permission');
    });

    it('rejects path traversal and arbitrary route strings in screenId', () => {
      const decision = validateVoiceNavigation(
        'navigate_to_screen',
        { screenId: '../../etc/passwd' },
        authorizedFeatures
      );

      expect(decision.allowed).toBe(false);
      expect(decision.error).toContain('Invalid screenId format');
    });

    it('rejects malformed arguments (null, empty, or non-object)', () => {
      expect(validateVoiceNavigation('navigate_to_screen', null, authorizedFeatures).allowed).toBe(false);
      expect(validateVoiceNavigation('navigate_to_screen', undefined, authorizedFeatures).allowed).toBe(false);
      expect(validateVoiceNavigation('navigate_to_screen', {}, authorizedFeatures).allowed).toBe(false);
      expect(validateVoiceNavigation('navigate_to_screen', { screenId: '' }, authorizedFeatures).allowed).toBe(false);
      expect(validateVoiceNavigation('navigate_to_screen', { screenId: 12345 }, authorizedFeatures).allowed).toBe(false);
    });

    it('rejects unpermitted function names (e.g. payment or mutation functions)', () => {
      const decision = validateVoiceNavigation(
        'execute_payment',
        { amount: 500 },
        authorizedFeatures
      );

      expect(decision.allowed).toBe(false);
      expect(decision.error).toContain("Unsupported function 'execute_payment'");
    });
  });

  describe('7. Audio Lifecycle & Session Cleanup Invariants', () => {
    it('idempotently handles repeated stopCapture calls without throwing', async () => {
      await expect(audioStreamService.stopCapture()).resolves.not.toThrow();
      await expect(audioStreamService.stopCapture()).resolves.not.toThrow();
    });

    it('idempotently handles repeated stopPlayback calls without throwing', async () => {
      await expect(audioStreamService.stopPlayback()).resolves.not.toThrow();
      await expect(audioStreamService.stopPlayback()).resolves.not.toThrow();
    });

    it('idempotently handles clearPlayback without active stream', async () => {
      await expect(audioStreamService.clearPlayback()).resolves.not.toThrow();
    });
  });
});
