import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Stack, router } from 'expo-router';
import { Building2, CheckCircle2, XCircle } from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { KeyboardAvoidingShell } from '@/components/layout/KeyboardAvoidingShell';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { sessionStore } from '@/src/utils/storage';

const setupOrgSchema = yup.object().shape({
  name: yup
    .string()
    .required('Organization name is required')
    .min(3, 'Organization name must be at least 3 characters'),
});

type SetupOrgFormValues = yup.InferType<typeof setupOrgSchema>;

export default function SetupOrganizationScreen() {
  const { createWorkspace, checkOrganizationName, loading, error, clearStatus, logout, isAuthenticated } = useAuth();

  const [checking, setChecking] = React.useState(false);
  const [isAvailable, setIsAvailable] = React.useState<boolean | null>(null);
  const [checkError, setCheckError] = React.useState('');

  const form = useForm<SetupOrgFormValues>({
    resolver: yupResolver(setupOrgSchema),
    defaultValues: {
      name: '',
    },
    mode: 'onChange',
  });

  const orgName = form.watch('name');

  React.useEffect(() => {
    clearStatus();
    return () => clearStatus();
  }, []);

  // 500ms debounced live availability check
  React.useEffect(() => {
    if (!orgName || orgName.trim().length < 3) {
      setIsAvailable(null);
      setCheckError('');
      setChecking(false);
      return;
    }

    setChecking(true);
    setIsAvailable(null);
    setCheckError('');

    const timer = setTimeout(async () => {
      try {
        const response = await checkOrganizationName(orgName);
        const data = response && (response as any).data !== undefined ? (response as any).data : response;
        const available = data?.available;
        setIsAvailable(!!available);
      } catch (err: any) {
        setCheckError(err.response?.data?.message || err.message || 'Failed to verify name availability');
        setIsAvailable(false);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [orgName]);

  const onSubmit = async (data: SetupOrgFormValues) => {
    const action = await createWorkspace({
      name: data.name.trim(),
      organizationType: 'Residential',
      timezone: 'Asia/Kolkata',
    });

    if (action && (action.type?.endsWith('/fulfilled') || (action.meta && action.meta.requestStatus === 'fulfilled'))) {
      router.replace({ pathname: '/(auth)/select-features', params: { intent: 'create-org' } });
    }
  };

  const isSubmitDisabled =
    loading ||
    checking ||
    isAvailable !== true ||
    !orgName ||
    orgName.trim().length < 3 ||
    Object.keys(form.formState.errors).length > 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Organization Setup', headerBackVisible: false }} />
      <KeyboardAvoidingShell className="bg-background">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24, flexGrow: 1, justifyContent: 'center' }}>
          <View className="gap-5 flex-1 justify-center max-w-sm sm:max-w-md mx-auto w-full py-2 sm:py-4">
            {/* Header */}
            <View className="items-center mb-1">
              <View className="bg-primary/10 p-3.5 rounded-2xl mb-2.5 items-center justify-center">
                <Building2 className="size-9 text-primary" size={34} />
              </View>
              <Text className="text-2xl font-extrabold text-foreground tracking-tight text-center">
                Create Organization
              </Text>
              <Text className="text-muted-foreground text-sm text-center mt-1 px-2">
                Establish your enterprise workspace environment
              </Text>
            </View>

            {/* Form Container */}
            <View className="bg-card border border-border rounded-2xl p-4 sm:p-6 gap-4 shadow-xs">
              <View className="gap-4">
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                      <Input
                        label="Organization Name"
                        placeholder="e.g. Nahom Heights Community"
                        leftIcon={<Building2 size={18} className="text-muted-foreground me-1" />}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCapitalize="words"
                        error={form.formState.errors.name?.message}
                      />

                      {/* Live Validation Feedback */}
                      {Boolean(checking || isAvailable !== null || checkError) ? (
                        <View className="mt-2 ms-0.5 flex-row items-center flex-wrap gap-1.5">
                          {checking ? (
                            <View className="flex-row items-center gap-2">
                              <ActivityIndicator size="small" color="#03A9F4" />
                              <Text className="text-xs text-muted-foreground font-medium">
                                Checking availability...
                              </Text>
                            </View>
                          ) : null}
                          {!checking && isAvailable === true ? (
                            <View className="flex-row items-center gap-1.5">
                              <CheckCircle2 size={15} className="text-emerald-500" color="#10b981" />
                              <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                Name is available
                              </Text>
                            </View>
                          ) : null}
                          {!checking && isAvailable === false && !checkError ? (
                            <View className="flex-row items-center gap-1.5">
                              <XCircle size={15} className="text-destructive" color="#ef4444" />
                              <Text className="text-xs text-destructive font-semibold">
                                Organization name is already taken
                              </Text>
                            </View>
                          ) : null}
                          {Boolean(checkError) ? (
                            <View className="flex-row items-center gap-1.5">
                              <XCircle size={15} className="text-destructive" color="#ef4444" />
                              <Text className="text-xs text-destructive font-semibold flex-1">{checkError}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  )}
                />

                {/* Error Banner */}
                {error ? <ErrorBanner message={error} /> : null}

                <Button
                  onPress={form.handleSubmit(onSubmit)}
                  loading={loading}
                  disabled={isSubmitDisabled}
                  textClassName="font-bold text-base"
                  className="mt-1 h-12 bg-primary rounded-xl w-full items-center justify-center"
                >
                  {loading ? 'Creating Organization...' : 'Create Organization'}
                </Button>

                {/* Already Have Account */}
                <View className="flex-row items-center justify-center pt-2">
                  <Text className="text-xs text-muted-foreground font-medium">
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      if (isAuthenticated) {
                        try {
                          await logout();
                        } catch (e) {}
                      }
                      sessionStore.setItem('mobile_auth_intent', 'create-org');
                      router.push({ pathname: '/(auth)/login', params: { intent: 'create-org' } });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text className="text-xs font-bold text-primary underline">
                      Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingShell>
    </>
  );
}
