import React from 'react';
import { ActionGrid, type ActionGridItem } from '@/components/ui/ActionGrid';

export interface QuickNavItem extends ActionGridItem {}

export const amenityNavItems: ActionGridItem[] = [
  { id: 'master', name: 'Amenities', route: '/(resident)/amenities/admin-master', iconName: 'Building2', colorBg: 'bg-blue-500/10', colorIcon: '#3b82f6', badge: '12', badgeColor: 'bg-blue-600' },
  { id: 'calendar', name: 'Admin Calendar', route: '/(resident)/amenities/admin-calendar', iconName: 'CalendarDays', colorBg: 'bg-sky-500/10', colorIcon: '#0284c7', badge: '18', badgeColor: 'bg-sky-600' },
  { id: 'ledgers', name: 'Ledgers', route: '/(resident)/amenities/ledgers', iconName: 'Receipt', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', badge: '₹42k', badgeColor: 'bg-emerald-600' },
  { id: 'maint', name: 'Maintenance', route: '/(resident)/amenities/maintenance', iconName: 'Wrench', colorBg: 'bg-amber-500/10', colorIcon: '#f59e0b', badge: '2', badgeColor: 'bg-amber-500' },
  { id: 'discover', name: 'Discover', route: '/(resident)/amenities/discover', iconName: 'Search', colorBg: 'bg-blue-500/10', colorIcon: '#3b82f6' },
  { id: 'bookings', name: 'My Bookings', route: '/(resident)/amenities/my-bookings', iconName: 'CalendarCheck', colorBg: 'bg-blue-500/10', colorIcon: '#3b82f6', badge: '24', badgeColor: 'bg-blue-600' },
  { id: 'wallet', name: 'Wallet', route: '/(resident)/amenities/wallet', iconName: 'Wallet', badge: '₹1.2M', badgeColor: 'bg-emerald-600', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981' },
  { id: 'scanner', name: 'Scanner', route: '/(resident)/amenities/scanner', iconName: 'QrCode', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', badge: 'LIVE', badgeColor: 'bg-emerald-600' },
  { id: 'sec-logs', name: 'Security Logs', route: '/(resident)/amenities/security-logs', iconName: 'ClipboardList', colorBg: 'bg-slate-500/10', colorIcon: '#64748b', badge: '142', badgeColor: 'bg-slate-600' },
];

export interface MobileQuickNavHubProps {
  searchQuery?: string;
}

export function MobileQuickNavHub({ searchQuery = '' }: MobileQuickNavHubProps) {
  return (
    <ActionGrid
      title="Quick Actions"
      items={amenityNavItems}
      searchQuery={searchQuery}
    />
  );
}

export default MobileQuickNavHub;
