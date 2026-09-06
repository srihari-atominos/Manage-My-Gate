import React from 'react';
import { Pressable, Text, View, PressableProps } from 'react-native';
import { LucideIcon, X } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface ChipProps extends PressableProps {
  label: string;
  icon?: LucideIcon;
  onRemove?: () => void;
  selected?: boolean;
  className?: string;
  labelClassName?: string;
}

export const Chip = ({
  label,
  icon: Icon,
  onRemove,
  selected = false,
  className,
  labelClassName,
  ...props
}: ChipProps) => {
  return (
    <Pressable
      className={cn(
        'flex-row items-center rounded-full border px-3 py-1.5',
        selected
          ? 'border-blue-600 bg-blue-600'
          : 'border-border bg-card',
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon
          size={14}
          className={cn(
            'me-1.5',
            selected ? 'text-white' : 'text-muted-foreground'
          )}
        />
      )}
      <Text
        className={cn(
          'text-sm font-medium',
          selected ? 'text-white font-bold' : 'text-foreground',
          labelClassName
        )}
      >
        {label}
      </Text>
      {onRemove && (
        <Pressable onPress={onRemove} className="ms-1.5 p-0.5" accessibilityLabel="Remove">
          <X
            size={14}
            className={cn(selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}
          />
        </Pressable>
      )}
    </Pressable>
  );
};
