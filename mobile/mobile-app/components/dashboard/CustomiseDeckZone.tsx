import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { X, Plus } from 'lucide-react-native';
import FeatureIcon from '@/components/ui/FeatureIcon';

export interface DeckItem {
  id: string;
  name: string;
  iconName: string;
  colorBg: string;
  colorIcon: string;
}

export interface CustomiseDeckZoneProps {
  activeItems: DeckItem[];
  maxCapacity?: number;
  onRemoveItem: (id: string) => void;
}

export const CustomiseDeckZone: React.FC<CustomiseDeckZoneProps> = ({
  activeItems,
  maxCapacity = 7,
  onRemoveItem,
}) => {
  const emptySlotsCount = Math.max(0, maxCapacity - activeItems.length);

  return (
    <View className="bg-slate-50 dark:bg-slate-900/50 p-3.5 border-b border-border">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
          Active Quick Actions Deck
        </Text>
        <Text className="text-[11px] font-medium text-muted-foreground">
          {activeItems.length}/{maxCapacity} Selected
        </Text>
      </View>

      {/* 4x2 Grid */}
      <View className="flex-row flex-wrap gap-2 justify-between">
        {activeItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onRemoveItem(item.id)}
            activeOpacity={0.8}
            className="w-[23%] bg-card border border-border rounded-2xl p-2 items-center justify-center gap-1.5 min-h-[76px] relative shadow-sm"
          >
            <View className={`p-1.5 rounded-xl ${item.colorBg}`}>
              <FeatureIcon iconName={item.iconName} color={item.colorIcon} size={16} />
            </View>

            <Text
              className="text-[10px] font-bold text-foreground text-center px-0.5 leading-tight"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>

            <View className="absolute -top-1 -right-1 bg-rose-500 rounded-full p-0.5 border border-white">
              <X size={10} color="#fff" />
            </View>
          </TouchableOpacity>
        ))}

        {/* Empty Slots with Dashed Borders */}
        {Array.from({ length: emptySlotsCount }).map((_, index) => (
          <View
            key={`empty_${index}`}
            className="w-[23%] min-h-[76px] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl items-center justify-center bg-slate-100/40 dark:bg-slate-800/30 p-1"
          >
            <Plus size={16} color="#94a3b8" />
            <Text className="text-[9px] font-medium text-slate-400 mt-1">Empty</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default CustomiseDeckZone;
