import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { SlidersHorizontal, Plus } from 'lucide-react-native';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { FeatureItem } from '@/src/features/dashboard/dashboardService';
import { REAL_APP_FEATURES } from './CustomiseSheetModal';

interface QuickActionsGridProps {
  activeFeatureIds?: string[];
  equippedFeatures?: FeatureItem[];
  onOpenCustomise: () => void;
  onOpenViewMore: () => void;
  onTilePress?: (tileId: string) => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  activeFeatureIds = [],
  equippedFeatures: propEquippedFeatures,
  onOpenCustomise,
  onOpenViewMore,
  onTilePress,
}) => {
  // Use propEquippedFeatures if provided, otherwise filter from REAL_APP_FEATURES as fallback
  const displayFeatures = React.useMemo(() => {
    if (propEquippedFeatures && propEquippedFeatures.length > 0) {
      return propEquippedFeatures.slice(0, 7);
    }
    return REAL_APP_FEATURES.filter((item) =>
      (activeFeatureIds || []).includes(item.id)
    ).slice(0, 7);
  }, [propEquippedFeatures, activeFeatureIds]);

  return (
    <View className="gap-3.5 my-2">
      {/* Section Header with Customise Button */}
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-base font-extrabold text-foreground tracking-tight">
          Quick Actions
        </Text>

        <TouchableOpacity
          onPress={onOpenCustomise}
          activeOpacity={0.7}
          className="flex-row items-center gap-1.5 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-full"
        >
          <SlidersHorizontal size={13} color="#03A9F4" />
          <Text className="text-xs font-bold text-primary">Customise</Text>
        </TouchableOpacity>
      </View>

      {/* 4-Column Grid: Up to 7 Feature Tiles + 8th Yellow "+ View More" Tile */}
      <View className="flex-row flex-wrap gap-y-3 -mx-0.5">
        {displayFeatures.map((tile) => (
          <View key={tile.id} className="w-[25%] px-0.5">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onTilePress && onTilePress(tile.id)}
              className="bg-card border border-border rounded-2xl p-1.5 items-center justify-center gap-1 min-h-[92px] relative shadow-xs"
            >
              {/* Top Badge Pill */}
              {tile.badge && (
                <View
                  className={`absolute -top-1.5 px-1.5 py-0.5 rounded-full z-10 ${
                    tile.badgeColor || 'bg-primary text-white'
                  }`}
                >
                  <Text className="text-[8px] font-black text-white leading-none">{tile.badge}</Text>
                </View>
              )}

              {/* Tile Icon Container */}
              <View className={`size-8.5 rounded-2xl items-center justify-center mb-0.5 ${tile.colorBg}`}>
                <FeatureIcon iconName={tile.iconName} color={tile.colorIcon} />
              </View>

              {/* Tile Title */}
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                className="text-[10.5px] font-semibold text-foreground text-center px-0.5 leading-tight"
              >
                {tile.name}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Distinct Yellow "View More (+)" 8th Tile */}
        <View className="w-[25%] px-0.5">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenViewMore}
            className="bg-amber-400 border border-amber-500 rounded-2xl p-1.5 items-center justify-center gap-1 min-h-[92px] shadow-sm"
          >
            <View className="size-8.5 rounded-2xl bg-amber-500/30 items-center justify-center mb-0.5">
              <Plus size={18} color="#000" />
            </View>

            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              className="text-[10.5px] font-bold text-amber-950 text-center leading-tight px-0.5"
            >
              View More
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default QuickActionsGrid;
