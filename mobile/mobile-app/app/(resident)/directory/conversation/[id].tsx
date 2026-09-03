import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import DirectoryConversationScreen from '@/src/features/directory/screens/DirectoryConversationScreen';

export default function DirectoryConversationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DirectoryConversationScreen conversationId={id || ''} />;
}
