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
}

export interface ComplaintQuickNavHubProps {
  searchQuery?: string;
  badgeCounts?: any;
  onFeedbackPress?: () => void;
}

export function ComplaintQuickNavHub({ searchQuery = '', onFeedbackPress }: ComplaintQuickNavHubProps) {
  const router = useRouter();

  const navItems: QuickNavItem[] = [
    {
      id: 'raise-ticket',
      name: 'Raise Ticket',
      route: '/(resident)/complaints/raise-ticket',
      iconName: 'PlusCircle',
      colorBg: 'bg-blue-500/10',
      colorIcon: '#3b82f6',
    },
    {
      id: 'my-tickets',
      name: 'My Tickets',
      route: '/(resident)/complaints/my-tickets',
      iconName: 'Search',
      colorBg: 'bg-amber-500/10',
      colorIcon: '#f59e0b',
    },
    {
      id: 'management',
      name: 'Management',
      route: '/(resident)/complaints/manage',
      iconName: 'Kanban',
      colorBg: 'bg-indigo-500/10',
      colorIcon: '#6366f1',
    },
    {
      id: 'staff-directory',
      name: 'Staff & Vendors',
      route: '/(resident)/complaints/staff',
      iconName: 'Users',
      colorBg: 'bg-emerald-500/10',
      colorIcon: '#10b981',
    },
    {
      id: 'assignee-console',
      name: 'Assignee Queue',
      route: '/(resident)/complaints/assignee',
      iconName: 'ClipboardList',
      colorBg: 'bg-purple-500/10',
      colorIcon: '#a855f7',
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  return (
    <View className="mb-8">
      <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1 mb-4 px-1">
        Complaints & Maintenance Features
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

          {onFeedbackPress && (!searchQuery.trim() || 'feedback'.includes(searchQuery.toLowerCase())) ? (
            <Pressable
              onPress={onFeedbackPress}
              className="w-[31%] bg-card p-3 rounded-2xl border border-border items-center justify-center active:opacity-75 shadow-xs relative"
            >
              <View className="w-11 h-11 rounded-2xl bg-rose-500/10 items-center justify-center mb-2">
                <LucideIcons.MessageSquare size={20} color="#f43f5e" />
              </View>

              <Text
                className="text-[11px] font-bold text-foreground text-center"
                numberOfLines={2}
              >
                Feedback
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View className="p-6 bg-card rounded-2xl border border-border items-center justify-center">
          <Text className="text-xs text-muted-foreground">No feature found for "{searchQuery}"</Text>
        </View>
      )}
    </View>
  );
}

export default ComplaintQuickNavHub;
