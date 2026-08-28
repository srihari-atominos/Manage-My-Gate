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

import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';

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
  // Redux Selectors for Real-Time App-Wide Feature Badges
  const visitorPassState = useSelector((state: RootState) => (state as any).visitorPass);
  const billingState = useSelector((state: RootState) => (state as any).billing);
  const complaintState = useSelector((state: RootState) => (state as any).complaints);
  const noticeState = useSelector((state: RootState) => (state as any).noticeBoard);
  const pollState = useSelector((state: RootState) => (state as any).poll);
  const directoryState = useSelector((state: RootState) => (state as any).directory);
  const amenityState = useSelector((state: RootState) => (state as any).amenityBookings);

  // Dynamic Badge Resolver
  const getFeatureBadge = (featureId: string): string | undefined => {
    switch (featureId) {
      case 'visitor_resident_passes':
      case 'visitor_management': {
        const count = visitorPassState?.passes?.length || visitorPassState?.pendingWalkInsCount || 0;
        return count > 0 ? String(count) : undefined;
      }
      case 'amenities': {
        const count = amenityState?.dashboardStats?.amenityKpis?.activeAmenities ?? amenityState?.dashboardStats?.kpis?.totalAmenities ?? 0;
        return count > 0 ? String(count) : undefined;
      }
      case 'billing':
      case 'billing_dashboard': {
        const count = billingState?.invoices?.length || billingState?.unpaidCount || 0;
        return count > 0 ? String(count) : undefined;
      }
      case 'complaints': {
        const count = complaintState?.complaints?.length || complaintState?.openCount || 0;
        return count > 0 ? String(count) : undefined;
      }
      case 'notices':
      case 'notices_active_board': {
        const count = noticeState?.stats?.activeNotices || noticeState?.notices?.length || 0;
        return count > 0 ? String(count) : undefined;
      }
      case 'polls': {
        const count = pollState?.polls?.length || 0;
        return count > 0 ? String(count) : undefined;
      }
      case 'directory': {
        const count = directoryState?.pagination?.totalRecords || directoryState?.members?.length || 0;
        return count > 0 ? String(count) : undefined;
      }
      default:
        return undefined;
    }
  };

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
            className="flex-row items-center gap-1 bg-[#245FA8]/10 border border-[#245FA8]/30 px-2.5 py-1 rounded-full shadow-xs"
          >
            <Text className="text-[11px] font-bold font-sans text-[#245FA8]">View all</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenCustomise}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 bg-secondary border border-border/80 px-2.5 py-1 rounded-full shadow-xs"
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
          const colorIcon = meta?.colorIcon || tile.colorIcon || '#245FA8';
          const colorBg = meta?.colorBg || tile.colorBg || 'bg-secondary';
          const iconShapeClass = meta?.iconShapeClass;

          return (
            <ActionTile
              key={tile.id}
              containerClassName="w-1/3 px-1"
              iconBgColor={colorBg}
              iconShapeClass={iconShapeClass}
              icon={<FeatureIcon iconName={iconName} color={colorIcon} size={22} />}
              label={meta?.name || tile.name}
              subtitle={meta?.subtitle || tile.subtitle}
              metaValue={meta?.subtitle || tile.subtitle}
              badge={getFeatureBadge(tile.id) ?? tile.badge}
              badgeColor={tile.badgeColor}
              onPress={() => onTilePress && onTilePress(tile.id)}
            />
          );
        })}

        {/* 6th Card: "View all" */}
        <ActionTile
          containerClassName="w-1/3 px-1"
          iconBgColor="bg-[#EBF2FC]"
          iconShapeClass="rounded-full"
          icon={<LayoutGrid size={22} color="#245FA8" />}
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
