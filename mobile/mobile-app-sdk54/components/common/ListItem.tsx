import React from 'react';
import { Pressable, Text, View, PressableProps } from 'react-native';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface ListItemProps extends PressableProps {
  title: string;
  subtitle?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  showChevron?: boolean;
  onPress?: () => void;
  className?: string;
}

export const ListItem = ({
  title,
  subtitle,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  showChevron = false,
  onPress,
  className,
  ...props
}: ListItemProps) => {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-between border-b border-border bg-card px-4 py-3',
        className
      )}
      {...props}
    >
      <View className="flex-row items-center flex-1">
        {LeftIcon && (
          <View className="me-3 rounded-lg bg-muted p-2">
            <LeftIcon size={20} className="text-muted-foreground" />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {title}
          </Text>
          {Boolean(subtitle) && (
            <Text className="mt-0.5 text-sm text-muted-foreground">
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      <View className="flex-row items-center ms-2">
        {RightIcon && <RightIcon size={20} className="text-muted-foreground" />}
        {showChevron && !RightIcon && (
          <ChevronRight size={20} className="ms-1 text-muted-foreground" />
        )}
      </View>
    </Pressable>
  );
};
