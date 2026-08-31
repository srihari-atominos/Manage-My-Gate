import React from 'react';
import { ActionGrid, type ActionGridItem } from '@/components/ui/ActionGrid';

export interface QuickNavItem extends ActionGridItem {}

export const amenityNavItems: ActionGridItem[] = [
  { id: 'master', name: 'Amenities', route: '/(resident)/amenities/admin-master', iconName: 'Building2', colorBg: 'bg-teal-500/10', colorIcon: '#14b8a6', badge: '12', badgeColor: 'bg-teal-500' },
  { id: 'calendar', name: 'Admin Calendar', route: '/(resident)/amenities/admin-calendar', iconName: 'CalendarDays', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', badge: '18', badgeColor: 'bg-sky-500' },
  { id: 'ledgers', name: 'Ledgers', route: '/(resident)/amenities/ledgers', iconName: 'Receipt', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', badge: '₹42k', badgeColor: 'bg-emerald-500' },
  { id: 'maint', name: 'Maintenance', route: '/(resident)/amenities/maintenance', iconName: 'Wrench', colorBg: 'bg-amber-500/10', colorIcon: '#f59e0b', badge: '2', badgeColor: 'bg-amber-500' },
  { id: 'discover', name: 'Discover', route: '/(resident)/amenities/discover', iconName: 'Search', colorBg: 'bg-blue-500/10', colorIcon: '#3b82f6' },
  { id: 'bookings', name: 'My Bookings', route: '/(resident)/amenities/my-bookings', iconName: 'CalendarCheck', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', badge: '24', badgeColor: 'bg-indigo-500' },
  { id: 'wallet', name: 'Wallet', route: '/(resident)/amenities/wallet', iconName: 'Wallet', badge: '₹1.2M', badgeColor: 'bg-cyan-500', colorBg: 'bg-cyan-500/10', colorIcon: '#06b6d4' },
  { id: 'scanner', name: 'Scanner', route: '/(resident)/amenities/scanner', iconName: 'QrCode', colorBg: 'bg-purple-500/10', colorIcon: '#a855f7', badge: 'LIVE', badgeColor: 'bg-purple-600' },
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
