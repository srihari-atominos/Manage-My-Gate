import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Stack } from 'expo-router';
import {
  LogOutIcon,
  UserCheckIcon,
  ShieldCheckIcon,
  BellIcon,
  QrCodeIcon,
  FileTextIcon,
  WrenchIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';

export default function DashboardScreen() {
  const { user, logout } = useAuth();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gated Villa Dashboard',
          headerRight: () => (
            <Button onPress={logout} size="icon" variant="ghost" className="rounded-full">
              <Icon as={LogOutIcon} className="size-5 text-rose-500" />
            </Button>
          ),
        }}
      />
      <ScrollView className="bg-background flex-1 p-6">
        <View className="gap-6 max-w-md mx-auto w-full pb-8">
          {/* Welcome User Card */}
          <View className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex-row items-center gap-4">
            <View className="bg-primary/10 p-3 rounded-full">
              <Icon as={UserCheckIcon} className="size-8 text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">Welcome Back!</Text>
              <Text className="text-muted-foreground text-sm mt-0.5">{user?.email || 'Resident'}</Text>
              <View className="flex-row gap-2 mt-2">
                <Text className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Unit: Villa 12
                </Text>
                {user?.role && (
                  <Text className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Role: {user.role}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View className="gap-3">
            <Text className="font-bold text-foreground text-base px-1">Community Services</Text>

            <View className="flex-row gap-3">
              {/* Visitor Pass */}
              <View className="flex-1 bg-card border border-border rounded-xl p-4 gap-3 items-center">
                <View className="bg-indigo-500/10 p-2.5 rounded-full">
                  <Icon as={QrCodeIcon} className="size-5 text-indigo-500" />
                </View>
                <Text className="font-semibold text-foreground text-sm text-center">Visitor Pass</Text>
                <Text className="text-muted-foreground text-[10px] text-center">Create entry invite QR codes</Text>
              </View>

              {/* Maintenance */}
              <View className="flex-1 bg-card border border-border rounded-xl p-4 gap-3 items-center">
                <View className="bg-amber-500/10 p-2.5 rounded-full">
                  <Icon as={FileTextIcon} className="size-5 text-amber-500" />
                </View>
                <Text className="font-semibold text-foreground text-sm text-center">Billing & Dues</Text>
                <Text className="text-muted-foreground text-[10px] text-center">Pay maintenance charges</Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              {/* Notice Board */}
              <View className="flex-1 bg-card border border-border rounded-xl p-4 gap-3 items-center">
                <View className="bg-teal-500/10 p-2.5 rounded-full">
                  <Icon as={BellIcon} className="size-5 text-teal-500" />
                </View>
                <Text className="font-semibold text-foreground text-sm text-center">Notice Board</Text>
                <Text className="text-muted-foreground text-[10px] text-center">View society announcements</Text>
              </View>

              {/* Complaints */}
              <View className="flex-1 bg-card border border-border rounded-xl p-4 gap-3 items-center">
                <View className="bg-rose-500/10 p-2.5 rounded-full">
                  <Icon as={WrenchIcon} className="size-5 text-rose-500" />
                </View>
                <Text className="font-semibold text-foreground text-sm text-center">Help Desk</Text>
                <Text className="text-muted-foreground text-[10px] text-center">Log and track complaints</Text>
              </View>
            </View>
          </View>

          {/* Security Banner */}
          <View className="bg-muted border border-border rounded-xl p-4 flex-row items-center gap-3">
            <Icon as={ShieldCheckIcon} className="size-5 text-emerald-500" />
            <Text className="text-xs text-muted-foreground flex-1">
              Gated security is active. Direct real-time gate rings will show up on this app when visitors arrive.
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
