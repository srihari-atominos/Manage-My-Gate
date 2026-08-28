import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import * as LucideIcons from 'lucide-react-native';

export interface QuickNavItem {
  id: string;
  name: string;
  route: string;
  iconName: string;
  colorBg: string;
  colorIcon: string;
  badge?: string | number;
  badgeColor?: string;
}

const navItems: QuickNavItem[] = [
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
  const router = useRouter();

  const filteredItems = navItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  return (
    <View className="mb-8">
      <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1 mb-4 px-1">
        All Amenities Features
      </Text>

      {filteredItems.length > 0 ? (
        <View className="flex-row flex-wrap justify-start gap-x-[3.5%] gap-y-3">
          {filteredItems.map((item) => {
            const IconComp = (LucideIcons as Record<string, any>)[item.iconName] || LucideIcons.Circle;

            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(item.route as any)}
                className="w-[31%] bg-card p-3 rounded-2xl border border-border items-center justify-center active:opacity-75 shadow-xs relative"
              >
                {item.badge ? (
                  <View className={`absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-primary'} z-10`}>
                    <Text className="text-[9px] font-bold text-white">{item.badge}</Text>
                  </View>
                ) : null}

                <View className={`w-11 h-11 rounded-2xl ${item.colorBg} items-center justify-center mb-2`}>
                  <IconComp size={20} color={item.colorIcon} />
                </View>

                <Text
                  className="text-[11px] font-bold text-foreground text-center"
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="bg-card p-4 rounded-xl border border-border items-center">
          <Text className="text-xs font-semibold text-muted-foreground">
            No matching features found for "{searchQuery}"
          </Text>
        </View>
      )}
    </View>
  );
}
