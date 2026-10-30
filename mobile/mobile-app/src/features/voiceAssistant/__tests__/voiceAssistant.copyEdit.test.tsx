import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Clipboard } from 'react-native';
import voiceAssistantReducer, {
  editAndTruncateMessages,
  AssistantMessage,
} from '../store/voiceAssistantSlice';
import { VoiceAssistantChatBubble } from '../components/VoiceAssistantChatBubble';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';
import * as aiAssistantApi from '../services/aiAssistantApi';

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
    authorizedFeatures: [],
  }),
  sendChatMessage: jest.fn(),
  executeAssistantTool: jest.fn(),
  requestSessionToken: jest.fn().mockResolvedValue({ token: 'test-token' }),
  releaseAssistantSession: jest.fn().mockResolvedValue({ released: true }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), pathname: '/(resident)/dashboard' }),
}));

const createMockStore = (messages: AssistantMessage[] = []) => {
  return configureStore({
    reducer: {
      voiceAssistant: voiceAssistantReducer,
      auth: () => ({ user: { id: 'u1', role: 'resident' } }),
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
        authorizedFeatures: [],
        lastNavigatedScreen: null,
        conversationState: null,
        messages,
      },
    },
  });
};

describe('VoiceAssistant Chat: Copy and Edit Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (!Clipboard.setString) {
      Clipboard.setString = jest.fn();
    } else {
      jest.spyOn(Clipboard, 'setString');
    }
  });

  describe('1. Redux Store: editAndTruncateMessages', () => {
    it('updates user message and truncates all messages after it', () => {
      const initialState = {
        status: 'idle' as const,
        mode: 'chat' as const,
        isModalOpen: true,
        isMuted: false,
        isTtsEnabled: true,
        isGeneratingText: false,
        errorMessage: null,
        transcriptSnippet: 'something',
        elapsedSeconds: 0,
        maxDurationSeconds: 600,
        authorizedFeatures: [],
        lastNavigatedScreen: null,
        conversationState: null,
        messages: [
          { id: 'msg-1', sender: 'user' as const, text: 'Hello', timestamp: 1000 },
          { id: 'msg-2', sender: 'assistant' as const, text: 'Hi! How can I help?', timestamp: 1001 },
          { id: 'msg-3', sender: 'user' as const, text: 'Book tennis', timestamp: 1002 },
          { id: 'msg-4', sender: 'assistant' as const, text: 'At what time?', timestamp: 1003 },
        ],
      };

      const updated = voiceAssistantReducer(
        initialState,
        editAndTruncateMessages({ messageId: 'msg-3', newText: 'Book badminton court' })
      );

      expect(updated.messages).toHaveLength(3);
      expect(updated.messages[2].id).toBe('msg-3');
      expect(updated.messages[2].text).toBe('Book badminton court');
      expect(updated.transcriptSnippet).toBe('');
      expect(updated.errorMessage).toBeNull();
    });

    it('handles non-existent message ID safely without mutating messages', () => {
      const initialState = {
        status: 'idle' as const,
        mode: 'chat' as const,
        isModalOpen: true,
        isMuted: false,
        isTtsEnabled: true,
        isGeneratingText: false,
        errorMessage: null,
        transcriptSnippet: '',
        elapsedSeconds: 0,
        maxDurationSeconds: 600,
        authorizedFeatures: [],
        lastNavigatedScreen: null,
        conversationState: null,
        messages: [
          { id: 'msg-1', sender: 'user' as const, text: 'Hello', timestamp: 1000 },
        ],
      };

      const result = voiceAssistantReducer(
        initialState,
        editAndTruncateMessages({ messageId: 'non-existent', newText: 'Updated' })
      );

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].text).toBe('Hello');
    });
  });

  describe('2. VoiceAssistantChatBubble: Copy Functionality', () => {
    it('renders copy button on assistant message and copies response text', async () => {
      const assistantMsg: AssistantMessage = {
        id: 'ast-1',
        sender: 'assistant',
        text: 'Your current month dues are ₹2,500.',
        timestamp: Date.now(),
      };

      const { getByTestId, findByText } = await render(
        <VoiceAssistantChatBubble message={assistantMsg} />
      );

      const copyBtn = getByTestId('copy-assistant-msg-ast-1');
      expect(copyBtn).toBeTruthy();

      await act(async () => {
        fireEvent.press(copyBtn);
      });

      expect(Clipboard.setString).toHaveBeenCalledWith('Your current month dues are ₹2,500.');
      const copiedText = await findByText(/copied/i);
      expect(copiedText).toBeTruthy();
    });

    it('renders copy button on user message and copies prompt text', async () => {
      const userMsg: AssistantMessage = {
        id: 'usr-1',
        sender: 'user',
        text: 'Create a visitor pass for John Doe',
        timestamp: Date.now(),
      };

      const { getByTestId } = await render(
        <VoiceAssistantChatBubble message={userMsg} />
      );

      const copyBtn = getByTestId('copy-user-msg-usr-1');
      expect(copyBtn).toBeTruthy();

      await act(async () => {
        fireEvent.press(copyBtn);
      });

      expect(Clipboard.setString).toHaveBeenCalledWith('Create a visitor pass for John Doe');
    });
  });

  describe('3. VoiceAssistantChatBubble: Edit Functionality', () => {
    it('renders edit button on user message and allows inline editing and updating', async () => {
      const userMsg: AssistantMessage = {
        id: 'usr-2',
        sender: 'user',
        text: 'Book tennis court at 5pm',
        timestamp: Date.now(),
      };
      const onEditMock = jest.fn();

      const { getByTestId, queryByTestId, findByTestId } = await render(
        <VoiceAssistantChatBubble message={userMsg} onEditPrompt={onEditMock} />
      );

      const editBtn = getByTestId('edit-user-msg-usr-2');
      expect(editBtn).toBeTruthy();

      // Tap edit button to open inline editor
      await act(async () => {
        fireEvent.press(editBtn);
      });

      // Verify inline editor is visible
      const input = await findByTestId('edit-textinput-usr-2');
      expect(input).toBeTruthy();
      expect(input.props.value).toBe('Book tennis court at 5pm');

      // Change text
      await act(async () => {
        fireEvent.changeText(input, 'Book badminton court at 6pm');
      });

      // Tap Update
      const saveBtn = getByTestId('save-edit-usr-2');
      await act(async () => {
        fireEvent.press(saveBtn);
      });

      expect(onEditMock).toHaveBeenCalledWith('usr-2', 'Book badminton court at 6pm');
      // Verify editor closed
      expect(queryByTestId('edit-textinput-usr-2')).toBeNull();
    });

    it('cancels inline editing without firing onEditPrompt', async () => {
      const userMsg: AssistantMessage = {
        id: 'usr-3',
        sender: 'user',
        text: 'Show my maintenance dues',
        timestamp: Date.now(),
      };
      const onEditMock = jest.fn();

      const { getByTestId, queryByTestId, findByTestId } = await render(
        <VoiceAssistantChatBubble message={userMsg} onEditPrompt={onEditMock} />
      );

      // Open editor
      await act(async () => {
        fireEvent.press(getByTestId('edit-user-msg-usr-3'));
      });
      const input = await findByTestId('edit-textinput-usr-3');

      // Modify text
      await act(async () => {
        fireEvent.changeText(input, 'Show my transactions');
      });

      // Tap Cancel
      const cancelBtn = getByTestId('cancel-edit-usr-3');
      await act(async () => {
        fireEvent.press(cancelBtn);
      });

      expect(onEditMock).not.toHaveBeenCalled();
      // Verify editor closed
      expect(queryByTestId('edit-textinput-usr-3')).toBeNull();
    });

    it('disables edit button while action is executing', async () => {
      const userMsg: AssistantMessage = {
        id: 'usr-4',
        sender: 'user',
        text: 'Generating action...',
        timestamp: Date.now(),
      };
      const onEditMock = jest.fn();

      const { getByTestId, queryByTestId } = await render(
        <VoiceAssistantChatBubble
          message={userMsg}
          onEditPrompt={onEditMock}
          isActionExecuting={true}
        />
      );

      const editBtn = getByTestId('edit-user-msg-usr-4');
      await act(async () => {
        fireEvent.press(editBtn);
      });

      // Should not enter edit mode
      expect(queryByTestId('edit-textinput-usr-4')).toBeNull();
    });
  });

  describe('4. Full Flow Integration: Modal Edit Prompt', () => {
    it('editing a user message in VoiceAssistantModal rewinds conversation and triggers sendChatMessage', async () => {
      (aiAssistantApi.sendChatMessage as jest.Mock).mockResolvedValueOnce({
        message: 'Updated booking availability for badminton court at 7pm.',
        conversationState: { step: 'amenity_selected' },
      });

      const store = createMockStore([
        { id: 'usr-10', sender: 'user', text: 'Hi', timestamp: 100 },
        { id: 'ast-10', sender: 'assistant', text: 'Hello!', timestamp: 101 },
        { id: 'usr-11', sender: 'user', text: 'Book tennis', timestamp: 102 },
        { id: 'ast-11', sender: 'assistant', text: 'Tennis booked', timestamp: 103 },
      ]);

      const { getByTestId, findByTestId } = await render(
        <Provider store={store}>
          <VoiceAssistantModal />
        </Provider>
      );

      // Tap edit on usr-11
      const editBtn = getByTestId('edit-user-msg-usr-11');
      await act(async () => {
        fireEvent.press(editBtn);
      });

      const input = await findByTestId('edit-textinput-usr-11');
      await act(async () => {
        fireEvent.changeText(input, 'Book badminton at 7pm');
      });

      const saveBtn = getByTestId('save-edit-usr-11');
      await act(async () => {
        fireEvent.press(saveBtn);
      });

      // Verify sendChatMessage was called with the updated text and prior history (excluding truncated turns)
      expect(aiAssistantApi.sendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Book badminton at 7pm',
          history: [
            { role: 'user', text: 'Hi' },
            { role: 'model', text: 'Hello!' },
          ],
        }),
        expect.anything()
      );

      // Verify state was rewound in the store
      const stateMessages = store.getState().voiceAssistant.messages;
      expect(stateMessages[2].text).toBe('Book badminton at 7pm');
      // The old ast-11 was truncated and replaced by the new assistant message
      expect(stateMessages[3].sender).toBe('assistant');
      expect(stateMessages[3].text).toBe('Updated booking availability for badminton court at 7pm.');
    });
  });
});
