import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { X, Plus } from 'lucide-react-native';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { ALL_AVAILABLE_FEATURES } from '@/src/features/dashboard/dashboardCatalog';

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
  maxCapacity = 5,
  onRemoveItem,
}) => {
  const emptySlotsCount = Math.max(0, maxCapacity - activeItems.length);

  return (
    <View className="bg-secondary/40 p-3.5 border-b border-border/70">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xs font-bold font-sans text-foreground uppercase tracking-wider">
          Active Quick Actions Deck
        </Text>
        <Text className="text-[11px] font-medium font-sans text-muted-foreground">
          {activeItems.length}/{maxCapacity} Selected
        </Text>
      </View>

      {/* 3-Column Deck Grid (5 Slots) */}
      <View className="flex-row flex-wrap gap-y-3 -mx-1">
        {activeItems.map((item) => {
          const meta = ALL_AVAILABLE_FEATURES.find((f) => f.id === item.id);
          const iconName = meta?.iconName || item.iconName;
          const colorIcon = meta?.colorIcon || item.colorIcon || '#245FA8';
          const colorBg = meta?.colorBg || item.colorBg || 'bg-secondary';

          return (
            <View key={item.id} className="w-1/3 px-1">
              <TouchableOpacity
                onPress={() => onRemoveItem(item.id)}
                activeOpacity={0.7}
                className="items-center justify-start gap-2 w-full py-1"
              >
                <View className="relative">
                  <View className={`w-[52px] h-[52px] items-center justify-center rounded-[18px] border border-border/50 ${colorBg}`}>
                    <FeatureIcon iconName={iconName} color={colorIcon} size={22} />
                  </View>

                  <View className="absolute -top-1 -right-1.5 bg-destructive rounded-full p-0.5 shadow-sm border-2 border-card">
                    <X size={11} color="#fff" />
                  </View>
                </View>

                <Text
                  className="text-[11px] font-medium font-sans text-foreground text-center px-1 leading-snug"
                  numberOfLines={2}
                >
                  {meta?.name || item.name}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Empty Slots with Dashed Borders */}
        {Array.from({ length: emptySlotsCount }).map((_, index) => (
          <View key={`empty_${index}`} className="w-1/3 px-1">
            <View className="w-full h-[74px] border border-dashed border-border/70 rounded-[18px] items-center justify-center bg-muted/10 p-2">
              <Plus size={15} className="text-muted-foreground/50" />
              <Text className="text-[10px] font-medium font-sans text-muted-foreground/60 mt-1">Empty Slot</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default CustomiseDeckZone;
