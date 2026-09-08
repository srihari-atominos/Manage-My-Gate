import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Check, Plus, GripVertical } from 'lucide-react-native';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { ALL_AVAILABLE_FEATURES, AppFeatureItem } from '@/src/features/dashboard/dashboardCatalog';
import { useTranslation } from '@/src/utils/i18n';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

export type AvailableFeatureCardItem = AppFeatureItem;

export interface CustomiseAvailableZoneProps {
  features: AvailableFeatureCardItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onDragStart?: (feature: AvailableFeatureCardItem, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (feature: AvailableFeatureCardItem, absoluteX: number, absoluteY: number) => void;
}

export const CustomiseAvailableZone: React.FC<CustomiseAvailableZoneProps> = ({
  features,
  selectedIds,
  onToggleSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const { t, tCategoryName, tFeatureName } = useTranslation();

  // Group features by categoryKey/categoryName
  const groupedCategories = useMemo(() => {
    const map = new Map<string, { categoryKey?: string; categoryName: string; items: AvailableFeatureCardItem[] }>();

    features.forEach((feature) => {
      const catKey = feature.categoryKey || 'other';
      const catName = feature.categoryName || 'Other Actions';
      if (!map.has(catKey)) {
        map.set(catKey, { categoryKey: feature.categoryKey, categoryName: catName, items: [] });
      }
      map.get(catKey)!.items.push(feature);
    });

    return Array.from(map.values());
  }, [features]);

  return (
    <View className="p-3.5 gap-4">
      {groupedCategories.map((group) => (
        <View key={group.categoryKey || group.categoryName} className="gap-2">
          {/* Category Sub-header */}
          <View className="flex-row items-center justify-between pb-1 border-b border-border/60">
            <Text className="text-xs font-extrabold text-foreground tracking-wide">
              {tCategoryName(group.categoryKey, group.categoryName)}
            </Text>
            <Text className="text-[10px] font-semibold text-muted-foreground">
              {group.items.filter((i) => selectedIds.includes(i.id)).length}/{group.items.length} {t('enabled', 'Enabled')}
            </Text>
          </View>

          {/* 3-Column Grid for Category Items */}
          <View className="flex-row flex-wrap gap-y-3 -mx-1">
            {group.items.map((feature) => {
              const meta = ALL_AVAILABLE_FEATURES.find((f) => f.id === feature.id);
              const iconName = meta?.iconName || feature.iconName;
              const colorIcon = meta?.colorIcon || feature.colorIcon || '#245FA8';
              const colorBg = meta?.colorBg || feature.colorBg || 'bg-secondary';
              const isSelected = selectedIds.includes(feature.id);

              const panGesture = Gesture.Pan()
                .activateAfterLongPress(160)
                .onStart((e) => {
                  if (onDragStart) {
                    onDragStart(feature, e.absoluteX, e.absoluteY);
                  }
                })
                .onUpdate((e) => {
                  if (onDragMove) {
                    onDragMove(e.absoluteX, e.absoluteY);
                  }
                })
                .onEnd((e) => {
                  if (onDragEnd) {
                    onDragEnd(feature, e.absoluteX, e.absoluteY);
                  }
                });

              return (
                <View key={feature.id} className="w-1/3 px-1">
                  <GestureDetector gesture={panGesture}>
                    <TouchableOpacity
                      onPress={() => onToggleSelect(feature.id)}
                      activeOpacity={0.7}
                      className={`p-2.5 rounded-2xl border items-center justify-between min-h-[114px] gap-1.5 ${
                        isSelected
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-card border-border/80 shadow-xs'
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel={`${meta?.name || feature.name}, ${isSelected ? 'Added' : 'Tap to Add'}`}
                    >
                      <View className={`w-[46px] h-[46px] items-center justify-center rounded-[16px] border border-border/40 ${colorBg}`}>
                        <FeatureIcon iconName={iconName} color={colorIcon} size={20} />
                      </View>

                      <View className="items-center w-full px-0.5">
                        <Text
                          className="text-[11px] font-medium font-sans text-foreground text-center leading-tight w-full"
                          numberOfLines={2}
                        >
                          {tFeatureName(feature.id, meta?.name || feature.name)}
                        </Text>
                      </View>

                      {/* Method A: + Add / Added Button */}
                      <View className="mt-0.5">
                        {isSelected ? (
                          <View className="bg-primary px-2.5 py-0.5 rounded-full flex-row items-center gap-1">
                            <Check size={10} color="#fff" />
                            <Text className="text-[9px] font-bold font-sans text-primary-foreground">{t('added', 'Added')}</Text>
                          </View>
                        ) : (
                          <View className="bg-secondary px-2.5 py-0.5 rounded-full flex-row items-center gap-1 border border-border/70">
                            <Plus size={10} className="text-muted-foreground" />
                            <Text className="text-[9px] font-medium font-sans text-muted-foreground">{t('add', 'Add')}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  </GestureDetector>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
};

export default CustomiseAvailableZone;
