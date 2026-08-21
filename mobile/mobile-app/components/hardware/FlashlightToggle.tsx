import React from 'react';
import { View, Pressable } from 'react-native';
import { Zap, ZapOff } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '../../lib/utils';

export interface FlashlightToggleProps {
  isOn: boolean;
  onToggle: () => void;
  className?: string;
}

export const FlashlightToggle = ({
  isOn,
  onToggle,
  className,
}: FlashlightToggleProps) => {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={isOn ? 'Turn flashlight off' : 'Turn flashlight on'}
      accessibilityState={{ checked: isOn }}
      className={cn(
        'flex-row items-center justify-center rounded-xl p-3 border active:opacity-80',
        isOn
          ? 'border-primary/60 bg-primary/20'
          : 'border-border bg-card/90 backdrop-blur-md',
        className
      )}
    >
      <View
        className={cn(
          'me-2.5 h-8 w-8 items-center justify-center rounded-full',
          isOn ? 'bg-primary/30' : 'bg-muted'
        )}
      >
        {isOn ? (
          <Icon as={Zap} size={16} className="text-primary" />
        ) : (
          <Icon as={ZapOff} size={16} className="text-muted-foreground" />
        )}
      </View>
      <Text
        className={cn(
          'text-xs font-bold tracking-wide',
          isOn ? 'text-primary' : 'text-foreground'
        )}
      >
        {isOn ? 'Flashlight On' : 'Flashlight Off'}
      </Text>
    </Pressable>
  );
};

export default FlashlightToggle;
