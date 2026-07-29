import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import MobileHeader from '@/components/navigation/MobileHeader';
import HeroBanner from '@/components/dashboard/HeroBanner';
import QuickActionsGrid from '@/components/dashboard/QuickActionsGrid';
import QuickActionsAllModal from '@/components/dashboard/QuickActionsAllModal';
import CustomiseSheetModal from '@/components/dashboard/CustomiseSheetModal';

export default function DashboardScreen() {
  const [allQuickActionsOpen, setAllQuickActionsOpen] = React.useState(false);
  const [customiseOpen, setCustomiseOpen] = React.useState(false);
  const [activeFeatureIds, setActiveFeatureIds] = React.useState<string[]>([
    'billing_dues',
    'digital_wallet',
    'visitor_pass',
    'gate_logs',
    'helpdesk',
    'notice_board',
    'book_amenity',
  ]);

  const handleToggleFeature = (featureId: string) => {
    setActiveFeatureIds((prev) => {
      if (prev.includes(featureId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== featureId);
      } else {
        if (prev.length >= 7) {
          return [...prev.slice(0, 6), featureId];
        }
        return [...prev, featureId];
      }
    });
  };

  const handleTilePress = (tileId: string) => {
    switch (tileId) {
      case 'billing_dues':
      case 'digital_wallet':
      case 'visitor_pass':
      case 'gate_logs':
      case 'helpdesk':
      case 'notice_board':
      case 'book_amenity':
        break;
      default:
        break;
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Navigation Header */}
      <MobileHeader
        unitName="Villa 12"
        communityName="Green Meadows"
      />

      {/* Main Dashboard Scrollable Content */}
      <ScrollView className="flex-1 px-4 pt-2">
        <View className="gap-2 pb-12 max-w-md mx-auto w-full">
          {/* Sliding Notice Board Banner Carousel */}
          <HeroBanner />

          {/* 4-Column Quick Actions Grid (7 User Tiles + 8th Yellow "+ View More" Tile) */}
          <QuickActionsGrid
            activeFeatureIds={activeFeatureIds}
            onOpenCustomise={() => setAllQuickActionsOpen(true)}
            onTilePress={handleTilePress}
          />
        </View>
      </ScrollView>

      {/* Full Quick Actions Screen Modal (Matching quick action-1.jpeg) */}
      <QuickActionsAllModal
        visible={allQuickActionsOpen}
        onClose={() => setAllQuickActionsOpen(false)}
        onSelectFeature={(featureId) => {
          handleTilePress(featureId);
        }}
      />

      {/* Grouped Feature Customisation Sheet Modal */}
      <CustomiseSheetModal
        visible={customiseOpen}
        onClose={() => setCustomiseOpen(false)}
        activeFeatureIds={activeFeatureIds}
        onToggleFeature={handleToggleFeature}
      />
    </View>
  );
}
