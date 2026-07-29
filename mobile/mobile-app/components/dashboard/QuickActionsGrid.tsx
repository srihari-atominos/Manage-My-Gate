import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { SlidersHorizontal, Plus } from 'lucide-react-native';
import {
  REAL_APP_FEATURES,
  AppFeatureItem,
  RenderFeatureIcon,
} from './CustomiseSheetModal';

interface QuickActionsGridProps {
  activeFeatureIds: string[];
  onOpenCustomise: () => void;
  onTilePress?: (tileId: string) => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  activeFeatureIds,
  onOpenCustomise,
  onTilePress,
}) => {
  // Filter equipped features (slots 1 through 7, reserved slot 8 for + View More tile)
  const equippedFeatures: AppFeatureItem[] = React.useMemo(() => {
    return REAL_APP_FEATURES.filter((item) =>
      activeFeatureIds.includes(item.id)
    ).slice(0, 7);
  }, [activeFeatureIds]);

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
          className="flex-row items-center gap-1.5 bg-muted/60 border border-border px-3 py-1.5 rounded-full"
        >
          <SlidersHorizontal size={13} color="#03A9F4" />
          <Text className="text-xs font-bold text-primary">Customise</Text>
        </TouchableOpacity>
      </View>

      {/* 4-Column Grid: 7 Feature Tiles + 8th Yellow "+ View More" Tile */}
      <View className="flex-row flex-wrap gap-y-3.5 -mx-1">
        {equippedFeatures.map((tile) => (
          <View key={tile.id} className="w-1/4 px-1">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onTilePress && onTilePress(tile.id)}
              className="bg-card border border-border rounded-2xl p-2 items-center justify-center gap-2 aspect-square relative shadow-xs"
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
              <View className={`size-10 rounded-2xl items-center justify-center ${tile.colorBg}`}>
                <RenderFeatureIcon iconName={tile.iconName} color={tile.colorIcon} />
              </View>

              {/* Tile Title */}
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className="text-[11px] font-bold text-foreground text-center"
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
            onPress={onOpenCustomise}
            className="bg-amber-400 border border-amber-500 rounded-2xl p-2 items-center justify-center gap-2 aspect-square shadow-sm"
          >
            <View className="size-10 rounded-2xl bg-amber-500/30 items-center justify-center">
              <Plus size={22} color="#000" />
            </View>

            <Text
              numberOfLines={1}
              className="text-[11px] font-extrabold text-amber-950 text-center"
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
