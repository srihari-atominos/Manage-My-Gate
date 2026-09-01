import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MobileHeader from '@/components/navigation/MobileHeader';
import HeroBanner from '@/components/dashboard/HeroBanner';
import QuickActionsGrid from '@/components/dashboard/QuickActionsGrid';
import CustomiseSheetModal from '@/components/dashboard/CustomiseSheetModal';
import { useQuickActions } from '@/src/features/dashboard/useQuickActions';

export default function DashboardScreen() {
  const router = useRouter();
  const [customiseOpen, setCustomiseOpen] = React.useState(false);

  const {
    activeQuickActions,
    equippedFeatures,
    allFeaturesList,
    saveQuickActions,
  } = useQuickActions();

  const insets = useSafeAreaInsets();

  const handleSaveCustomisation = async (selectedIds: string[]) => {
    await saveQuickActions(selectedIds);
  };

  const handleTilePress = (tileId: string) => {
    if (tileId === 'visitor_resident_passes') {
      router.push('/(resident)/visitor' as any);
      return;
    }
    if (tileId === 'billing_dashboard') {
      router.push('/(resident)/billing' as any);
      return;
    }
    if (tileId === 'billing_action_center') {
      router.push('/(resident)/admin/billing/ledger' as any);
      return;
    }
    if (tileId === 'billing_assessment_manager') {
      router.push('/(resident)/admin/billing/assessments' as any);
      return;
    }
    const feature = allFeaturesList.find((item) => item.id === tileId);
    if (feature && feature.route) {
      let targetRoute = feature.route;
      
      // Fallback routing mappings for dynamically loaded backend routes
      if (targetRoute.endsWith('/resident-passes')) {
        targetRoute = '/(resident)/visitor';
      } else if (targetRoute.endsWith('/notices/active-board')) {
        targetRoute = '/(resident)/notices';
      }
      
      router.push(targetRoute as any);
    }
  };

  const handleBannerPress = (banner: any) => {
    switch (banner.id) {
      case '1':
        router.push('/(resident)/all-features' as any);
        break;
      case '2':
        router.push('/(resident)/visitor' as any);
        break;
      case '3':
        router.push('/(resident)/amenities/dashboard' as any);
        break;
      case '4':
        router.push('/(resident)/billing' as any);
        break;
      default:
        break;
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Navigation Header */}
      <MobileHeader />

      {/* Main Dashboard Scrollable Content */}
      <ScrollView 
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="gap-2 max-w-md mx-auto w-full">
          {/* Sliding Notice Board Banner Carousel */}
          <HeroBanner onBannerPress={handleBannerPress} />

          {/* 4-Column Quick Actions Grid */}
          <QuickActionsGrid
            activeFeatureIds={activeQuickActions}
            equippedFeatures={equippedFeatures}
            onOpenCustomise={() => setCustomiseOpen(true)}
            onOpenViewMore={() => router.push('/(resident)/all-features' as any)}
            onTilePress={handleTilePress}
          />
        </View>
      </ScrollView>

      {/* Customise Dashboard Slide-Up Sheet Modal */}
      <CustomiseSheetModal
        visible={customiseOpen}
        onClose={() => setCustomiseOpen(false)}
        activeFeatureIds={activeQuickActions}
        onSave={handleSaveCustomisation}
      />
    </View>
  );
}
