import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { CommunityNote } from '../types/communityNoteTypes';
import { formatExpirationCountdown } from '../hooks/useCommunityNote';
import { MessageSquareCode } from 'lucide-react-native';

export interface DirectoryPulseNoteProps {
  note: CommunityNote;
  showCountdown?: boolean;
}

export const DirectoryPulseNote = ({ note, showCountdown = true }: DirectoryPulseNoteProps) => {
  if (!note || !note.text) return null;

  return (
    <View className="bg-primary/5 border border-primary/20 rounded-2xl p-3 my-2">
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center gap-1.5">
          <MessageSquareCode size={14} className="text-primary" />
          <Text className="text-[11px] font-bold text-primary tracking-wider uppercase">
            MY COMMUNITY NOTE
          </Text>
        </View>
        {showCountdown && note.expiresAt && (
          <Text className="text-[10px] text-muted-foreground font-medium">
            {formatExpirationCountdown(note.expiresAt)}
          </Text>
        )}
      </View>
      <Text className="text-sm font-semibold text-foreground leading-snug">
        {note.emoji ? `${note.emoji} ` : ''}{note.text}
      </Text>
    </View>
  );
};

export default DirectoryPulseNote;
