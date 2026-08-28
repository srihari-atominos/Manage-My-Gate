import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PRESET_NOTE_OPTIONS } from '../types/communityNoteTypes';
import { useCommunityNote } from '../hooks/useCommunityNote';
import { Sparkles, Send } from 'lucide-react-native';

export interface DirectoryNoteComposerProps {
  visible: boolean;
  onClose: () => void;
}

export const DirectoryNoteComposer = ({ visible, onClose }: DirectoryNoteComposerProps) => {
  const {
    noteText,
    setNoteText,
    loading,
    onPublish,
    onSelectPreset,
  } = useCommunityNote();

  const charCount = noteText.length;
  const isOverLimit = charCount > 80;

  const handlePublish = async () => {
    await onPublish();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="What's happening?">
      <View className="px-4 pb-6 gap-4">
        <Text className="text-xs text-muted-foreground font-medium">
          Post a temporary 24-hour note to your community. Let neighbors know what you are up to!
        </Text>

        {/* Quick Ideas Presets */}
        <View className="gap-1.5">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Sparkles size={14} className="text-primary" />
            <Text className="text-xs font-bold text-foreground">Quick Ideas</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {PRESET_NOTE_OPTIONS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                onPress={() => onSelectPreset(preset.id)}
                className="bg-muted/60 border border-border/50 rounded-xl px-3 py-2 flex-row items-center gap-1.5 active:bg-primary/10"
              >
                <Text className="text-sm">{preset.emoji}</Text>
                <Text className="text-xs font-semibold text-foreground">{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Text Input with Character Counter */}
        <View className="gap-1">
          <Input
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Type your note (max 80 chars)..."
            multiline
            numberOfLines={3}
            className="min-h-[80px] bg-background border-border text-foreground text-sm p-3 rounded-xl"
          />
          <View className="flex-row justify-end px-1">
            <Text
              className={`text-xs font-semibold ${
                isOverLimit ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {charCount} / 80
            </Text>
          </View>
        </View>

        {/* Publish CTA */}
        <Button
          variant="default"
          size="lg"
          onPress={handlePublish}
          disabled={loading || charCount === 0 || isOverLimit}
          loading={loading}
          leftIcon={Send}
          className="w-full rounded-xl"
        >
          Publish Note (24h)
        </Button>
      </View>
    </BottomSheet>
  );
};

export default DirectoryNoteComposer;
