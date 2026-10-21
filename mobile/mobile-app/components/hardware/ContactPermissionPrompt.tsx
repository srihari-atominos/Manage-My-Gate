import React from 'react';
import { Modal, View } from 'react-native';
import { UsersRound } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export interface ContactPermissionPromptProps {
  visible: boolean;
  onDeny: () => void;
  onAccept: () => void;
}

export function ContactPermissionPrompt({ visible, onDeny, onAccept }: ContactPermissionPromptProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDeny}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <View className="h-12 w-12 self-center items-center justify-center rounded-full bg-primary/15">
            <UsersRound size={25} className="text-primary" />
          </View>
          <Text className="mt-4 text-center text-lg font-bold text-foreground">
            Allow Contacts Access?
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
            Contacts access is needed to use contact details when calling from the Community Directory. Your contacts are not uploaded.
          </Text>
          <View className="mt-6 flex-row gap-3">
            <Button
              variant="outline"
              onPress={onDeny}
              className="flex-1 border-primary/30"
              accessibilityRole="button"
              accessibilityLabel="Deny contacts access"
            >
              <Text className="text-primary">Deny</Text>
            </Button>
            <Button
              variant="default"
              onPress={onAccept}
              className="flex-1"
              accessibilityRole="button"
              accessibilityLabel="Accept contacts access"
            >
              <Text className="text-primary-foreground">Accept</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default ContactPermissionPrompt;
