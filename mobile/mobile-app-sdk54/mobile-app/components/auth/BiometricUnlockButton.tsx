import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Fingerprint, ScanFace } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface BiometricUnlockButtonProps {
  onPress: () => void;
  type?: 'fingerprint' | 'face' | 'auto';
  className?: string;
}

export const BiometricUnlockButton = ({
  onPress,
  type = 'auto',
  className,
}: BiometricUnlockButtonProps) => {
  // In a real app, this would detect the device's capabilities
  const displayType = type === 'auto' ? (Platform.OS === 'ios' ? 'face' : 'fingerprint') : type;
  const Icon = displayType === 'face' ? ScanFace : Fingerprint;

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'items-center justify-center rounded-2xl bg-secondary border border-border p-4 active:bg-muted/80',
        className
      )}
      accessibilityRole="button"
      accessibilityLabel={`Unlock with ${displayType}`}
    >
      <View className="items-center justify-center">
        <Icon size={32} className="text-primary" />
        <Text className="mt-2 text-xs font-semibold font-sans text-muted-foreground">
          {displayType === 'face' ? 'Face ID' : 'Touch ID'}
        </Text>
      </View>
    </Pressable>
  );
};
