import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from '@/src/utils/i18n';

const NAV_ITEMS = [
  { id: 'dashboard', name: 'Dashboard', route: '/(resident)/notices/dashboard' },
  { id: 'active_notice', name: 'Active Notice', route: '/(resident)/notices' },
  { id: 'manage_notices', name: 'Manage Notices', route: '/(resident)/notices/manage' },
  { id: 'polls', name: 'Polls', route: '/(resident)/polls' },
];

export function NoticeBoardTopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <View className="border-b border-border/40 px-2 pb-0">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-2">
        {NAV_ITEMS.map((item) => {
          const routeEnd = item.route.split('/').pop();
          const isIndex = routeEnd === 'notices';
          let isActive = false;
          if (isIndex) {
            isActive = pathname.endsWith('/notices') || pathname.endsWith('/notices/');
          } else {
            isActive = pathname.endsWith(`/${routeEnd}`);
          }

          const displayName = t(item.id, item.name);

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(item.route)}
              className={`px-4 py-3 mr-2 border-b-2 ${isActive ? 'border-primary' : 'border-transparent'}`}
            >
              <Text className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {displayName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default NoticeBoardTopNav;
