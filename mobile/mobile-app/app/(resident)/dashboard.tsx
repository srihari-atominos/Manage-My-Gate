import * as React from 'react';
import { View, ScrollView, BackHandler } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MobileHeader from '@/components/navigation/MobileHeader';
import HeroBanner from '@/components/dashboard/HeroBanner';
import QuickActionsGrid from '@/components/dashboard/QuickActionsGrid';
import CustomiseSheetModal from '@/components/dashboard/CustomiseSheetModal';
import { ALL_AVAILABLE_FEATURES } from '@/src/features/dashboard/dashboardCatalog';
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

  // Hardware Back Button Handler for Dashboard
  React.useEffect(() => {
    const onHardwareBack = () => {
      if (customiseOpen) {
        setCustomiseOpen(false);
        return true;
      }
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => subscription.remove();
  }, [customiseOpen, router]);

  const handleSaveCustomisation = async (selectedIds: string[]) => {
    await saveQuickActions(selectedIds);
  };

  const handleTilePress = (tileId: string) => {
    if (tileId === 'visitor_resident_passes') {
      router.navigate('/(resident)/visitor' as any);
      return;
    }
    if (tileId === 'billing_dashboard') {
      router.navigate('/(resident)/billing' as any);
      return;
    }
    if (tileId === 'billing_action_center') {
      router.navigate('/(resident)/admin/billing/ledger' as any);
      return;
    }
    if (tileId === 'billing_assessment_manager') {
      router.navigate('/(resident)/admin/billing/assessments' as any);
      return;
    }
    let feature = allFeaturesList.find((item) => item.id === tileId);
    if (!feature) {
      feature = (ALL_AVAILABLE_FEATURES as any[]).find((item) => item.id === tileId);
    }
    
    if (feature && feature.route) {
      const targetRoute = feature.route.endsWith('/resident-passes') ? '/(resident)/visitor' : feature.route;
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
        availableFeatures={allFeaturesList}
        onSave={handleSaveCustomisation}
      />
    </View>
  );
}
