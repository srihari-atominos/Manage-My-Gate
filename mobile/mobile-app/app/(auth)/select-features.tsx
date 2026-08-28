import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, router } from 'expo-router';
import {
  Users,
  ShieldCheck,
  Layers,
  Home,
  Building,
  Megaphone,
  Wrench,
  Contact,
  CreditCard,
  Check,
  Sparkles,
} from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { useAuth } from '../../src/features/auth/hooks/useAuth';

interface FeatureModule {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
}

const FEATURE_MODULES: FeatureModule[] = [
  {
    id: 'users',
    title: 'User Management',
    description: 'Member directory, resident profiles, and staff accounts',
    icon: Users,
  },
  {
    id: 'roles',
    title: 'Role Builder & RBAC',
    description: 'Custom security roles, permissions, and access levels',
    icon: ShieldCheck,
  },
  {
    id: 'integrations',
    title: 'Integration Hub',
    description: 'API integrations, hardware webhooks, and device setup',
    icon: Layers,
  },
  {
    id: 'villas',
    title: 'Villa & Units',
    description: 'Unit numbers, occupancy tracking, and owner mappings',
    icon: Home,
  },
  {
    id: 'amenities',
    title: 'Amenities & Facilities',
    description: 'Clubhouse, pool, tennis courts, and slot bookings',
    icon: Building,
  },
  {
    id: 'notices',
    title: 'Notice Board',
    description: 'Community announcements, alerts, and notifications',
    icon: Megaphone,
  },
  {
    id: 'complaints',
    title: 'Maintenance & Tickets',
    description: 'Issue tracking, plumber/electrician requests, and status',
    icon: Wrench,
  },
  {
    id: 'visitor',
    title: 'Visitor Management',
    description: 'Digital visitor passes, guard desk, and QR entry',
    icon: Contact,
  },
  {
    id: 'billing',
    title: 'Billing & Payments',
    description: 'Maintenance fee collection, invoices, and receipts',
    icon: CreditCard,
  },
];

export default function SelectFeaturesScreen() {
  const { user, updateOrganizationFeatures, loading, error, clearStatus } = useAuth();

  const [selectedFeatures, setSelectedFeatures] = React.useState<string[]>(() => {
    if (Array.isArray(user?.allowedFeatures) && user.allowedFeatures.length > 0) {
      return user.allowedFeatures;
    }
    return ['users', 'roles', 'integrations', 'villas', 'amenities'];
  });

  React.useEffect(() => {
    clearStatus();
    if (Array.isArray(user?.allowedFeatures) && user.allowedFeatures.length > 0) {
      setSelectedFeatures(user.allowedFeatures);
    }
    return () => clearStatus();
  }, [user?.allowedFeatures]);

  const toggleFeature = (id: string) => {
    setSelectedFeatures((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const onSubmit = async () => {
    const orgId =
      user?.orgId ||
      user?.activeOrgId ||
      user?.organizationId ||
      (Array.isArray(user?.availableWorkspaces) && user?.availableWorkspaces[0]?.orgId);

    if (!orgId) {
      router.replace('/(auth)/setup-organization');
      return;
    }

    const action = await updateOrganizationFeatures(orgId, selectedFeatures);
    if (
      action &&
      (action.type?.endsWith('/fulfilled') ||
        (action.meta && action.meta.requestStatus === 'fulfilled') ||
        action.payload?.organization)
    ) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('mobile_auth_intent');
      }
      router.replace('/(resident)/dashboard');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Configure Features', headerBackVisible: false }} />
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }} className="bg-background">
        <View className="gap-6 max-w-lg mx-auto w-full py-4">
          {/* Header */}
          <View className="items-center mb-2">
            <View className="bg-primary/10 p-4 rounded-3xl mb-3">
              <Sparkles className="size-10 text-primary" size={36} color="#03A9F4" />
            </View>
            <Text className="text-2xl font-extrabold text-foreground tracking-tight text-center">
              Select Organization Features
            </Text>
            <Text className="text-muted-foreground text-sm text-center mt-1.5 px-4">
              Choose the modules you want active for your enterprise workspace
            </Text>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          {/* Module Cards Grid */}
          <View className="gap-3">
            {FEATURE_MODULES.map((item) => {
              const isSelected = selectedFeatures.includes(item.id);
              const IconComp = item.icon;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleFeature(item.id)}
                  className={`p-4 rounded-2xl border flex-row items-center gap-4 transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs'
                      : 'bg-card border-border hover:bg-muted/50'
                  }`}
                >
                  <View
                    className={`size-12 rounded-xl items-center justify-center ${
                      isSelected ? 'bg-primary text-white' : 'bg-muted'
                    }`}
                  >
                    <IconComp size={22} color={isSelected ? '#ffffff' : '#64748b'} />
                  </View>

                  <View className="flex-1 me-2">
                    <Text className="font-bold text-foreground text-base mb-0.5">{item.title}</Text>
                    <Text className="text-muted-foreground text-xs leading-4">{item.description}</Text>
                  </View>

                  <View
                    className={`size-6 rounded-full items-center justify-center border ${
                      isSelected ? 'bg-primary border-primary' : 'border-border bg-background'
                    }`}
                  >
                    {isSelected ? <Check size={14} color="#ffffff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Action Footer */}
          <View className="mt-4 gap-3">
            <Button
              onPress={onSubmit}
              loading={loading}
              disabled={loading || selectedFeatures.length === 0}
              textClassName="font-bold text-base"
              className="h-13 bg-primary rounded-xl"
            >
              {loading ? 'Finalizing Setup...' : 'Complete & Launch Workspace'}
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
