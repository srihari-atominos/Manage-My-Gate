import React, { useMemo } from 'react';
import { View, TouchableOpacity, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Text } from '@/components/ui/text';
import { Check, Plus, GripVertical } from 'lucide-react-native';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { ALL_AVAILABLE_FEATURES, AppFeatureItem } from '@/src/features/dashboard/dashboardCatalog';
import { useTranslation } from '@/src/utils/i18n';
import { cn } from '@/lib/utils';

export type AvailableFeatureCardItem = AppFeatureItem;

export interface CustomiseAvailableZoneProps {
  features: AvailableFeatureCardItem[];
  selectedIds: string[];
  isMaxCapacityReached?: boolean;
  onToggleSelect: (id: string) => void;
  onItemDragStart?: (feature: AvailableFeatureCardItem, x: number, y: number) => void;
  onItemDragMove?: (x: number, y: number) => void;
  onItemDragEnd?: (x: number, y: number) => void;
}

interface DraggableAvailableCardProps {
  feature: AvailableFeatureCardItem;
  isSelected: boolean;
  isMaxCapacity: boolean;
  onToggleSelect: (id: string) => void;
  onItemDragStart?: (feature: AvailableFeatureCardItem, x: number, y: number) => void;
  onItemDragMove?: (x: number, y: number) => void;
  onItemDragEnd?: (x: number, y: number) => void;
}

const DraggableAvailableCard: React.FC<DraggableAvailableCardProps> = ({
  feature,
  isSelected,
  isMaxCapacity,
  onToggleSelect,
  onItemDragStart,
  onItemDragMove,
  onItemDragEnd,
}) => {
  const { t, tFeatureName } = useTranslation();
  const meta = ALL_AVAILABLE_FEATURES.find((f) => f.id === feature.id);
  const iconName = meta?.iconName || feature.iconName;
  const colorIcon = meta?.colorIcon || feature.colorIcon || '#245FA8';
  const colorBg = meta?.colorBg || feature.colorBg || 'bg-secondary';

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(160)
    .onStart((e) => {
      if (onItemDragStart) {
        onItemDragStart(feature, e.absoluteX, e.absoluteY);
      }
    })
    .onUpdate((e) => {
      if (onItemDragMove) {
        onItemDragMove(e.absoluteX, e.absoluteY);
      }
    })
    .onEnd((e) => {
      if (onItemDragEnd) {
        onItemDragEnd(e.absoluteX, e.absoluteY);
      }
    });

  return (
    <View className="w-1/3 px-1">
      <GestureDetector gesture={panGesture}>
        <TouchableOpacity
          onPress={() => onToggleSelect(feature.id)}
          activeOpacity={0.75}
          className={cn(
            'p-2.5 rounded-2xl border items-center justify-between min-h-[114px] gap-1.5 transition-all',
            isSelected
              ? 'bg-primary/10 border-primary/40'
              : 'bg-card border-border/80 shadow-xs active:bg-secondary/60'
          )}
          accessibilityRole="button"
          accessibilityLabel={`${isSelected ? t('remove', 'Remove') : t('add', 'Add')} ${meta?.name || feature.name}`}
        >
          {/* Feature Icon Bubble */}
          <View className={`w-[46px] h-[46px] items-center justify-center rounded-[16px] border border-border/40 ${colorBg} shadow-xs`}>
            <FeatureIcon iconName={iconName} color={colorIcon} size={20} />
          </View>

          {/* Feature Title */}
          <View className="items-center w-full px-0.5">
            <Text
              className="text-[11px] font-semibold font-sans text-foreground text-center leading-tight w-full"
              numberOfLines={2}
            >
              {tFeatureName(feature.id, meta?.name || feature.name)}
            </Text>
          </View>

          {/* Method A: Direct CTA Add / Added Status Button */}
          <View className="mt-0.5">
            {isSelected ? (
              <View className="bg-primary px-2.5 py-0.5 rounded-full flex-row items-center gap-1 shadow-xs">
                <Check size={10} color="#fff" strokeWidth={2.5} />
                <Text className="text-[9px] font-bold font-sans text-primary-foreground">
                  {t('added', 'Added')}
                </Text>
              </View>
            ) : (
              <View className="bg-secondary px-2.5 py-0.5 rounded-full flex-row items-center gap-1 border border-border/70 shadow-2xs">
                <Plus size={10} className="text-muted-foreground" strokeWidth={2} />
                <Text className="text-[9px] font-bold font-sans text-muted-foreground">
                  {t('add', '+ Add')}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </GestureDetector>
    </View>
  );
};

export const CustomiseAvailableZone: React.FC<CustomiseAvailableZoneProps> = ({
  features,
  selectedIds,
  isMaxCapacityReached = false,
  onToggleSelect,
  onItemDragStart,
  onItemDragMove,
  onItemDragEnd,
}) => {
  const { t, tCategoryName } = useTranslation();

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
            {group.items.map((feature) => (
              <DraggableAvailableCard
                key={feature.id}
                feature={feature}
                isSelected={selectedIds.includes(feature.id)}
                isMaxCapacity={isMaxCapacityReached}
                onToggleSelect={onToggleSelect}
                onItemDragStart={onItemDragStart}
                onItemDragMove={onItemDragMove}
                onItemDragEnd={onItemDragEnd}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

export default CustomiseAvailableZone;

