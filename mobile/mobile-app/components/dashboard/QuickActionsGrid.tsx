import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../ui/text';
import { SlidersHorizontal, AlertCircle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import FeatureIcon from '../ui/FeatureIcon';
import ActionTile from './ActionTile';
import { FeatureItem } from '../../src/features/dashboard/dashboardService';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { ALL_AVAILABLE_FEATURES } from '../../src/features/dashboard/dashboardCatalog';
import { isFeatureAllowedForUser, getDefaultQuickActionsForUser } from '../../src/utils/rbac';
import { useTranslation } from '../../src/utils/i18n';

interface QuickActionsGridProps {
  activeFeatureIds?: string[];
  equippedFeatures?: FeatureItem[];
  onOpenCustomise: () => void;
  onTilePress?: (tileId: string) => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  activeFeatureIds,
  equippedFeatures: propEquippedFeatures,
  onOpenCustomise,
  onTilePress,
}) => {
  const { user } = useAuth();
  const { t, tFeatureName, tFeatureSubtitle, language } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Permitted features for the user's role (Rule: Min 1, Max 7 cards).
  const displayFeatures = React.useMemo(() => {
    // 1. If equipped features passed from hook, filter strictly to permitted items
    if (propEquippedFeatures && propEquippedFeatures.length > 0) {
      const allowed = propEquippedFeatures.filter((item) => isFeatureAllowedForUser(item, user));
      if (allowed.length > 0) {
        return allowed.slice(0, 7);
      }
    }

    const defaultIds = getDefaultQuickActionsForUser(user);
    const candidateIds = activeFeatureIds && activeFeatureIds.length > 0 ? activeFeatureIds : defaultIds;

    // 2. Filter candidate IDs strictly to permitted features only
    const allowedItems = candidateIds
      .map((id) => ALL_AVAILABLE_FEATURES.find((item) => item.id === id))
      .filter((item): item is typeof ALL_AVAILABLE_FEATURES[0] => Boolean(item) && isFeatureAllowedForUser(item!, user));

    if (allowedItems.length > 0) {
      return allowedItems.slice(0, 7);
    }

    // 3. Fallback strictly to default permitted items for this persona
    return defaultIds
      .map((id) => ALL_AVAILABLE_FEATURES.find((item) => item.id === id))
      .filter((item): item is typeof ALL_AVAILABLE_FEATURES[0] => Boolean(item) && isFeatureAllowedForUser(item!, user))
      .slice(0, 7);
  }, [propEquippedFeatures, activeFeatureIds, user, language]);

  return (
    <View className="gap-3.5 my-2">
      {/* Section Header with Customise Button */}
      <View className="flex-row items-center justify-between px-1">
        <Text
          style={{ fontFamily: 'HankenGrotesk_700Bold' }}
          className="text-[20px] font-bold text-foreground tracking-tight leading-6"
        >
          {t('quick_actions', 'Quick Actions')}
        </Text>

        <TouchableOpacity
          onPress={onOpenCustomise}
          activeOpacity={0.75}
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(31, 41, 55, 0.12)',
          }}
          className="flex-row h-9 min-h-[36px] items-center gap-1.5 border px-3.5 py-1 rounded-full shadow-2xs"
          accessibilityRole="button"
          accessibilityLabel={t('customise', 'Customise')}
        >
          <SlidersHorizontal size={14} color="#111827" strokeWidth={2.6} />
          <Text className="text-[13px] font-extrabold text-black">{t('customise', 'Customise')}</Text>
        </TouchableOpacity>
      </View>

      {/* Balanced 4-column Quick Actions Grid (Rule: Min 1, Max 7 Cards) */}
      {displayFeatures.length === 0 ? (
        <View className="px-4 py-5 rounded-2xl border border-dashed border-border bg-card/40 items-center justify-center gap-2 my-1">
          <AlertCircle size={20} className="text-muted-foreground" />
          <Text className="text-[12.5px] font-bold text-foreground text-center">
            {t('no_quick_actions_selected', 'No quick actions selected')}
          </Text>
          <Text className="text-[11.5px] text-muted-foreground text-center px-4">
            {t('select_at_least_one_action', 'You need to select at least 1 feature in quick actions')}
          </Text>
          <TouchableOpacity
            onPress={onOpenCustomise}
            className="mt-1 px-4 py-2 rounded-full bg-primary"
          >
            <Text className="text-[12px] font-bold text-primary-foreground">
              {t('customise_now', 'Customise Now')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row flex-wrap justify-start gap-x-[2.4%] gap-y-3.5">
          {displayFeatures.slice(0, 7).map((tile) => {
            const meta = ALL_AVAILABLE_FEATURES.find((f) => f.id === tile.id);
            const iconName = meta?.iconName || tile.iconName;
            const imageName = meta?.imageName || (tile as any).imageName;
            const colorIcon = meta?.colorIcon || tile.colorIcon || '#EA580C';
            return (
              <ActionTile
                key={tile.id}
                compact={true}
                containerClassName="w-[23.2%]"
                iconIsImage={Boolean(imageName)}
                icon={<FeatureIcon iconName={iconName} imageName={imageName} color={colorIcon} size={imageName ? 18 : 21} strokeWidth={1.9} />}
                label={tFeatureName(tile.id, meta?.name || tile.name)}
                subtitle={tFeatureSubtitle(tile.id, meta?.subtitle || tile.subtitle)}
                metaValue={tFeatureSubtitle(tile.id, meta?.subtitle || tile.subtitle)}
                onPress={() => onTilePress && onTilePress(tile.id)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

export default QuickActionsGrid;
