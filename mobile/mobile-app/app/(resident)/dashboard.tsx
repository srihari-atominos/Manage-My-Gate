import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import MobileHeader from '@/components/navigation/MobileHeader';
import HeroBanner from '@/components/dashboard/HeroBanner';
import QuickActionsGrid from '@/components/dashboard/QuickActionsGrid';
import QuickActionsAllModal from '@/components/dashboard/QuickActionsAllModal';
import CustomiseSheetModal from '@/components/dashboard/CustomiseSheetModal';
import { useQuickActions } from '@/src/features/dashboard/useQuickActions';

export default function DashboardScreen() {
  const router = useRouter();
  const [allQuickActionsOpen, setAllQuickActionsOpen] = React.useState(false);
  const [customiseOpen, setCustomiseOpen] = React.useState(false);

  const {
    activeQuickActions,
    featureCatalog,
    allFeaturesList,
    equippedFeatures,
    saveQuickActions,
  } = useQuickActions();

  const handleSaveCustomisation = async (selectedIds: string[]) => {
    await saveQuickActions(selectedIds);
  };

  const handleTilePress = (tileId: string) => {
    const feature = allFeaturesList.find((item) => item.id === tileId);
    if (feature && feature.route) {
      router.push(feature.route as any);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Navigation Header */}
      <MobileHeader />

      {/* Main Dashboard Scrollable Content */}
      <ScrollView className="flex-1 px-4 pt-2">
        <View className="gap-2 pb-12 max-w-md mx-auto w-full">
          {/* Sliding Notice Board Banner Carousel */}
          <HeroBanner />

          {/* 4-Column Quick Actions Grid (Dynamically Connected to Redux & Backend) */}
          <QuickActionsGrid
            activeFeatureIds={activeQuickActions}
            equippedFeatures={equippedFeatures}
            onOpenCustomise={() => setCustomiseOpen(true)}
            onOpenViewMore={() => setAllQuickActionsOpen(true)}
            onTilePress={handleTilePress}
          />
        </View>
      </ScrollView>

      {/* Full Quick Actions Screen Modal */}
      <QuickActionsAllModal
        visible={allQuickActionsOpen}
        onClose={() => setAllQuickActionsOpen(false)}
        onOpenCustomise={() => setCustomiseOpen(true)}
        featureCatalog={featureCatalog}
        onSelectFeature={(featureId) => {
          handleTilePress(featureId);
        }}
      />

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
