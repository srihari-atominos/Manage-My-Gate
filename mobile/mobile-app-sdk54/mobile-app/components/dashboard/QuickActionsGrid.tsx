import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { SlidersHorizontal, LayoutGrid } from 'lucide-react-native';
import FeatureIcon from '@/components/ui/FeatureIcon';
import ActionTile from './ActionTile';
import { FeatureItem } from '@/src/features/dashboard/dashboardService';
import {
  ALL_AVAILABLE_FEATURES,
  DEFAULT_5_QUICK_ACTIONS,
} from '@/src/features/dashboard/dashboardCatalog';

interface QuickActionsGridProps {
  activeFeatureIds?: string[];
  equippedFeatures?: FeatureItem[];
  onOpenCustomise: () => void;
  onOpenViewMore: () => void;
  onTilePress?: (tileId: string) => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  activeFeatureIds = DEFAULT_5_QUICK_ACTIONS,
  equippedFeatures: propEquippedFeatures,
  onOpenCustomise,
  onOpenViewMore,
  onTilePress,
}) => {
  // Exactly 5 customizable feature items for slots 1 through 5
  const displayFeatures = React.useMemo(() => {
    if (propEquippedFeatures && propEquippedFeatures.length > 0) {
      return propEquippedFeatures.slice(0, 5);
    }
    const ids = (activeFeatureIds && activeFeatureIds.length > 0 ? activeFeatureIds : DEFAULT_5_QUICK_ACTIONS).slice(0, 5);
    return ids
      .map((id) => ALL_AVAILABLE_FEATURES.find((item) => item.id === id))
      .filter((item): item is typeof ALL_AVAILABLE_FEATURES[0] => Boolean(item));
  }, [propEquippedFeatures, activeFeatureIds]);

  return (
    <View className="gap-3 my-3">
      {/* Section Header with View all & Customise Buttons */}
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-[17px] font-bold font-sans text-foreground tracking-tight">
          Quick Actions
        </Text>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={onOpenViewMore}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-full"
          >
            <Text className="text-[11px] font-bold font-sans text-primary">View all</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenCustomise}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 bg-secondary border border-border/80 px-2.5 py-1 rounded-full"
          >
            <SlidersHorizontal size={11} className="text-muted-foreground" />
            <Text className="text-[11px] font-bold font-sans text-foreground">Customise</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Exactly 6 Cards in 3x2 Bento Grid: 5 Features + 1 "View all" (No status pill badges) */}
      <View className="flex-row flex-wrap gap-y-2.5 -mx-1">
        {/* 5 Feature Cards */}
        {displayFeatures.map((tile) => {
          const meta = ALL_AVAILABLE_FEATURES.find((f) => f.id === tile.id);
          const iconName = meta?.iconName || tile.iconName;
          const colorIcon = meta?.colorIcon || tile.colorIcon || '#c5a059';
          const colorBg = meta?.colorBg || tile.colorBg || 'bg-secondary';

          return (
            <ActionTile
              key={tile.id}
              containerClassName="w-1/3 px-1"
              iconBgColor={colorBg}
              icon={<FeatureIcon iconName={iconName} color={colorIcon} size={20} />}
              label={meta?.name || tile.name}
              subtitle={meta?.subtitle || tile.subtitle}
              metaValue={meta?.subtitle || tile.subtitle}
              badge={tile.badge}
              badgeColor={tile.badgeColor}
              onPress={() => onTilePress && onTilePress(tile.id)}
            />
          );
        })}

        {/* 6th Card: "View all" */}
        <ActionTile
          containerClassName="w-1/3 px-1"
          iconBgColor="bg-primary/15 border border-primary/30"
          icon={<LayoutGrid size={22} color="#0284c7" />}
          label="View all"
          subtitle="All features"
          metaValue="Explore 25+ modules"
          onPress={onOpenViewMore}
        />
      </View>
    </View>
  );
};

export default QuickActionsGrid;
