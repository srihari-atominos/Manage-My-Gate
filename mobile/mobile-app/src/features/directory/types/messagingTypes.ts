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

export const getLocalizedQuickMessages = (t: (key: string, fallback?: string) => string): Record<string, QuickMessageOption[]> => ({
  default: [
    { id: 'q1', label: t('qm_interested_label', "I'm interested 👍"), text: t('qm_interested_text', "I'd like to join 👍") },
    { id: 'q2', label: t('qm_free_now_label', 'Are you free now?'), text: t('qm_free_now_text', 'Are you free right now?') },
    { id: 'q3', label: t('qm_what_time_label', 'What time?'), text: t('qm_what_time_text', 'What time are you planning?') },
    { id: 'q4', label: t('qm_where_meet_label', 'Where are you?'), text: t('qm_where_meet_text', 'Where are you meeting?') },
  ],
  LOOKING_FOR: [
    { id: 'q5', label: t('qm_can_help_label', 'I can help ✋'), text: t('qm_can_help_text', 'I can help you with this!') },
    { id: 'q6', label: t('qm_have_contact_label', 'Have contact 📞'), text: t('qm_have_contact_text', 'I have a contact for this, calling you.') },
  ],
  guard: [
    { id: 'q7', label: t('qm_need_assistance_label', 'Need assistance 🚨'), text: t('qm_need_assistance_text', 'I need immediate assistance at my villa.') },
    { id: 'q8', label: t('qm_gate_query_label', 'Gate query 🚪'), text: t('qm_gate_query_text', 'Regarding visitor entry at gate.') },
  ],
});
