import { Text } from '@/components/ui/text';
import { Stack, router } from 'expo-router';
import {
  User,
  Mail,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  Home,
} from 'lucide-react-native';
import * as React from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ImageBackground,
  Animated,
  Easing,
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
import { PhoneInput } from '@/components/forms/PhoneInput';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { sessionStore } from '@/src/utils/storage';

const signupSchema = yup.object().shape({
  name: yup
    .string()
    .required('Full name is required')
    .min(2, 'Must be at least 2 characters'),
  email: yup
    .string()
    .email('Invalid email address')
    .required('Email is required'),
  phone: yup
    .string()
    .optional()
    .test('valid-phone', 'Invalid phone number format', function (value) {
      if (!value || !value.trim()) return true;
      if (value.startsWith('+91')) {
        const nationalNumber = value.slice(3);
        if (nationalNumber.length !== 10) {
          return this.createError({ message: 'India mobile number must be exactly 10 digits' });
        }
        if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
          return this.createError({ message: 'India mobile number must start with 6, 7, 8, or 9' });
        }
        return true;
      }
      if (value.startsWith('+966')) {
        const nationalNumber = value.slice(4);
        if (nationalNumber.length !== 9) {
          return this.createError({ message: 'Saudi mobile number must be exactly 9 digits' });
        }
        return true;
      }
      if (value.startsWith('+971')) {
        const nationalNumber = value.slice(4);
        if (nationalNumber.length !== 9) {
          return this.createError({ message: 'UAE mobile number must be exactly 9 digits' });
        }
        return true;
      }
      return /^\+[1-9]\d{7,14}$/.test(value);
    }),
  unitNumber: yup.string().optional(),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

interface SignupFormValues {
  name: string;
  email: string;
  phone: string;
  unitNumber?: string;
  password: string;
  confirmPassword: string;
}

export default function SignupScreen() {
  const { register: performRegister, loading, error, successMsg, clearStatus, logout, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [localLoading, setLocalLoading] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Input focus refs
  const emailInputRef = React.useRef<TextInput>(null);
  const unitInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const confirmPasswordInputRef = React.useRef<TextInput>(null);

  // Logo & Content Entrance Animation Drivers
  const emblemScale = React.useRef(new Animated.Value(0)).current;
  const emblemOpacity = React.useRef(new Animated.Value(0)).current;
  const emblemFloat = React.useRef(new Animated.Value(0)).current;
  const contentOpacity = React.useRef(new Animated.Value(0)).current;
  const contentTranslateY = React.useRef(new Animated.Value(20)).current;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: yupResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      unitNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    clearStatus();
    Animated.parallel([
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
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(contentTranslateY, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => {
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
    return () => clearStatus();
  }, []);

  const onSubmit = async (data: SignupFormValues) => {
    try {
      setLocalLoading(true);
      setLocalError(null);

      const emailPrefix = data.email
        .trim()
        .split('@')[0]
        .replace(/[^a-zA-Z0-9]/g, '');
      
      let derivedUsername = emailPrefix;
      if (derivedUsername.length < 3) {
        derivedUsername = 'user' + Math.floor(100 + Math.random() * 900);
      } else if (derivedUsername.length > 30) {
        derivedUsername = derivedUsername.substring(0, 30);
      }

      const formattedPhone = data.phone.trim().startsWith('+') ? data.phone.trim() : `+${data.phone.trim()}`;
      const action = await performRegister({
        name: data.name.trim(),
        username: derivedUsername,
        email: data.email.trim().toLowerCase(),
        phone: formattedPhone,
        password: data.password,
        unitNumber: data.unitNumber?.trim() || undefined,
      });

      if (action && (action.type?.endsWith('/fulfilled') || (action.meta && action.meta.requestStatus === 'fulfilled'))) {
        router.push({
          pathname: '/(auth)/register-otp',
          params: { email: data.email.trim().toLowerCase() },
        });
      }
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed');
    } finally {
      setLocalLoading(false);
    }
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
              {/* Brand Header */}
              <Animated.View
                style={{
                  opacity: emblemOpacity,
                  transform: [{ scale: emblemScale }, { translateY: emblemFloat }],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NahomEmblem size={102} />
                <NahomWordmark />
              </Animated.View>

              {/* Form Card */}
              <Animated.View
                style={{
                  opacity: contentOpacity,
                  transform: [{ translateY: contentTranslateY }],
                }}
                className="gap-3.5 w-full"
              >
              <View className="bg-card border border-border/80 rounded-3xl p-5 gap-3.5 shadow-xs">
                <Text className="text-base font-bold text-foreground text-center">
                  Create Resident Account
                </Text>

                {/* Full Name */}
                <View>
                  <Text className="text-xs font-bold text-foreground mb-1.5">
                    Full Name
                  </Text>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="flex-row items-center bg-background border border-border/90 rounded-2xl px-3.5 py-3">
                        <User size={18} color="#94A3B8" className="me-2.5 shrink-0" />
                        <TextInput
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="e.g. John Doe"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="words"
                          returnKeyType="next"
                          onSubmitEditing={() => emailInputRef.current?.focus()}
                          blurOnSubmit={false}
                          className={cnText(
                            'flex-1 text-sm text-foreground font-sans p-0',
                            Platform.select({ web: 'outline-none' })
                          )}
                        />
                      </View>
                    )}
                  />
                  {errors.name && (
                    <Text className="text-rose-500 text-[11px] mt-1 ms-1 font-medium">
                      {errors.name.message}
                    </Text>
                  )}
                </View>

                {/* Email */}
                <View>
                  <Text className="text-xs font-bold text-foreground mb-1.5">
                    Email Address
                  </Text>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="flex-row items-center bg-background border border-border/90 rounded-2xl px-3.5 py-3">
                        <Mail size={18} color="#94A3B8" className="me-2.5 shrink-0" />
                        <TextInput
                          ref={emailInputRef}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="john@example.com"
                          placeholderTextColor="#94A3B8"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          returnKeyType="next"
                          onSubmitEditing={() => unitInputRef.current?.focus()}
                          blurOnSubmit={false}
                          className={cnText(
                            'flex-1 text-sm text-foreground font-sans p-0',
                            Platform.select({ web: 'outline-none' })
                          )}
                        />
                      </View>
                    )}
                  />
                  {errors.email && (
                    <Text className="text-rose-500 text-[11px] mt-1 ms-1 font-medium">
                      {errors.email.message}
                    </Text>
                  )}
                </View>

                {/* Phone Number with Country Selection */}
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, value } }) => (
                    <PhoneInput
                      label="Phone Number"
                      placeholder="97866 08686"
                      value={value}
                      onChangeText={onChange}
                      error={errors.phone?.message}
                    />
                  )}
                />

                {/* Villa / Unit Number */}
                <View>
                  <Text className="text-xs font-bold text-foreground mb-1.5">
                    Villa / Unit No. (Optional)
                  </Text>
                  <Controller
                    control={control}
                    name="unitNumber"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="flex-row items-center bg-background border border-border/90 rounded-2xl px-3.5 py-3">
                        <Home size={18} color="#94A3B8" className="me-2.5 shrink-0" />
                        <TextInput
                          ref={unitInputRef}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="e.g. Villa 104, Block B"
                          placeholderTextColor="#94A3B8"
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
                </View>

                {/* Password */}
                <View>
                  <Text className="text-xs font-bold text-foreground mb-1.5">
                    Password
                  </Text>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="flex-row items-center bg-background border border-border/90 rounded-2xl px-3.5 py-3">
                        <Lock size={18} color="#94A3B8" className="me-2.5 shrink-0" />
                        <TextInput
                          ref={passwordInputRef}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Create a password"
                          placeholderTextColor="#94A3B8"
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          returnKeyType="next"
                          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                          blurOnSubmit={false}
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
                  {errors.password && (
                    <Text className="text-rose-500 text-[11px] mt-1 ms-1 font-medium">
                      {errors.password.message}
                    </Text>
                  )}
                </View>

                {/* Confirm Password */}
                <View>
                  <Text className="text-xs font-bold text-foreground mb-1.5">
                    Confirm Password
                  </Text>
                  <Controller
                    control={control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="flex-row items-center bg-background border border-border/90 rounded-2xl px-3.5 py-3">
                        <Lock size={18} color="#94A3B8" className="me-2.5 shrink-0" />
                        <TextInput
                          ref={confirmPasswordInputRef}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Re-enter password"
                          placeholderTextColor="#94A3B8"
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          returnKeyType="go"
                          onSubmitEditing={handleSubmit(onSubmit)}
                          className={cnText(
                            'flex-1 text-sm text-foreground font-sans p-0',
                            Platform.select({ web: 'outline-none' })
                          )}
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          hitSlop={8}
                          activeOpacity={0.7}
                        >
                          {showConfirmPassword ? (
                            <Eye size={18} color="#94A3B8" />
                          ) : (
                            <EyeOff size={18} color="#94A3B8" />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors.confirmPassword && (
                    <Text className="text-rose-500 text-[11px] mt-1 ms-1 font-medium">
                      {errors.confirmPassword.message}
                    </Text>
                  )}
                </View>

                {/* Global Error Banner */}
                {localError || error ? (
                  <View className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                    <Text className="text-rose-500 text-xs text-center font-medium">
                      {localError || error}
                    </Text>
                  </View>
                ) : null}

                {/* Sign Up CTA Button (Logo Mixed Colors: Charcoal Slate & Sunset Orange Gradient) */}
                <TouchableOpacity
                  onPress={handleSubmit(onSubmit)}
                  disabled={loading || localLoading}
                  activeOpacity={0.88}
                  className="mt-1 h-12 rounded-2xl bg-[#1E232E] flex-row items-center justify-center gap-2 shadow-md overflow-hidden relative"
                >
                  <View className="absolute inset-0">
                    <Svg width="100%" height="100%" preserveAspectRatio="none">
                      <Defs>
                        <LinearGradient id="signUpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <Stop offset="0%" stopColor="#1E232E" />
                          <Stop offset="45%" stopColor="#2A3342" />
                          <Stop offset="82%" stopColor="#FF5E00" />
                          <Stop offset="100%" stopColor="#FF7A00" />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" rx="16" fill="url(#signUpGrad)" />
                    </Svg>
                  </View>
                  {loading || localLoading ? (
                    <View className="flex-row items-center gap-2 z-10">
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-center gap-2 z-10">
                      <Text className="font-bold text-white text-base font-sans">
                        Create Account
                      </Text>
                      <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                  )}
                </TouchableOpacity>
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

              {/* Already Have Account */}
              <View className="flex-row items-center justify-center pt-2 pb-1">
                <Text className="text-xs text-slate-900 dark:text-white font-bold">
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
                  <Text className="text-xs font-extrabold text-[#FF5E00] dark:text-[#FF7A00] underline">
                    Sign In
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
