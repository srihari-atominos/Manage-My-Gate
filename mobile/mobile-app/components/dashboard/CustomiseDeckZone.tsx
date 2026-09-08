import React from 'react';
import { View, TouchableOpacity, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { X, Plus, Sparkles, ArrowLeftRight } from 'lucide-react-native';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { ALL_AVAILABLE_FEATURES } from '@/src/features/dashboard/dashboardCatalog';
import { useTranslation } from '@/src/utils/i18n';
import { cn } from '@/lib/utils';

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
  isDropTargetActive?: boolean;
  onRemoveItem: (id: string) => void;
  onReorderItem?: (fromIndex: number, toIndex: number) => void;
  onLayout?: (e: any) => void;
}

export const CustomiseDeckZone: React.FC<CustomiseDeckZoneProps> = ({
  activeItems,
  maxCapacity = 5,
  isDropTargetActive = false,
  onRemoveItem,
  onReorderItem,
  onLayout,
}) => {
  const { t, tFeatureName } = useTranslation();
  const emptySlotsCount = Math.max(0, maxCapacity - activeItems.length);

  return (
    <View
      onLayout={onLayout}
      className={cn(
        'p-3.5 border-b transition-all',
        isDropTargetActive
          ? 'bg-primary/10 border-primary/60 shadow-md'
          : 'bg-secondary/40 border-border/70'
      )}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs font-bold font-sans text-foreground uppercase tracking-wider">
            {t('active_quick_actions_deck', 'Active Quick Actions Deck')}
          </Text>
          {isDropTargetActive && (
            <View className="bg-primary px-2 py-0.5 rounded-full flex-row items-center gap-1">
              <Sparkles size={10} color="#fff" />
              <Text className="text-[9px] font-bold text-primary-foreground">
                {t('drop_to_add', 'Drop Here')}
              </Text>
            </View>
          )}
        </View>

        <Text className={cn(
          "text-[11px] font-bold font-sans",
          activeItems.length === maxCapacity ? "text-primary" : "text-muted-foreground"
        )}>
          {activeItems.length}/{maxCapacity} {t('selected', 'Selected')}
        </Text>
      </View>

      {/* 3-Column Deck Grid (5 Slots) */}
      <View className="flex-row flex-wrap gap-y-3 -mx-1">
        {activeItems.map((item, index) => {
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
                accessibilityLabel={`Remove ${meta?.name || item.name} from deck`}
              >
                <View className="relative">
                  <View className={`w-[52px] h-[52px] items-center justify-center rounded-[18px] border border-border/50 ${colorBg} shadow-xs`}>
                    <FeatureIcon iconName={iconName} color={colorIcon} size={22} />
                  </View>

                  {/* Red X Badge for removal */}
                  <View className="absolute -top-1 -right-1.5 bg-destructive rounded-full p-0.5 shadow-sm border-2 border-card">
                    <X size={11} color="#fff" strokeWidth={2.5} />
                  </View>
                </View>

                <Text
                  className="text-[11px] font-semibold font-sans text-foreground text-center px-1 leading-snug"
                  numberOfLines={2}
                >
                  {tFeatureName(item.id, meta?.name || item.name)}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Empty Slots with Dashed Drop Target Borders */}
        {Array.from({ length: emptySlotsCount }).map((_, index) => (
          <View key={`empty_${index}`} className="w-1/3 px-1">
            <View
              className={cn(
                'w-full h-[74px] border border-dashed rounded-[18px] items-center justify-center p-2 transition-all',
                isDropTargetActive
                  ? 'border-primary bg-primary/15 border-2 scale-105'
                  : 'border-border/70 bg-muted/10'
              )}
            >
              <Plus
                size={16}
                className={isDropTargetActive ? 'text-primary' : 'text-muted-foreground/50'}
              />
              <Text
                className={cn(
                  'text-[10px] font-medium font-sans mt-1 text-center',
                  isDropTargetActive ? 'text-primary font-bold' : 'text-muted-foreground/60'
                )}
              >
                {isDropTargetActive ? t('drop_target', 'Drop Slot') : t('empty_slot', 'Empty Slot')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default CustomiseDeckZone;

