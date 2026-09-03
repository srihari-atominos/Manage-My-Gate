import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import directoryMessagingApi from '../services/directoryMessagingApi';
import { Conversation, Message } from '../types/messagingTypes';

export interface MessagingState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  error: string | null;
}

const initialState: MessagingState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  loading: false,
  sending: false,
  error: null,
};

export const fetchConversations = createAsyncThunk(
  'directoryMessaging/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      return await directoryMessagingApi.fetchConversations();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch conversations');
    }
  }
);

export const getOrCreateConversation = createAsyncThunk(
  'directoryMessaging/getOrCreateConversation',
  async (receiverId: string, { rejectWithValue }) => {
    try {
      return await directoryMessagingApi.getOrCreateConversation(receiverId);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to initialize conversation');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'directoryMessaging/fetchMessages',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const res = await directoryMessagingApi.fetchMessages(conversationId);
      return { conversationId, messages: res.items };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load messages');
    }
  }
);

export const sendDirectoryMessage = createAsyncThunk(
  'directoryMessaging/sendMessage',
  async (
    payload: { receiverId?: string; conversationId?: string; text: string; messageType?: string },
    { rejectWithValue }
  ) => {
    try {
      return await directoryMessagingApi.sendMessage(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to send message');
    }
  }
);

export const markConversationRead = createAsyncThunk(
  'directoryMessaging/markConversationRead',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      await directoryMessagingApi.markAsRead(conversationId);
      return conversationId;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to mark read');
    }
  }
);

const directoryMessagingSlice = createSlice({
  name: 'directoryMessaging',
  initialState,
  reducers: {
    setActiveConversation(state, action: PayloadAction<Conversation | null>) {
      state.activeConversation = action.payload;
    },
    receiveRealtimeMessage(state, action: PayloadAction<{ message: Message; conversation?: Conversation }>) {
      const { message, conversation } = action.payload;
      if (state.activeConversation && (state.activeConversation._id === message.conversationId || state.activeConversation.id === message.conversationId)) {
        state.messages.push(message);
      }
      if (conversation) {
        const idx = state.conversations.findIndex((c) => c._id === conversation._id || c.id === conversation._id);
        if (idx >= 0) {
          state.conversations[idx] = conversation;
        } else {
          state.conversations.unshift(conversation);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
      })
      .addCase(getOrCreateConversation.fulfilled, (state, action) => {
        state.activeConversation = action.payload;
      })
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(sendDirectoryMessage.pending, (state) => {
        state.sending = true;
      })
      .addCase(sendDirectoryMessage.fulfilled, (state, action) => {
        state.sending = false;
        state.messages.push(action.payload);
      })
      .addCase(sendDirectoryMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload as string;
      });
  },
});

export const { setActiveConversation, receiveRealtimeMessage } = directoryMessagingSlice.actions;
export default directoryMessagingSlice.reducer;
