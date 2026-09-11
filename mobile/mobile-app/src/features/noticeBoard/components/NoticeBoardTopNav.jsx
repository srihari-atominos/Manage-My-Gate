import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter, usePathname } from 'expo-router';

import { useNoticeBoard } from '../hooks/useNoticeBoard';

const ALL_NAV_ITEMS = [
  { name: 'Dashboard', route: '/(resident)/notices/dashboard' },
  { name: 'Active Notice', route: '/(resident)/notices' },
  { name: 'Manage Notices', route: '/(resident)/notices/manage', requiresManage: true },
  { name: 'Polls', route: '/(resident)/polls' },
];

export function NoticeBoardTopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { canManage, isAdmin } = useNoticeBoard();

  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.requiresManage) {
      return canManage || isAdmin;
    }
    return true;
  });

  return (
    <View className="border-b border-border/40 px-2 pb-0 bg-card">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-2">
        {navItems.map((item) => {
          const routeEnd = item.route.split('/').pop();
          const isIndex = routeEnd === 'notices';
          let isActive = false;
          if (isIndex) {
            isActive = pathname.endsWith('/notices') || pathname.endsWith('/notices/');
          } else {
            isActive = pathname.endsWith(`/${routeEnd}`);
          }

          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => router.push(item.route)}
              className={`px-4 py-3 me-2 border-b-2 ${isActive ? 'border-primary' : 'border-transparent'}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.name}
            >
              <Text className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default NoticeBoardTopNav;
