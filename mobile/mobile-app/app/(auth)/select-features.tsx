import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, router, useLocalSearchParams } from 'expo-router';
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
import { KeyboardAvoidingShell } from '@/components/layout/KeyboardAvoidingShell';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { sessionStore } from '@/src/utils/storage';

interface FeatureModule {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
}

const FEATURE_MODULES: FeatureModule[] = [
  {
    id: 'administration_security',
    title: 'Administration & Security',
    description: 'User management, role builder & RBAC, unit management, and integration hub',
    icon: ShieldCheck,
  },
  {
    id: 'visitor',
    title: 'Visitor Management',
    description: 'Digital visitor passes, guard desk, and QR entry',
    icon: Contact,
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
    id: 'billing',
    title: 'Billing & Payments',
    description: 'Maintenance fee collection, invoices, and receipts',
    icon: CreditCard,
  },
];

export default function SelectFeaturesScreen() {
  const { user, createWorkspace, updateOrganizationFeatures, switchWorkspaceContext, loading, error, clearStatus } = useAuth();
  const params = useLocalSearchParams<{
    orgId?: string;
    orgName?: string;
    organizationType?: string;
    timezone?: string;
    intent?: string;
  }>();

  const userAny = user as any;

  const [selectedFeatures, setSelectedFeatures] = React.useState<string[]>(() => {
    if (Array.isArray(userAny?.allowedFeatures) && userAny.allowedFeatures.length > 0) {
      return userAny.allowedFeatures;
    }
    return ['administration_security', 'visitor', 'amenities', 'notices', 'complaints', 'billing'];
  });

  React.useEffect(() => {
    clearStatus();
    if (Array.isArray(userAny?.allowedFeatures) && userAny.allowedFeatures.length > 0) {
      setSelectedFeatures(userAny.allowedFeatures);
    }
    return () => clearStatus();
  }, [userAny?.allowedFeatures]);

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
    const featuresToSave =
      selectedFeatures.length > 0
        ? selectedFeatures
        : ['administration_security', 'visitor', 'amenities', 'notices', 'complaints', 'billing'];

    try {
      if (params?.orgName) {
        // Mode 1: New organization creation - execute atomic DB write with chosen features
        const action: any = await createWorkspace({
          name: params.orgName.trim(),
          organizationType: params.organizationType || 'Residential',
          timezone: params.timezone || 'Asia/Kolkata',
          features: featuresToSave,
        });

        if (
          action &&
          (action.type?.endsWith('/fulfilled') ||
            (action.meta && action.meta.requestStatus === 'fulfilled') ||
            action.payload?.user ||
            action.payload?.organization ||
            action.payload?.data)
        ) {
          sessionStore.removeItem('mobile_auth_intent');
          router.replace('/(resident)/dashboard');
        }
      } else {
        // Mode 2: Existing organization updating features
        const orgId =
          params?.orgId ||
          userAny?.orgId ||
          userAny?.activeOrgId ||
          userAny?.organizationId ||
          (Array.isArray(userAny?.availableWorkspaces) &&
            (userAny?.availableWorkspaces[0]?.orgId ||
              userAny?.availableWorkspaces[0]?._id ||
              userAny?.availableWorkspaces[0]?.id));

        if (orgId) {
          await updateOrganizationFeatures(orgId, featuresToSave);
        }
        sessionStore.removeItem('mobile_auth_intent');
        router.replace('/(resident)/dashboard');
      }
    } catch (e) {
      console.warn('Organization features setup warning:', e);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Configure Features', headerBackVisible: Boolean(params?.orgName) }} />
      <KeyboardAvoidingShell className="bg-background">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24, flexGrow: 1 }} className="bg-background">
          <View className="gap-5 max-w-lg mx-auto w-full py-2 sm:py-4">
            {/* Header */}
            <View className="items-center mb-1">
              <View className="bg-primary/10 p-3.5 rounded-2xl mb-2.5 items-center justify-center">
                <Sparkles className="size-9 text-primary" size={34} color="#03A9F4" />
              </View>
              <Text className="text-2xl font-extrabold text-foreground tracking-tight text-center">
                Select Organization Features
              </Text>
              <Text className="text-muted-foreground text-sm text-center mt-1 px-2">
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
                    className={`p-3.5 sm:p-4 rounded-2xl border flex-row items-center gap-3.5 transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-xs'
                        : 'bg-card border-border hover:bg-muted/50'
                    }`}
                  >
                    <View
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <IconComp size={22} color={isSelected ? '#ffffff' : '#64748b'} />
                    </View>

                    <View className="flex-1 me-1">
                      <Text className="font-bold text-foreground text-sm sm:text-base mb-0.5">{item.title}</Text>
                      <Text className="text-muted-foreground text-xs leading-4">{item.description}</Text>
                    </View>

                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center border shrink-0 ${
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
            <View className="mt-3 mb-2 gap-3">
              <Button
                onPress={onSubmit}
                loading={loading}
                disabled={loading || selectedFeatures.length === 0}
                textClassName="font-bold text-base"
                className="h-12 bg-primary rounded-xl w-full items-center justify-center"
              >
                {loading ? 'Finalizing Setup...' : 'Complete & Launch Workspace'}
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingShell>
    </>
  );
}
