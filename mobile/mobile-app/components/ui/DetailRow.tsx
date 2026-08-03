import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import * as LucideIcons from 'lucide-react-native';
import { Check, Copy } from 'lucide-react-native';
import * as React from 'react';
import { Clipboard, Platform, Pressable, View } from 'react-native';

export interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;  // can be a StatusBadge
  iconName?: string;                // optional leading icon
  copyable?: boolean;               // show copy button
  isLast?: boolean;                 // optional flag to hide bottom border
  className?: string;
}

const detailRowVariants = cva(
  'flex-row items-center py-2.5',
  {
    variants: {
      isLast: {
        true: '',
        false: 'border-b border-border/50',
      },
    },
    defaultVariants: {
      isLast: false,
    },
  }
);

const DetailRow = React.forwardRef<View, DetailRowProps>(
  (
    {
      label,
      value,
      iconName,
      copyable = false,
      isLast = false,
      className,
    },
    ref
  ) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = React.useCallback(() => {
      let stringValue = '';
      if (typeof value === 'string' || typeof value === 'number') {
        stringValue = String(value);
      }
      if (!stringValue) return;

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(stringValue);
      } else if (Clipboard && typeof Clipboard.setString === 'function') {
        Clipboard.setString(stringValue);
      }

      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }, [value]);

    const IconComponent = iconName
      ? (LucideIcons as Record<string, any>)[iconName]
      : undefined;

    const isPrimitiveValue =
      typeof value === 'string' || typeof value === 'number';

    return (
      <View
        ref={ref}
        className={cn(detailRowVariants({ isLast }), className)}
      >
        {/* Left Icon (if provided) */}
        {IconComponent ? (
          <Icon
            as={IconComponent}
            size={16}
            className="text-muted-foreground mr-2 shrink-0"
          />
        ) : null}

        {/* Label */}
        <Text variant="muted" className="text-sm flex-1 mr-2" numberOfLines={1}>
          {label}
        </Text>

        {/* Value Container */}
        <View className="flex-row items-center justify-end shrink-0 max-w-[60%]">
          {isPrimitiveValue ? (
            <Text
              variant="default"
              className="text-sm font-medium text-right text-foreground"
              numberOfLines={2}
            >
              {value}
            </Text>
          ) : (
            value
          )}

          {/* Copy Button */}
          {copyable && isPrimitiveValue ? (
            <Pressable
              onPress={handleCopy}
              className="ml-2 p-1 rounded active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel={`Copy ${label}`}
            >
              <Icon
                as={copied ? Check : Copy}
                size={14}
                className={
                  copied
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                }
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }
);

DetailRow.displayName = 'DetailRow';

export { DetailRow, detailRowVariants };
