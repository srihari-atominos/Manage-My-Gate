import { Text } from '@/components/ui/text';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  Mail,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  Check,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import * as React from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform,
  Animated,
  Easing,
  KeyboardAvoidingView,
  ImageBackground,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import {
  NahomEmblem,
  NahomWordmark,
} from '@/components/auth/NahomBrandLogo';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { sessionStore } from '@/src/utils/storage';

// 1. Basic Auth Validation Schema
const basicAuthSchema = yup.object().shape({
  login: yup
    .string()
    .required('Email or Username is required')
    .min(3, 'Must be at least 3 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(4, 'Password must be at least 4 characters'),
});

// 2. Phone OTP Validation Schema
const phoneSchema = yup.object().shape({
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/, 'Enter a valid phone number (e.g. +919988776655)'),
});

interface BasicAuthFormValues {
  login: string;
  password: string;
}

interface PhoneFormValues {
  phone: string;
}

export default function LoginScreen() {
  const { user, login: performLogin, requestOtp, loading, error, isAuthenticated, otpSent, clearStatus } = useAuth();
  const params = useLocalSearchParams<{ intent?: string; email?: string }>();
  const isCreateOrgIntent =
    params.intent === 'create-org' ||
    params.intent === 'create' ||
    (typeof window !== 'undefined' && typeof window.location !== 'undefined' && window.location?.href && (
      window.location.href.includes('intent=create-org') ||
      window.location.href.includes('intent=create')
    )) ||
    sessionStore.getItem('mobile_auth_intent') === 'create-org';

  React.useEffect(() => {
    if (params.intent === 'create-org' || params.intent === 'create') {
      sessionStore.setItem('mobile_auth_intent', params.intent);
    }
  }, [params.intent]);

  const [authMode, setAuthMode] = React.useState<'basic' | 'phone'>('basic');
  const [submittedPhone, setSubmittedPhone] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [keepSignedIn, setKeepSignedIn] = React.useState(true);
  const [connectingHarmony, setConnectingHarmony] = React.useState(false);
  const passwordInputRef = React.useRef<TextInput>(null);

  // Staged Entrance Animation Drivers
  const emblemScale = React.useRef(new Animated.Value(0)).current;
  const emblemOpacity = React.useRef(new Animated.Value(0)).current;
  const emblemRotate = React.useRef(new Animated.Value(-1)).current;
  const emblemFloat = React.useRef(new Animated.Value(0)).current;
  const wordmarkScale = React.useRef(new Animated.Value(0.5)).current;
  const wordmarkOpacity = React.useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = React.useRef(new Animated.Value(20)).current;
  const contentOpacity = React.useRef(new Animated.Value(0)).current;
  const contentTranslateY = React.useRef(new Animated.Value(24)).current;

  // Run smooth, relaxed cinematic opening sequence on mount
  React.useEffect(() => {
    Animated.parallel([
      // Stage 1: Logo Emblem Dramatic Elastic Blast, Rotation & Bounce
      Animated.spring(emblemScale, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(emblemOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(emblemRotate, {
        toValue: 0,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),

      // Stage 2: App Name & Taglines Unfurl gracefully after logo (200ms - 650ms)
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.spring(wordmarkScale, {
            toValue: 1,
            friction: 6.5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(wordmarkOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wordmarkTranslateY, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),

      // Stage 3: Form Cards, Tabs, Badges glide up smoothly (450ms - 900ms)
      Animated.sequence([
        Animated.delay(450),
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(contentTranslateY, {
            toValue: 0,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => {
      // Gentle continuous floating breath loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(emblemFloat, {
            toValue: -5,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(emblemFloat, {
            toValue: 5,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  // Basic Auth Form Hook
  const basicForm = useForm<BasicAuthFormValues>({
    resolver: yupResolver(basicAuthSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  });

  // Phone Form Hook
  const phoneForm = useForm<PhoneFormValues>({
    resolver: yupResolver(phoneSchema),
    defaultValues: {
      phone: '',
    },
  });

  React.useEffect(() => {
    if (params.email) {
      basicForm.setValue('login', params.email);
    }
  }, [params.email]);

  React.useEffect(() => {
    clearStatus();
    return () => {
      clearStatus();
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      Keyboard.dismiss();
    };
  }, [authMode]);

  React.useEffect(() => {
    if (isAuthenticated) {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      Keyboard.dismiss();
      setConnectingHarmony(true);
      const timer = setTimeout(() => {
        const uAny = user as any;
        const hasOrg = !!(
          user && (
            uAny.orgId ||
            uAny.activeOrgId ||
            uAny.organizationId ||
            (Array.isArray(uAny.availableWorkspaces) && uAny.availableWorkspaces.length > 0)
          )
        );
        if (isCreateOrgIntent || !hasOrg) {
          sessionStore.removeItem('mobile_auth_intent');
          router.replace({ pathname: '/(auth)/setup-organization', params: { intent: 'create-org' } });
        } else {
          router.replace('/(resident)/dashboard');
        }
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isCreateOrgIntent]);

  // Reactively route to OTP screen if Phone OTP sent
  React.useEffect(() => {
    if (otpSent && submittedPhone) {
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: submittedPhone },
      });
    }
  }, [otpSent, submittedPhone]);

  // Handle Basic Auth Submit
  const onBasicSubmit = async (data: BasicAuthFormValues) => {
    await performLogin({
      login: data.login.trim(),
      password: data.password,
    });
  };

  // Handle Phone OTP Submit
  const onPhoneSubmit = async (data: PhoneFormValues) => {
    setSubmittedPhone(data.phone);
    await requestOtp(data.phone, false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ImageBackground
        source={require('../../assets/images/auth-bg.jpg')}
        style={{ flex: 1 }}
        blurRadius={Platform.OS === 'ios' ? 3 : 2}
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-white/40 dark:bg-[#0B0E14]/55" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            className="px-5 py-6"
          >
            <View className="max-w-sm mx-auto w-full gap-3.5">
            {/* Step 1, 2, 3: Top Brand Identity Section (Logo → App Name → Nexus Around Home → Slogan) */}
            <View className="items-center justify-center">
              {/* Step 1: Logo Emblem */}
              <Animated.View
                style={{
                  opacity: emblemOpacity,
                  transform: [
                    { scale: emblemScale },
                    { translateY: emblemFloat },
                    {
                      rotate: emblemRotate.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: ['-12deg', '0deg', '12deg'],
                      }),
                    },
                  ],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NahomEmblem size={118} />
              </Animated.View>

              {/* Step 2 & 3: NoHome App Name + "Nexus Around Home" + Slogan with proper spacing */}
              <Animated.View
                style={{
                  opacity: wordmarkOpacity,
                  transform: [
                    { translateY: wordmarkTranslateY },
                    { scale: wordmarkScale },
                  ],
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NahomWordmark />
              </Animated.View>
            </View>

            {/* Staged Animated Content Section */}
            <Animated.View
              style={{
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              }}
              className="gap-3.5 w-full"
            >
              {/* Step 4: Login Method Selection (Email/Password vs Phone OTP) */}
              <View className="bg-muted/40 p-1.5 rounded-2xl flex-row border border-border/80">
                <TouchableOpacity
                  onPress={() => setAuthMode('basic')}
                  activeOpacity={0.85}
                  className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${
                    authMode === 'basic'
                      ? 'bg-card border border-border/60 shadow-xs'
                      : ''
                  }`}
                >
                  <Lock
                    size={15}
                    color={authMode === 'basic' ? '#FF5E00' : '#64748B'}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      authMode === 'basic' ? 'text-[#1E232E] dark:text-[#FF7A00]' : 'text-muted-foreground'
                    }`}
                  >
                    Email / Password
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAuthMode('phone')}
                  activeOpacity={0.85}
                  className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${
                    authMode === 'phone'
                      ? 'bg-card border border-border/60 shadow-xs'
                      : ''
                  }`}
                >
                  <Smartphone
                    size={15}
                    color={authMode === 'phone' ? '#FF5E00' : '#64748B'}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      authMode === 'phone' ? 'text-[#1E232E] dark:text-[#FF7A00]' : 'text-muted-foreground'
                    }`}
                  >
                    Phone OTP
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Card Container */}
              <View className="bg-card border border-border/80 rounded-3xl p-5 gap-3.5 shadow-xs">
                {authMode === 'basic' ? (
                  /* Email / Password Form */
                  <View className="gap-3.5">
                    {/* Step 5: Email or Username Input */}
                    <View>
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-xs font-bold text-foreground">
                          Email or Username
                        </Text>
                      </View>
                      <Controller
                        control={basicForm.control}
                        name="login"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <View className="flex-row items-center bg-background border border-border/90 rounded-2xl px-3.5 py-3">
                            <Mail size={18} color="#94A3B8" className="me-2.5 shrink-0" />
                            <TextInput
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              placeholder="Enter your email or username"
                              placeholderTextColor="#94A3B8"
                              autoCapitalize="none"
                              autoCorrect={false}
                              autoComplete="username"
                              returnKeyType="next"
                              onSubmitEditing={() => passwordInputRef.current?.focus()}
                              blurOnSubmit={false}
                              className={cnText(
                                'flex-1 text-sm text-foreground font-sans p-0',
                                Platform.select({ web: 'outline-none' })
                              )}
                            />
                          </View>
                        )}
                      />
                      {basicForm.formState.errors.login && (
                        <Text className="text-rose-500 text-[11px] mt-1 ms-1 font-medium">
                          {basicForm.formState.errors.login.message}
                        </Text>
                      )}
                    </View>

                    {/* Step 6: Password Input */}
                    <View>
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-xs font-bold text-foreground">
                          Password
                        </Text>
                        <TouchableOpacity activeOpacity={0.8}>
                          <Text className="text-xs font-bold text-[#FF5E00] dark:text-[#FF7A00]">
                            Forgot?
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Controller
                        control={basicForm.control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <View className="flex-row items-center bg-background border border-border/90 rounded-2xl px-3.5 py-3">
                            <Lock size={18} color="#94A3B8" className="me-2.5 shrink-0" />
                            <TextInput
                              ref={passwordInputRef}
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              placeholder="Enter your password"
                              placeholderTextColor="#94A3B8"
                              secureTextEntry={!showPassword}
                              autoCapitalize="none"
                              autoCorrect={false}
                              autoComplete="password"
                              returnKeyType="go"
                              onSubmitEditing={basicForm.handleSubmit(onBasicSubmit)}
                              className={cnText(
                                'flex-1 text-sm text-foreground font-sans p-0',
                                Platform.select({ web: 'outline-none' })
                              )}
                            />
                            <TouchableOpacity
                              onPress={() => setShowPassword(!showPassword)}
                              hitSlop={8}
                              activeOpacity={0.7}
                            >
                              {showPassword ? (
                                <Eye size={18} color="#94A3B8" />
                              ) : (
                                <EyeOff size={18} color="#94A3B8" />
                              )}
                            </TouchableOpacity>
                          </View>
                        )}
                      />
                      {basicForm.formState.errors.password && (
                        <Text className="text-rose-500 text-[11px] mt-1 ms-1 font-medium">
                          {basicForm.formState.errors.password.message}
                        </Text>
                      )}
                    </View>

                    {/* Keep me signed in Checkbox */}
                    <View className="flex-row items-center pt-0.5">
                      <TouchableOpacity
                        onPress={() => setKeepSignedIn(!keepSignedIn)}
                        activeOpacity={0.8}
                        className="flex-row items-center"
                      >
                        <View
                          className={`size-4 rounded-full items-center justify-center me-2 ${
                            keepSignedIn
                              ? 'bg-[#FF5E00] dark:bg-[#FF5E00]'
                              : 'border border-border bg-background'
                          }`}
                        >
                          {keepSignedIn && <Check size={10} color="#FFFFFF" strokeWidth={3.5} />}
                        </View>
                        <Text className="text-xs text-muted-foreground font-medium">
                          Keep me signed in
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Global Error Banner */}
                    {error ? (
                      <View className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                        <Text className="text-rose-500 text-xs text-center font-medium">
                          {error}
                        </Text>
                      </View>
                    ) : null}

                    {/* Step 7: Sign In CTA Button (Logo Mixed Colors: Charcoal Slate & Sunset Orange Gradient) */}
                    <TouchableOpacity
                      onPress={basicForm.handleSubmit(onBasicSubmit)}
                      disabled={loading || connectingHarmony}
                      activeOpacity={0.88}
                      className="mt-1 h-12 rounded-2xl bg-[#1E232E] flex-row items-center justify-center gap-2 shadow-md overflow-hidden relative"
                    >
                      <View className="absolute inset-0">
                        <Svg width="100%" height="100%" preserveAspectRatio="none">
                          <Defs>
                            <LinearGradient id="signInGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <Stop offset="0%" stopColor="#1E232E" />
                              <Stop offset="45%" stopColor="#2A3342" />
                              <Stop offset="82%" stopColor="#FF5E00" />
                              <Stop offset="100%" stopColor="#FF7A00" />
                            </LinearGradient>
                          </Defs>
                          <Rect width="100%" height="100%" rx="16" fill="url(#signInGrad)" />
                        </Svg>
                      </View>
                      {loading || connectingHarmony ? (
                        <View className="flex-row items-center gap-2 z-10">
                          <ActivityIndicator color="#FFFFFF" size="small" />
                          <Text className="font-bold text-white text-sm font-sans">
                            Connecting Harmony...
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center justify-center gap-2 z-10">
                          <Text className="font-bold text-white text-base font-sans">
                            Sign In
                          </Text>
                          <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Phone OTP Form */
                  <View className="gap-3.5">
                    <View>
                      <Text className="text-xs font-bold text-foreground mb-1.5">
                        Mobile Number
                      </Text>
                      <Controller
                        control={phoneForm.control}
                        name="phone"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <View className="flex-row items-center bg-background border border-border/90 rounded-2xl px-3.5 py-3">
                            <Smartphone size={18} color="#94A3B8" className="me-2.5 shrink-0" />
                            <TextInput
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              placeholder="+919988776655"
                              placeholderTextColor="#94A3B8"
                              keyboardType="phone-pad"
                              autoComplete="tel"
                              returnKeyType="send"
                              onSubmitEditing={phoneForm.handleSubmit(onPhoneSubmit)}
                              className={cnText(
                                'flex-1 text-sm text-foreground font-sans p-0',
                                Platform.select({ web: 'outline-none' })
                              )}
                            />
                          </View>
                        )}
                      />
                      {phoneForm.formState.errors.phone && (
                        <Text className="text-rose-500 text-[11px] mt-1 ms-1 font-medium">
                          {phoneForm.formState.errors.phone.message}
                        </Text>
                      )}
                    </View>

                    {/* Global Error Banner */}
                    {error ? (
                      <View className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                        <Text className="text-rose-500 text-xs text-center font-medium">
                          {error}
                        </Text>
                      </View>
                    ) : null}

                    {/* Get OTP Button (Logo Mixed Colors: Charcoal Slate & Sunset Orange Gradient) */}
                    <TouchableOpacity
                      onPress={phoneForm.handleSubmit(onPhoneSubmit)}
                      disabled={loading || connectingHarmony}
                      activeOpacity={0.88}
                      className="mt-1 h-12 rounded-2xl bg-[#1E232E] flex-row items-center justify-center gap-2 shadow-md overflow-hidden relative"
                    >
                      <View className="absolute inset-0">
                        <Svg width="100%" height="100%" preserveAspectRatio="none">
                          <Defs>
                            <LinearGradient id="otpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <Stop offset="0%" stopColor="#1E232E" />
                              <Stop offset="45%" stopColor="#2A3342" />
                              <Stop offset="82%" stopColor="#FF5E00" />
                              <Stop offset="100%" stopColor="#FF7A00" />
                            </LinearGradient>
                          </Defs>
                          <Rect width="100%" height="100%" rx="16" fill="url(#otpGrad)" />
                        </Svg>
                      </View>
                      {loading || connectingHarmony ? (
                        <View className="flex-row items-center gap-2 z-10">
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        </View>
                      ) : (
                        <View className="flex-row items-center justify-center gap-2 z-10">
                          <Text className="font-bold text-white text-base font-sans">
                            Get OTP Code
                          </Text>
                          <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* OR CONTINUE WITH Divider */}
              <View className="flex-row items-center my-1 gap-3">
                <View className="flex-1 h-px bg-border/80" />
                <Text className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase font-sans">
                  Or Continue With
                </Text>
                <View className="flex-1 h-px bg-border/80" />
              </View>

              {/* Social Authentication: Google ID & Microsoft ID */}
              <View className="flex-row items-center gap-3 w-full">
                <SocialAuthButton provider="google" />
                <SocialAuthButton provider="microsoft" />
              </View>

              {/* Create Account Prompt */}
              <View className="flex-row items-center justify-center pt-2 pb-1">
                <Text className="text-xs text-slate-900 dark:text-white font-bold">
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/signup')}
                  activeOpacity={0.8}
                >
                  <Text className="text-xs font-extrabold text-[#FF5E00] dark:text-[#FF7A00] underline">
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
    </KeyboardAvoidingView>
    </ImageBackground>
    </>
  );
}

// Utility helper for classnames
function cnText(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
