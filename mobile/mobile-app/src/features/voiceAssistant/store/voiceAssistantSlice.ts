import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  AssistantFeature,
  ConversationState,
  InteractiveOptionItem,
  InteractiveOptionGroup,
} from '../services/aiAssistantApi';

export type VoiceAssistantStatus =
  | 'idle'
  | 'requesting_permission'
  | 'permission_denied'
  | 'connecting'
  | 'listening'
  | 'transcribing'
  | 'processing'
  | 'awaiting_confirmation'
  | 'thinking'
  | 'speaking'
  | 'muted'
  | 'error';

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  type?: 'text' | 'navigation' | 'data_card';
  isError?: boolean;
  failedPrompt?: string;
  metadata?: {
    targetRoute?: string;
    targetName?: string;
    screenId?: string;
    category?: string;
    data?: any;
    actionCard?: any;
    options?: InteractiveOptionItem[];
    interactiveConfig?: InteractiveOptionGroup;
    selectedOptions?: Record<string, any>;
  };
}

export interface VoiceAssistantState {
  status: VoiceAssistantStatus;
  mode: 'chat' | 'voice';
  isModalOpen: boolean;
  isMuted: boolean;
  isTtsEnabled: boolean;
  isGeneratingText: boolean;
  errorMessage: string | null;
  transcriptSnippet: string;
  elapsedSeconds: number;
  maxDurationSeconds: number;
  authorizedFeatures: AssistantFeature[];
  lastNavigatedScreen: string | null;
  conversationState: ConversationState | null;
  messages: AssistantMessage[];
}

const initialState: VoiceAssistantState = {
  status: 'idle',
  mode: 'chat',
  isModalOpen: false,
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
  messages: [],
};

export const voiceAssistantSlice = createSlice({
  name: 'voiceAssistant',
  initialState,
  reducers: {
    openModal: (state) => {
      state.isModalOpen = true;
      state.errorMessage = null;
    },
    closeModal: (state) => {
      state.isModalOpen = false;
      state.status = 'idle';
      state.mode = 'chat';
      state.isGeneratingText = false;
      state.elapsedSeconds = 0;
      state.transcriptSnippet = '';
      state.errorMessage = null;
      state.conversationState = null;
    },
    setMode: (state, action: PayloadAction<'chat' | 'voice'>) => {
      state.mode = action.payload;
    },
    setIsGeneratingText: (state, action: PayloadAction<boolean>) => {
      state.isGeneratingText = action.payload;
    },
    appendStreamingChunk: (state, action: PayloadAction<{ id: string; chunk: string }>) => {
      const msg = state.messages.find((m) => m.id === action.payload.id);
      if (msg) {
        msg.text = (msg.text || '') + action.payload.chunk;
      }
    },
    setStatus: (state, action: PayloadAction<VoiceAssistantStatus>) => {
      state.status = action.payload;
      if (action.payload !== 'error') {
        state.errorMessage = null;
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.errorMessage = action.payload;
    },
    setMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
      if (action.payload && state.status === 'listening') {
        state.status = 'muted';
      } else if (!action.payload && state.status === 'muted') {
        state.status = 'listening';
      }
    },
    setTtsEnabled: (state, action: PayloadAction<boolean>) => {
      state.isTtsEnabled = action.payload;
    },
    toggleTtsEnabled: (state) => {
      state.isTtsEnabled = !state.isTtsEnabled;
    },
    setTranscriptSnippet: (state, action: PayloadAction<string>) => {
      state.transcriptSnippet = action.payload;
    },
    incrementElapsed: (state) => {
      state.elapsedSeconds += 1;
    },
    setAuthorizedFeatures: (state, action: PayloadAction<AssistantFeature[]>) => {
      state.authorizedFeatures = action.payload;
    },
    setMaxDurationSeconds: (state, action: PayloadAction<number>) => {
      state.maxDurationSeconds = action.payload;
    },
    setLastNavigatedScreen: (state, action: PayloadAction<string | null>) => {
      state.lastNavigatedScreen = action.payload;
    },
    setConversationState: (state, action: PayloadAction<ConversationState | null>) => {
      state.conversationState = action.payload;
    },
    resetVoiceSession: (state) => {
      state.status = 'idle';
      state.isMuted = false;
      state.errorMessage = null;
      state.transcriptSnippet = '';
      state.elapsedSeconds = 0;
      state.lastNavigatedScreen = null;
      state.conversationState = null;
    },
    addMessage: (state, action: PayloadAction<AssistantMessage>) => {
      state.messages.push(action.payload);
    },
    editAndTruncateMessages: (
      state,
      action: PayloadAction<{ messageId: string; newText: string }>
    ) => {
      const { messageId, newText } = action.payload;
      const msgIndex = state.messages.findIndex((m) => m.id === messageId);
      if (msgIndex !== -1) {
        state.messages[msgIndex].text = newText;
        state.messages[msgIndex].timestamp = Date.now();
        state.messages = state.messages.slice(0, msgIndex + 1);
        state.errorMessage = null;
        state.transcriptSnippet = '';
      }
    },
    updateLastAssistantMessage: (
      state,
      action: PayloadAction<string | { text?: string; metadata?: any; isError?: boolean; failedPrompt?: string }>
    ) => {
      const payload = typeof action.payload === 'string' ? { text: action.payload } : action.payload;
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].sender === 'assistant') {
          if (payload.text !== undefined) {
            state.messages[i].text = payload.text;
          }
          if (payload.metadata !== undefined) {
            state.messages[i].metadata = {
              ...state.messages[i].metadata,
              ...payload.metadata,
            };
          }
          if (payload.isError !== undefined) {
            state.messages[i].isError = payload.isError;
          }
          if (payload.failedPrompt !== undefined) {
            state.messages[i].failedPrompt = payload.failedPrompt;
          }
          break;
        }
      }
    },
    toggleMessageOptionSelection: (
      state,
      action: PayloadAction<{ messageId: string; optionValue: string; mode?: 'single' | 'multiple' }>
    ) => {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (!msg || !msg.metadata?.options) return;
      const { optionValue, mode = 'single' } = action.payload;
      if (mode === 'single') {
        msg.metadata.options = msg.metadata.options.map((opt) => ({
          ...opt,
          selected: opt.value === optionValue ? !opt.selected : false,
        }));
      } else {
        msg.metadata.options = msg.metadata.options.map((opt) =>
          opt.value === optionValue ? { ...opt, selected: !opt.selected } : opt
        );
      }
    },
    clearMessageOptionSelections: (state, action: PayloadAction<{ messageId: string }>) => {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (!msg || !msg.metadata?.options) return;
      msg.metadata.options = msg.metadata.options.map((opt) => ({ ...opt, selected: false }));
    },
    clearMessages: (state) => {
      state.messages = [];
      state.conversationState = null;
      state.errorMessage = null;
      state.transcriptSnippet = '';
      state.lastNavigatedScreen = null;
    },
  },
});

export const {
  openModal,
  closeModal,
  setMode,
  setIsGeneratingText,
  appendStreamingChunk,
  setStatus,
  setError,
  setMuted,
  setTtsEnabled,
  toggleTtsEnabled,
  setTranscriptSnippet,
  incrementElapsed,
  setAuthorizedFeatures,
  setMaxDurationSeconds,
  setLastNavigatedScreen,
  setConversationState,
  resetVoiceSession,
  addMessage,
  editAndTruncateMessages,
  updateLastAssistantMessage,
  toggleMessageOptionSelection,
  clearMessageOptionSelections,
  clearMessages,
} = voiceAssistantSlice.actions;

export default voiceAssistantSlice.reducer;
