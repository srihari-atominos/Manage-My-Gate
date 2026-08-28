import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { ActionGrid, type ActionGridItem } from '@/components/ui/ActionGrid';
import { useAmenityDashboard } from '../hooks/useAmenityDashboard';

export interface MobileQuickNavHubProps {
  searchQuery?: string;
}

export function MobileQuickNavHub({ searchQuery = '' }: MobileQuickNavHubProps) {
  const { dashboardStats } = useAmenityDashboard();

  const walletState = useSelector((state: RootState) => (state as any).wallet);
  const myBookingsState = useSelector((state: RootState) => (state as any).amenityBookings);
  const securityLogsState = useSelector((state: RootState) => (state as any).securityLogs);

  // Dynamic real-time metrics extraction from backend store & Socket listeners
  const totalAmenities =
    dashboardStats?.amenityKpis?.activeAmenities ??
    dashboardStats?.amenityKpis?.totalAmenities ??
    dashboardStats?.kpis?.totalAmenities ??
    0;

  const upcomingBookings =
    dashboardStats?.bookingKpis?.upcomingBookings ??
    dashboardStats?.bookingKpis?.todayBookings ??
    0;

  const monthlyRevenue =
    dashboardStats?.revenue?.monthlyRevenue ??
    dashboardStats?.revenue?.dailyRevenue ??
    0;

  const activeMaintenance =
    dashboardStats?.amenityKpis?.underMaintenance ??
    dashboardStats?.kpis?.activeMaintenance ??
    0;

  const myBookingsCount =
    myBookingsState?.myBookings?.length ??
    dashboardStats?.bookingKpis?.totalBookings ??
    0;

  const walletBalance = walletState?.balance ?? 0;

  const securityLogsCount =
    securityLogsState?.totalCount ??
    securityLogsState?.securityLogs?.length ??
    0;

  const formatRevenueBadge = (amount: number): string => {
    if (!amount) return '₹0';
    if (amount >= 1000000) return `₹${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `₹${Math.round(amount / 1000)}k`;
    return `₹${amount}`;
  };

  const dynamicNavItems: ActionGridItem[] = [
    {
      id: 'master',
      name: 'Amenities',
      route: '/(resident)/amenities/admin-master',
      iconName: 'Building2',
      colorBg: 'bg-teal-500/10',
      colorIcon: '#14b8a6',
      badge: totalAmenities > 0 ? String(totalAmenities) : undefined,
      badgeColor: 'bg-teal-500',
    },
    {
      id: 'calendar',
      name: 'Admin Calendar',
      route: '/(resident)/amenities/admin-calendar',
      iconName: 'CalendarDays',
      colorBg: 'bg-sky-500/10',
      colorIcon: '#03A9F4',
      badge: upcomingBookings > 0 ? String(upcomingBookings) : undefined,
      badgeColor: 'bg-sky-500',
    },
    {
      id: 'ledgers',
      name: 'Ledgers',
      route: '/(resident)/amenities/ledgers',
      iconName: 'Receipt',
      colorBg: 'bg-emerald-500/10',
      colorIcon: '#10b981',
      badge: monthlyRevenue > 0 ? formatRevenueBadge(monthlyRevenue) : undefined,
      badgeColor: 'bg-emerald-500',
    },
    {
      id: 'maint',
      name: 'Maintenance',
      route: '/(resident)/amenities/maintenance',
      iconName: 'Wrench',
      colorBg: 'bg-amber-500/10',
      colorIcon: '#f59e0b',
      badge: activeMaintenance > 0 ? String(activeMaintenance) : undefined,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'discover',
      name: 'Discover',
      route: '/(resident)/amenities/discover',
      iconName: 'Search',
      colorBg: 'bg-blue-500/10',
      colorIcon: '#3b82f6',
    },
    {
      id: 'bookings',
      name: 'My Bookings',
      route: '/(resident)/amenities/my-bookings',
      iconName: 'CalendarCheck',
      colorBg: 'bg-indigo-500/10',
      colorIcon: '#6366f1',
      badge: myBookingsCount > 0 ? String(myBookingsCount) : undefined,
      badgeColor: 'bg-indigo-500',
    },
    {
      id: 'wallet',
      name: 'Wallet',
      route: '/(resident)/amenities/wallet',
      iconName: 'Wallet',
      badge: formatRevenueBadge(walletBalance),
      badgeColor: 'bg-cyan-500',
      colorBg: 'bg-cyan-500/10',
      colorIcon: '#06b6d4',
    },
    {
      id: 'scanner',
      name: 'Scanner',
      route: '/(resident)/amenities/scanner',
      iconName: 'QrCode',
      colorBg: 'bg-purple-500/10',
      colorIcon: '#a855f7',
      badge: 'LIVE',
      badgeColor: 'bg-purple-600',
    },
    {
      id: 'sec-logs',
      name: 'Security Logs',
      route: '/(resident)/amenities/security-logs',
      iconName: 'ClipboardList',
      colorBg: 'bg-slate-500/10',
      colorIcon: '#64748b',
      badge: securityLogsCount > 0 ? String(securityLogsCount) : undefined,
      badgeColor: 'bg-slate-600',
    },
  ];

  return (
    <ActionGrid
      title="Quick Actions"
      items={dynamicNavItems}
      searchQuery={searchQuery}
    />
  );
}

export default MobileQuickNavHub;
