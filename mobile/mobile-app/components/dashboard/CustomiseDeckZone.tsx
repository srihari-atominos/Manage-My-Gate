import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { X, Plus, ChevronLeft, ChevronRight, ArrowDown } from 'lucide-react-native';
import FeatureIcon from '../ui/FeatureIcon';
import { ALL_AVAILABLE_FEATURES } from '../../src/features/dashboard/dashboardCatalog';
import { useTranslation } from '../../src/utils/i18n';

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
  onReorderItem?: (fromIndex: number, toIndex: number) => void;
  isDropTargetActive?: boolean;
}

export const CustomiseDeckZone: React.FC<CustomiseDeckZoneProps> = ({
  activeItems,
  maxCapacity = 5,
  onRemoveItem,
  onReorderItem,
  isDropTargetActive = false,
}) => {
  const { t, tFeatureName } = useTranslation();
  const emptySlotsCount = Math.max(0, maxCapacity - activeItems.length);

  const handleMoveLeft = (index: number) => {
    if (index > 0 && onReorderItem) {
      onReorderItem(index, index - 1);
    }
  };

  const handleMoveRight = (index: number) => {
    if (index < activeItems.length - 1 && onReorderItem) {
      onReorderItem(index, index + 1);
    }
  };

  return (
    <View
      className={`p-3.5 border-b transition-colors duration-200 ${
        isDropTargetActive
          ? 'bg-primary/15 border-primary shadow-lg shadow-primary/20'
          : 'bg-secondary/40 border-border/70'
      }`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs font-bold font-sans text-foreground uppercase tracking-wider">
            {t('active_quick_actions_deck', 'Active Quick Actions Bar')}
          </Text>
          {isDropTargetActive ? (
            <View className="bg-primary px-2 py-0.5 rounded-full flex-row items-center gap-1">
              <ArrowDown size={10} color="#fff" />
              <Text className="text-[9px] font-bold text-primary-foreground uppercase">Drop Here</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-[11px] font-medium font-sans text-muted-foreground">
          {activeItems.length}/{maxCapacity} Selected
        </Text>
      </View>

      {/* 3-Column Deck Grid (Max 5 Slots) */}
      <View className="flex-row flex-wrap gap-y-3 -mx-1">
        {activeItems.map((item, index) => {
          const meta = ALL_AVAILABLE_FEATURES.find((f) => f.id === item.id);
          const iconName = meta?.iconName || item.iconName;
          const colorIcon = meta?.colorIcon || item.colorIcon || '#245FA8';
          const colorBg = meta?.colorBg || item.colorBg || 'bg-secondary';

          return (
            <View key={item.id} className="w-1/3 px-1">
              <View className="items-center justify-start gap-1 w-full py-1 bg-card/60 rounded-2xl border border-border/40 p-2">
                <View className="relative">
                  <View className={`w-[48px] h-[48px] items-center justify-center rounded-[16px] border border-border/50 ${colorBg}`}>
                    <FeatureIcon iconName={iconName} color={colorIcon} size={22} />
                  </View>

                  {/* Red X Badge to remove */}
                  <TouchableOpacity
                    onPress={() => onRemoveItem(item.id)}
                    activeOpacity={0.7}
                    className="absolute -top-1.5 -right-2 bg-destructive rounded-full p-1 shadow-sm border-2 border-card"
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name}`}
                  >
                    <X size={10} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Text
                  className="text-[11px] font-medium font-sans text-foreground text-center px-0.5 leading-snug"
                  numberOfLines={2}
                >
                  {tFeatureName(item.id, meta?.name || item.name)}
                </Text>

                {/* Reorder Left/Right Buttons */}
                {onReorderItem && activeItems.length > 1 ? (
                  <View className="flex-row items-center justify-center gap-2 mt-1">
                    {index > 0 ? (
                      <TouchableOpacity
                        onPress={() => handleMoveLeft(index)}
                        className="w-5 h-5 rounded-full bg-secondary/80 items-center justify-center border border-border/60"
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Move action left"
                      >
                        <ChevronLeft size={12} className="text-muted-foreground" />
                      </TouchableOpacity>
                    ) : (
                      <View className="w-5 h-5" />
                    )}

                    {index < activeItems.length - 1 ? (
                      <TouchableOpacity
                        onPress={() => handleMoveRight(index)}
                        className="w-5 h-5 rounded-full bg-secondary/80 items-center justify-center border border-border/60"
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Move action right"
                      >
                        <ChevronRight size={12} className="text-muted-foreground" />
                      </TouchableOpacity>
                    ) : (
                      <View className="w-5 h-5" />
                    )}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}

        {/* Empty Slots with Dashed Borders */}
        {Array.from({ length: emptySlotsCount }).map((_, index) => (
          <View key={`empty_${index}`} className="w-1/3 px-1">
            <View
              className={`w-full h-[98px] border border-dashed rounded-[18px] items-center justify-center p-2 transition-colors ${
                isDropTargetActive
                  ? 'border-primary/80 bg-primary/10'
                  : 'border-border/70 bg-muted/10'
              }`}
            >
              <Plus size={16} className={isDropTargetActive ? 'text-primary' : 'text-muted-foreground/50'} />
              <Text
                className={`text-[10px] font-medium font-sans mt-1 ${
                  isDropTargetActive ? 'text-primary font-bold' : 'text-muted-foreground/60'
                }`}
              >
                {isDropTargetActive ? 'Drop Here' : t('empty_slot', 'Empty Slot')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default CustomiseDeckZone;
