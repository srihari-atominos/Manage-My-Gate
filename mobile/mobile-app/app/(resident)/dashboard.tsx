import * as React from 'react';
import { View, ScrollView, BackHandler, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import MobileHeader from '@/components/navigation/MobileHeader';
import RoleBasedGreeting from '@/components/dashboard/RoleBasedGreeting';
import HeroBanner from '@/components/dashboard/HeroBanner';
import QuickActionsGrid from '@/components/dashboard/QuickActionsGrid';
import CustomiseSheetModal from '@/components/dashboard/CustomiseSheetModal';
import BottomNavigationBar from '@/components/navigation/BottomNavigationBar';
import { ALL_AVAILABLE_FEATURES } from '@/src/features/dashboard/dashboardCatalog';
import { useQuickActions } from '@/src/features/dashboard/useQuickActions';
import { useTranslation } from '@/src/utils/i18n';

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
    if (tileId === 'visitor_gate_pass') {
      router.navigate('/(resident)/visitor/invite' as any);
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
        className="flex-1 px-4 pt-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 110 }}
      >
        <View className="gap-2.5 max-w-md mx-auto w-full">
          {/* Dynamic Role-Based Greeting */}
          <RoleBasedGreeting />

          {/* Sliding Notice Board Banner Carousel */}
          <HeroBanner onBannerPress={handleBannerPress} />

          {/* 2-Column Quick Actions Grid (Exactly 6 Cards) */}
          <QuickActionsGrid
            activeFeatureIds={activeQuickActions}
            equippedFeatures={equippedFeatures}
            onOpenCustomise={() => setCustomiseOpen(true)}
            onOpenViewMore={() => router.push('/(resident)/all-features' as any)}
            onTilePress={handleTilePress}
          />


          {/* Security & Gate Control Live Monitoring Section */}
          <View className="gap-2 my-1">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-[17px] font-bold font-sans text-foreground tracking-tight">
                {t('security_gate_control', 'Security & Gate Control')}
              </Text>
              <Text className="text-[11.5px] font-bold font-sans text-[#FF6A00]">
                {t('active_monitoring', 'Active Monitoring')}
              </Text>
            </View>

            <View className="bg-card border border-border/80 dark:border-border/60 rounded-2xl p-3.5 flex-row items-center justify-between shadow-2xs">
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View className="w-11 h-11 rounded-[15px] bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center border border-emerald-300/40 dark:border-emerald-700/40">
                  <ShieldCheck size={22} color="#10B981" />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[13px] font-bold font-sans text-foreground">
                      Main Entrance Gate 01
                    </Text>
                    <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  </View>
                  <Text className="text-[11px] font-medium font-sans text-muted-foreground mt-0.5" numberOfLines={1}>
                    No pending visitor verifications
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(resident)/visitor' as any)}
                activeOpacity={0.8}
                className="bg-slate-900 dark:bg-slate-100 px-3 py-1.5 rounded-full flex-row items-center gap-1 shadow-2xs"
              >
                <Text className="text-[11px] font-bold font-sans text-white dark:text-slate-900">
                  Passes
                </Text>
                <ChevronRight size={12} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Down Bar Navigation */}
      <BottomNavigationBar />

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

