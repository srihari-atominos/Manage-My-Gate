import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../ui/text';
import { Star } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import FeatureIcon from '../ui/FeatureIcon';
import { ALL_AVAILABLE_FEATURES, AppFeatureItem } from '../../src/features/dashboard/dashboardCatalog';
import { useTranslation } from '../../src/utils/i18n';

export type AvailableFeatureCardItem = AppFeatureItem;

export interface CustomiseAvailableZoneProps {
  features: AvailableFeatureCardItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

interface AvailableFeatureCardProps {
  feature: AvailableFeatureCardItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const AvailableFeatureCard: React.FC<AvailableFeatureCardProps> = React.memo(({
  feature,
  isSelected,
  onToggleSelect,
}) => {
  const { tFeatureName } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const meta = ALL_AVAILABLE_FEATURES.find((item) => item.id === feature.id);
  const iconName = meta?.iconName || feature.iconName;
  const imageName = meta?.imageName || feature.imageName;
  const colorIcon = meta?.colorIcon || feature.colorIcon || '#245FA8';
  const colorBg = meta?.colorBg || feature.colorBg || 'bg-secondary';

  return (
    <View className="w-1/4 px-1.5 pb-4">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onToggleSelect(feature.id)}
        className="relative items-center"
        accessibilityRole="button"
        accessibilityLabel={`${meta?.name || feature.name}, ${isSelected ? 'Selected quick action' : 'Add to quick actions'}`}
      >
        <View
          style={{
            backgroundColor: isDark
              ? isSelected ? 'rgba(255, 106, 0, 0.12)' : '#262626'
              : isSelected ? 'rgba(255, 106, 0, 0.08)' : '#FFFFFF',
          }}
          className={`h-[86px] w-full items-center justify-center rounded-[20px] border transition-colors ${
            isSelected ? 'border-primary border-2 shadow-xs' : 'border-border/65'
          }`}
        >
          <View className={`size-11 items-center justify-center rounded-[16px] border border-border/40 ${colorBg}`}>
            <FeatureIcon iconName={iconName} imageName={imageName} color={colorIcon} size={18} strokeWidth={1.9} />
          </View>
        </View>

        {isSelected ? (
          <View className="absolute -right-1 -top-1 size-6 rounded-full bg-primary items-center justify-center border-2 border-card z-10 shadow-xs">
            <Star size={11} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        ) : null}

        <Text
          className={`mt-1.5 min-h-[30px] text-[11px] text-center leading-tight tracking-tight ${
            isSelected ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
          }`}
          numberOfLines={2}
        >
          {tFeatureName(feature.id, meta?.name || feature.name)}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

/** One selectable catalogue: starred tiles are the current first seven Quick Actions. */
export const CustomiseAvailableZone: React.FC<CustomiseAvailableZoneProps> = ({
  features,
  selectedIds,
  onToggleSelect,
}) => {
  return (
    <View className="px-3.5 pt-5 pb-2">
      <View className="flex-row flex-wrap -mx-1.5">
        {features.map((feature) => (
          <AvailableFeatureCard
            key={feature.id}
            feature={feature}
            isSelected={selectedIds.includes(feature.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </View>
    </View>
  );
};

export default CustomiseAvailableZone;
