import React from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { KPIDashboardStrip } from '@/components/ui/KPIDashboardStrip';
import { type KPICardProps } from '@/components/ui/KPICard';
import { Button } from '@/components/ui/button';
import { FAB } from '@/components/ui/FAB';
import { CalendarCheck } from 'lucide-react-native';
import { useAmenityDashboard } from '@/src/features/amenities/hooks/useAmenityDashboard';
import { MobileQuickNavHub } from '@/src/features/amenities/components/MobileQuickNavHub';
import { MobileLiveActivityWidget } from '@/src/features/amenities/components/MobileLiveActivityWidget';
import { useTranslation } from '@/src/utils/i18n';

const parseRevenue = (val: any, fallback: number): number => {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? fallback : parsed;
  }
  if (typeof val === 'object') {
    if (typeof val.revenue === 'number') return val.revenue;
    if (typeof val.todayRevenue === 'number') return val.todayRevenue;
    if (typeof val.total === 'number') return val.total;
    if (typeof val.amount === 'number') return val.amount;
  }
  return fallback;
};

export default function AmenityExecutiveDashboardScreen() {
  const router = useRouter();
  const { dashboardStats, loading, error, loadData } = useAmenityDashboard();
  const { t } = useTranslation();

  // Dynamic real-time metrics from backend DTO (/amenity-bookings/stats/dashboard)
  const totalRevenue = parseRevenue(
    dashboardStats?.revenue?.monthlyRevenue ?? dashboardStats?.revenue?.dailyRevenue ?? dashboardStats?.kpis?.revenue ?? dashboardStats?.revenue,
    0
  );

  const todayRevenue = parseRevenue(
    dashboardStats?.revenue?.dailyRevenue ?? dashboardStats?.kpis?.todayRevenue ?? dashboardStats?.todayRevenue,
    0
  );

  const activeMaintenance =
    dashboardStats?.amenityKpis?.underMaintenance ??
    dashboardStats?.kpis?.activeMaintenance ??
    dashboardStats?.underMaintenance ??
    0;

  const totalFacilities =
    dashboardStats?.amenityKpis?.activeAmenities ??
    dashboardStats?.amenityKpis?.totalAmenities ??
    dashboardStats?.kpis?.totalAmenities ??
    dashboardStats?.totalAmenities ??
    0;

  const kpiCards: KPICardProps[] = [
    {
      title: t('total_revenue', 'Total Revenue'),
      value: `₹${totalRevenue.toLocaleString()}`,
      subtitle: t('total_earned', 'Total Earned'),
      iconName: 'IndianRupee',
      variant: 'default',
    },
    {
      title: t('today_revenue', 'Today Rev.'),
      value: `₹${todayRevenue.toLocaleString()}`,
      trend: { direction: 'up', value: `+14% ${t('live', 'Live')}` },
      iconName: 'TrendingUp',
      variant: 'success',
    },
    {
      title: t('under_maintenance', 'Maintenance'),
      value: `${activeMaintenance} ${t('active', 'Active')}`,
      subtitle: t('upkeep_tasks', 'Upkeep & Tasks'),
      iconName: 'Wrench',
      variant: 'warning',
      onPress: () => router.push('/(resident)/amenities/maintenance' as any),
    },
    {
      title: t('amenities_facilities', 'Facilities'),
      value: `${totalFacilities} ${t('active', 'Active')}`,
      subtitle: t('open_for_booking', 'Open for booking'),
      iconName: 'Building2',
      variant: 'info',
      onPress: () => router.push('/(resident)/amenities/admin-master' as any),
    },
  ];

  return (
    <ScreenShell
      title={t('amenities_facilities', 'Amenities Dashboard')}
      subtitle={t('feature_amenities_discover_sub', 'Facility bookings, ledger revenue & maintenance')}
      iconName="BarChart3"
      loading={loading && !dashboardStats}
      error={error}
      onRetry={loadData}
      headerRight={
        <Button
          variant="outline"
          size="sm"
          onPress={() => router.push('/(resident)/amenities/my-bookings' as any)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          accessibilityRole="button"
          accessibilityLabel="View My Bookings"
        >
          <CalendarCheck size={14} className="text-foreground" />
          <Text className="text-xs font-semibold text-foreground">{t('feature_amenities_my_booking_name', 'My Bookings')}</Text>
        </Button>
      }
    >
      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-28 gap-4">
        {/* Universal Top KPI Metrics Strip */}
        <KPIDashboardStrip cards={kpiCards} loading={loading && !dashboardStats} />

        {/* 2. All Features Module Grid */}
        <MobileQuickNavHub />

        {/* 3. Live Gate Access Log Feed */}
        <MobileLiveActivityWidget />
      </ScrollView>

      {/* Primary Action: Book Amenity FAB */}
      <FAB
        iconName="Plus"
        label={t('feature_amenities_discover_name', 'Book Amenity')}
        onPress={() => router.push('/(resident)/amenities/discover' as any)}
      />
    </ScreenShell>
  );
}
