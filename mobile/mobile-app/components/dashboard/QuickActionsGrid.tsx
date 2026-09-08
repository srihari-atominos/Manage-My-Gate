import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { SlidersHorizontal } from 'lucide-react-native';
import FeatureIcon from '@/components/ui/FeatureIcon';
import ActionTile from './ActionTile';
import { FeatureItem } from '@/src/features/dashboard/dashboardService';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { ALL_AVAILABLE_FEATURES, DEFAULT_6_QUICK_ACTIONS } from '@/src/features/dashboard/dashboardCatalog';
import { isFeatureAllowedForUser, getDefaultQuickActionsForUser } from '@/src/utils/rbac';
import { useTranslation } from '@/src/utils/i18n';

interface QuickActionsGridProps {
  activeFeatureIds?: string[];
  equippedFeatures?: FeatureItem[];
  onOpenCustomise: () => void;
  onOpenViewMore: () => void;
  onTilePress?: (tileId: string) => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  activeFeatureIds,
  equippedFeatures: propEquippedFeatures,
  onOpenCustomise,
  onOpenViewMore,
  onTilePress,
}) => {
  const { user } = useAuth();
  const { t, tFeatureName, tFeatureSubtitle } = useTranslation();

  // Strictly permitted features for the user's role (up to 6 cards). Forbidden cards are NEVER displayed.
  const displayFeatures = React.useMemo(() => {
    // 1. If equipped features passed from hook, filter strictly to permitted items
    if (propEquippedFeatures && propEquippedFeatures.length > 0) {
      const allowed = propEquippedFeatures.filter((item) => isFeatureAllowedForUser(item, user));
      if (allowed.length > 0) {
        return allowed.slice(0, 6);
      }
    }

    const defaultIds = getDefaultQuickActionsForUser(user);
    const candidateIds = (activeFeatureIds && activeFeatureIds.length > 0 ? activeFeatureIds : defaultIds);

    // 2. Filter candidate IDs strictly to permitted features only
    const allowedItems = candidateIds
      .map((id) => ALL_AVAILABLE_FEATURES.find((item) => item.id === id))
      .filter((item): item is typeof ALL_AVAILABLE_FEATURES[0] => Boolean(item) && isFeatureAllowedForUser(item!, user));

    if (allowedItems.length > 0) {
      return allowedItems.slice(0, 6);
    }

    // 3. Fallback strictly to default permitted items for this persona
    return defaultIds
      .map((id) => ALL_AVAILABLE_FEATURES.find((item) => item.id === id))
      .filter((item): item is typeof ALL_AVAILABLE_FEATURES[0] => Boolean(item) && isFeatureAllowedForUser(item!, user))
      .slice(0, 6);
  }, [propEquippedFeatures, activeFeatureIds, user]);


  return (
    <View className="gap-2.5 my-2">
      {/* Section Header with Customise Button only */}
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-[17px] font-bold font-sans text-foreground tracking-tight">
          {t('quick_actions', 'Quick Actions')}
        </Text>

        <TouchableOpacity
          onPress={onOpenCustomise}
          activeOpacity={0.7}
          className="flex-row items-center gap-1 bg-secondary border border-border/80 px-2.5 py-1 rounded-full shadow-2xs"
        >
          <SlidersHorizontal size={11} className="text-muted-foreground" />
          <Text className="text-[11px] font-bold font-sans text-foreground">{t('customise', 'Customise')}</Text>
        </TouchableOpacity>
      </View>


      {/* Exactly 6 Feature Cards in Clean 2-Column Grid (3 rows x 2 columns) */}
      <View className="flex-row flex-wrap -mx-1.5">
        {displayFeatures.map((tile) => {
          const meta = ALL_AVAILABLE_FEATURES.find((f) => f.id === tile.id);
          const iconName = meta?.iconName || tile.iconName;
          const colorIcon = meta?.colorIcon || tile.colorIcon || '#2563EB';
          const colorBg = meta?.colorBg || tile.colorBg || 'bg-blue-50 dark:bg-blue-950/40';
          const iconShapeClass = meta?.iconShapeClass || 'rounded-[15px]';
          const badge = meta?.badge || tile.badge;
          const badgeColor = meta?.badgeColor || tile.badgeColor;

          return (
            <ActionTile
              key={tile.id}
              containerClassName="w-1/2 px-1.5 py-1.5"
              iconBgColor={colorBg}
              iconShapeClass={iconShapeClass}
              icon={<FeatureIcon iconName={iconName} color={colorIcon} size={24} />}
              label={tFeatureName(tile.id, meta?.name || tile.name)}
              subtitle={tFeatureSubtitle(tile.id, meta?.subtitle || tile.subtitle)}
              metaValue={tFeatureSubtitle(tile.id, meta?.subtitle || tile.subtitle)}
              badge={badge}
              badgeColor={badgeColor}
              onPress={() => onTilePress && onTilePress(tile.id)}
            />
          );
        })}
      </View>
    </View>
  );
};

export default QuickActionsGrid;

