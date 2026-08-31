import { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/src/store/store';
import {
  fetchConversations,
  getOrCreateConversation,
  fetchMessages,
  sendDirectoryMessage,
  markConversationRead,
  setActiveConversation,
} from '../store/directoryMessagingSlice';
import { DirectoryMember } from '../types/directoryTypes';
import { CONTEXTUAL_QUICK_MESSAGES } from '../types/messagingTypes';
import { useRouter } from 'expo-router';

export const useDirectoryMessaging = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const {
    conversations,
    activeConversation,
    messages,
    loading,
    sending,
    error,
  } = useSelector((state: RootState) => (state as any).directoryMessaging);

  const [quickSheetOpen, setQuickSheetOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);

  const handleOpenQuickMessage = useCallback((member: DirectoryMember) => {
    setSelectedMember(member);
    setQuickSheetOpen(true);
  }, []);

  const handleSendQuickMessage = useCallback(
    async (text: string, memberOverride?: DirectoryMember) => {
      const targetMember = memberOverride || selectedMember;
      if (!targetMember || !text.trim()) return;

      const res = await dispatch(
        sendDirectoryMessage({
          receiverId: targetMember.userId || targetMember.id,
          text: text.trim(),
          messageType: 'QUICK_INTERACTION',
        })
      );

      if (sendDirectoryMessage.fulfilled.match(res)) {
        setQuickSheetOpen(false);
        setSelectedMember(null);
      }
    },
    [dispatch, selectedMember]
  );
  const handleOpenConversation = useCallback(
    async (member: DirectoryMember) => {
      const targetUserId = member.userId || member.id;
      const res = await dispatch(getOrCreateConversation(targetUserId));
      if (getOrCreateConversation.fulfilled.match(res)) {
        const conv = res.payload;
        if (conv?._id || conv?.id) {
          router.push(`/(resident)/directory/conversation/${conv._id || conv.id}` as any);
        }
      }
    },
    [dispatch, router]
  );

  const getQuickOptions = useCallback(() => {
    if (!selectedMember) return CONTEXTUAL_QUICK_MESSAGES.default;
    if (selectedMember.role === 'guard' || selectedMember.role === 'security') {
      return [...CONTEXTUAL_QUICK_MESSAGES.guard, ...CONTEXTUAL_QUICK_MESSAGES.default];
    }
    return CONTEXTUAL_QUICK_MESSAGES.default;
  }, [selectedMember]);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    sending,
    error,
    quickSheetOpen,
    setQuickSheetOpen,
    selectedMember,
    onOpenQuickMessage: handleOpenQuickMessage,
    onSendQuickMessage: handleSendQuickMessage,
    onOpenConversation: handleOpenConversation,
    quickOptions: getQuickOptions(),
    loadConversations: () => dispatch(fetchConversations()),
    loadMessages: (convId: string) => dispatch(fetchMessages(convId)),
    markRead: (convId: string) => dispatch(markConversationRead(convId)),
    clearActiveConversation: () => dispatch(setActiveConversation(null)),
  };
};

export default useDirectoryMessaging;
