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
      <View className="flex-row flex-wrap gap-y-3.5 -mx-1">
        {displayFeatures.map((tile) => (
          <View key={tile.id} className="w-1/4 px-1">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onTilePress && onTilePress(tile.id)}
              className="bg-card border border-border rounded-2xl p-2 items-center justify-center gap-1.5 min-h-[82px] relative shadow-xs"
            >
              {/* Top Badge Pill */}
              {tile.badge && (
                <View
                  className={`absolute -top-1.5 px-1.5 py-0.5 rounded-full ${
                    tile.badgeColor || 'bg-primary text-white'
                  }`}
                >
                  <Text className="text-[8px] font-black text-white">{tile.badge}</Text>
                </View>
              )}

              {/* Tile Icon Container */}
              <View className={`size-9 rounded-2xl items-center justify-center ${tile.colorBg}`}>
                <FeatureIcon iconName={tile.iconName} color={tile.colorIcon} />
              </View>

              {/* Tile Title */}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                ellipsizeMode="tail"
                className="text-[10px] font-bold text-foreground text-center px-0.5 leading-tight"
              >
                {tile.name}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Distinct Yellow "View More (+)" 8th Tile */}
        <View className="w-1/4 px-1">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenViewMore}
            className="bg-amber-400 border border-amber-500 rounded-2xl p-2 items-center justify-center gap-1.5 min-h-[82px] shadow-sm"
          >
            <View className="size-9 rounded-2xl bg-amber-500/30 items-center justify-center">
              <Plus size={20} color="#000" />
            </View>

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              className="text-[10px] font-extrabold text-amber-950 text-center leading-tight"
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
