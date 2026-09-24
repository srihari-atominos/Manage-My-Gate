import React from 'react';
import { Pressable, View, PressableProps } from 'react-native';
import { Text } from '../ui/text';
import { LucideIcon, X } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../src/utils/i18n';

export interface ChipProps extends PressableProps {
  label: string;
  icon?: LucideIcon;
  onRemove?: () => void;
  selected?: boolean;
  shape?: 'pill' | 'box';
  className?: string;
  labelClassName?: string;
}

export const Chip = ({
  label,
  icon: Icon,
  onRemove,
  selected = false,
  shape = 'pill',
  className,
  labelClassName,
  ...props
}: ChipProps) => {
  const { translateText } = useTranslation();
  return (
    <Pressable
      className={cn(
        'flex-row items-center justify-center border px-3 py-1.5 min-h-[34px] active:opacity-85 shadow-2xs',
        shape === 'box' ? 'rounded-xl' : 'rounded-full',
        selected
          ? 'border-primary bg-primary'
          : 'border-border/80 bg-card active:bg-secondary/60',
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon
          size={14}
          className={cn(
            'me-1.5 shrink-0',
            selected ? 'text-white' : 'text-muted-foreground'
          )}
        />
      )}
      <Text
        className={cn(
          'text-xs font-semibold leading-tight text-center',
          selected ? 'text-white font-bold' : 'text-foreground',
          labelClassName
        )}
      >
        {translateText(label)}
      </Text>
      {onRemove && (
        <Pressable onPress={onRemove} className="ms-1.5 p-0.5" accessibilityLabel="Remove">
          <X
            size={13}
            className={cn(selected ? 'text-white/80' : 'text-muted-foreground')}
          />
        </Pressable>
      )}
    </Pressable>
  );
};
