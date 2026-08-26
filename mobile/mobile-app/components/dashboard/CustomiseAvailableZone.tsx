import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Check, Plus } from 'lucide-react-native';
import FeatureIcon from '@/components/ui/FeatureIcon';

export interface AvailableFeatureCardItem {
  id: string;
  name: string;
  subtitle: string;
  iconName: string;
  colorBg: string;
  colorIcon: string;
  categoryKey?: string;
  categoryName?: string;
}

export interface CustomiseAvailableZoneProps {
  features: AvailableFeatureCardItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

export const CustomiseAvailableZone: React.FC<CustomiseAvailableZoneProps> = ({
  features,
  selectedIds,
  onToggleSelect,
}) => {
  // Group features by categoryName
  const groupedCategories = useMemo(() => {
    const map = new Map<string, { categoryName: string; items: AvailableFeatureCardItem[] }>();

    features.forEach((feature) => {
      const catName = feature.categoryName || 'Other Actions';
      if (!map.has(catName)) {
        map.set(catName, { categoryName: catName, items: [] });
      }
      map.get(catName)!.items.push(feature);
    });

    return Array.from(map.values());
  }, [features]);

  return (
    <View className="p-3.5 gap-4">
      {groupedCategories.map((group) => (
        <View key={group.categoryName} className="gap-2">
          {/* Category Sub-header */}
          <View className="flex-row items-center justify-between pb-1 border-b border-border/60">
            <Text className="text-xs font-extrabold text-foreground tracking-wide">
              {group.categoryName}
            </Text>
            <Text className="text-[10px] font-semibold text-muted-foreground">
              {group.items.filter((i) => selectedIds.includes(i.id)).length}/{group.items.length} Enabled
            </Text>
          </View>

          {/* 3-Column Grid for Category Items */}
          <View className="flex-row flex-wrap gap-2 justify-start">
            {group.items.map((feature) => {
              const isSelected = selectedIds.includes(feature.id);
              return (
                <TouchableOpacity
                  key={feature.id}
                  onPress={() => onToggleSelect(feature.id)}
                  activeOpacity={0.8}
                  className={`w-[31.5%] p-2.5 rounded-2xl border items-center justify-between min-h-[105px] gap-1 ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-muted/40 border-border opacity-90'
                  }`}
                >
                  <View className={`p-2 rounded-xl ${feature.colorBg}`}>
                    <FeatureIcon iconName={feature.iconName} color={feature.colorIcon} size={18} />
                  </View>

                  <View className="items-center w-full px-0.5">
                    <Text
                      className="text-[11px] font-bold text-foreground text-center leading-tight w-full"
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {feature.name}
                    </Text>

                    <Text
                      className="text-[9px] text-muted-foreground text-center mt-0.5 w-full"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {feature.subtitle}
                    </Text>
                  </View>

                  <View className="mt-0.5">
                    {isSelected ? (
                      <View className="bg-primary px-2 py-0.5 rounded-full flex-row items-center gap-1">
                        <Check size={10} color="#fff" />
                        <Text className="text-[9px] font-bold text-primary-foreground">Added</Text>
                      </View>
                    ) : (
                      <View className="bg-muted px-2 py-0.5 rounded-full flex-row items-center gap-1 border border-border">
                        <Plus size={10} color="#64748b" />
                        <Text className="text-[9px] font-medium text-slate-500">Add</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
};

export default CustomiseAvailableZone;
