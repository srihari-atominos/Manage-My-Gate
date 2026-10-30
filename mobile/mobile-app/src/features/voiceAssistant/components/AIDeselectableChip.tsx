import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Check, X } from 'lucide-react-native';

export interface AIDeselectableChipProps {
  id?: string;
  label: string;
  value: string;
  badge?: string | null;
  selected?: boolean;
  disabled?: boolean;
  allowDeselect?: boolean;
  onPress: (value: string) => void;
  onDeselect?: (value: string) => void;
  className?: string;
}

export const AIDeselectableChip: React.FC<AIDeselectableChipProps> = ({
  id,
  label,
  value,
  badge,
  selected = false,
  disabled = false,
  allowDeselect = true,
  onPress,
  onDeselect,
  className = '',
}) => {
  const handlePress = () => {
    if (disabled) return;
    if (selected && allowDeselect && onDeselect) {
      onDeselect(value);
    } else {
      onPress(value);
    }
  };

  return (
    <Pressable
      testID={`ai-chip-${id || value}`}
      disabled={disabled}
      onPress={handlePress}
      accessibilityRole="checkbox"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${label}${badge ? ` (${badge})` : ''}${selected ? ', selected' : ''}`}
      className={`flex-row items-center justify-center px-3 py-1.5 min-h-[34px] rounded-full border shadow-2xs active:opacity-85 ${
        selected
          ? 'bg-primary border-primary text-primary-foreground'
          : 'bg-card border-border/80 text-foreground active:bg-secondary/60'
      } ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {selected && (
        <View className="me-1.5 w-3.5 h-3.5 rounded-full bg-white/20 items-center justify-center">
          <Check size={11} color="white" strokeWidth={3} />
        </View>
      )}

      <Text
        className={`text-xs font-semibold leading-tight ${
          selected ? 'text-primary-foreground font-bold' : 'text-foreground'
        }`}
      >
        {label}
      </Text>

      {badge && (
        <View
          className={`ms-1.5 px-1.5 py-0.2 rounded-full border ${
            selected
              ? 'bg-white/25 border-white/40'
              : 'bg-primary/10 border-primary/20'
          }`}
        >
          <Text
            className={`text-[9px] font-bold ${
              selected ? 'text-primary-foreground' : 'text-primary'
            }`}
          >
            {badge}
          </Text>
        </View>
      )}

      {selected && allowDeselect && (
        <Pressable
          hitSlop={6}
          onPress={() => onDeselect ? onDeselect(value) : onPress(value)}
          accessibilityRole="button"
          accessibilityLabel={`Deselect ${label}`}
          className="ms-1.5 p-0.5 rounded-full bg-white/20 active:bg-white/30"
        >
          <X size={10} color="white" strokeWidth={2.5} />
        </Pressable>
      )}
    </Pressable>
  );
};

export default AIDeselectableChip;
