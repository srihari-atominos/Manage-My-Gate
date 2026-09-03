import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDirectoryMessaging } from '../hooks/useDirectoryMessaging';
import { useDirectorySocket } from '../hooks/useDirectorySocket';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { Message } from '../types/messagingTypes';
import { Send, Check, CheckCheck } from 'lucide-react-native';

export interface DirectoryConversationScreenProps {
  conversationId: string;
}

export function DirectoryConversationScreen({ conversationId }: DirectoryConversationScreenProps) {
  useDirectorySocket();
  const { user } = useAuth();
  const currentUserId = user?.id || (user as any)?._id;

  const {
    activeConversation,
    messages,
    loading,
    sending,
    loadMessages,
    markRead,
    onSendQuickMessage,
  } = useDirectoryMessaging();

  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
      markRead(conversationId);
    }
  }, [conversationId, loadMessages, markRead]);

  const participant = activeConversation?.participants?.find(
    (p: any) => (p._id || p.id) !== currentUserId
  );

  const handleSend = async () => {
    if (!inputMessage.trim()) return;
    const textToSend = inputMessage.trim();
    setInputMessage('');
    const receiverId = participant?._id || participant?.id;
    await onSendQuickMessage(textToSend, { userId: receiverId, id: receiverId } as any);
  };

  const renderStatusIcon = (msg: Message) => {
    if (msg.status === 'read') {
      return <CheckCheck size={14} className="text-primary" />;
    }
    if (msg.status === 'delivered') {
      return <CheckCheck size={14} className="text-muted-foreground" />;
    }
    return <Check size={14} className="text-muted-foreground" />;
  };

  return (
    <ScreenShell
      title={participant?.name || 'Community Chat'}
      subtitle={participant?.role ? participant.role.toUpperCase() : 'Resident'}
      iconName="MessageSquare"
      showBackButton={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-background"
      >
        {/* Messages List */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => {
            const isMe = (item.senderId?._id || item.senderId || (item as any).sender) === currentUserId;
            return (
              <View
                className={`mb-3 max-w-[80%] ${
                  isMe ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                <View
                  className={`rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-muted/60 border border-border/40 rounded-tl-none'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isMe ? 'text-primary-foreground font-medium' : 'text-foreground font-normal'
                    }`}
                  >
                    {item.text}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1 mt-1 px-1">
                  <Text className="text-[10px] text-muted-foreground">
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                  {isMe && renderStatusIcon(item)}
                </View>
              </View>
            );
          }}
          contentContainerClassName="px-4 pt-4 pb-4"
          inverted={false}
        />

        {/* Keyboard Safe Input Bar */}
        <View className="p-3 border-t border-border/40 bg-card flex-row items-center gap-2">
          <Input
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type a message..."
            className="flex-1 bg-background border-border text-foreground text-sm h-11 px-4 rounded-xl"
          />
          <Button
            variant="default"
            size="default"
            onPress={handleSend}
            disabled={sending || !inputMessage.trim()}
            loading={sending}
            leftIcon={Send}
            className="h-11 rounded-xl px-4"
          >
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

export default DirectoryConversationScreen;
