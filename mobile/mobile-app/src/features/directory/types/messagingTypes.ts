export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'TEXT' | 'QUICK_INTERACTION' | 'NOTE_INTEREST';

export interface Message {
  _id: string;
  id?: string;
  conversationId: string;
  orgId: string;
  senderId: string | { _id: string; name: string; avatar?: string };
  receiverId: string;
  messageType: MessageType;
  text: string;
  status: MessageStatus;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
}

export interface ConversationParticipant {
  _id: string;
  id?: string;
  name: string;
  avatar?: string;
  role?: string;
  phone?: string;
  showPhoneInDirectory?: boolean;
  allowDirectoryMessages?: boolean;
}

export interface Conversation {
  _id: string;
  id?: string;
  orgId: string;
  participants: ConversationParticipant[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCounts?: Record<string, number>;
}

export interface QuickMessageOption {
  id: string;
  label: string;
  text: string;
}

export const CONTEXTUAL_QUICK_MESSAGES: Record<string, QuickMessageOption[]> = {
  default: [
    { id: 'q1', label: "I'm interested 👍", text: "I'd like to join 👍" },
    { id: 'q2', label: 'Are you free now?', text: 'Are you free right now?' },
    { id: 'q3', label: 'What time?', text: 'What time are you planning?' },
    { id: 'q4', label: 'Where are you?', text: 'Where are you meeting?' },
  ],
  LOOKING_FOR: [
    { id: 'q5', label: 'I can help ✋', text: 'I can help you with this!' },
    { id: 'q6', label: 'Have contact 📞', text: 'I have a contact for this, calling you.' },
  ],
  guard: [
    { id: 'q7', label: 'Need assistance 🚨', text: 'I need immediate assistance at my villa.' },
    { id: 'q8', label: 'Gate query 🚪', text: 'Regarding visitor entry at gate.' },
  ],
};
