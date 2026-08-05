import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';

export interface ActionTileProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  badge?: string;
  badgeColor?: string;
  containerClassName?: string;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  icon,
  label,
  onPress,
  badge,
  badgeColor,
  containerClassName = 'w-1/4 px-1',
}) => {
  return (
    <View className={containerClassName}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        className="bg-card border border-border rounded-2xl p-2 items-center justify-center gap-1.5 min-h-[84px] relative shadow-xs"
      >
        {badge ? (
          <View
            className={`absolute -top-1.5 px-1.5 py-0.5 rounded-full ${
              badgeColor || 'bg-primary text-white'
            }`}
          >
            <Text className="text-[8px] font-black text-white">{badge}</Text>
          </View>
        ) : null}

        <View className="size-9 rounded-2xl bg-muted/60 items-center justify-center">
          {icon}
        </View>

        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          ellipsizeMode="tail"
          className="text-[10px] font-semibold text-foreground text-center leading-tight px-0.5"
        >
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ActionTile;
