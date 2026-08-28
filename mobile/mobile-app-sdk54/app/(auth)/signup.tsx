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
  NahomTrustBadges,
} from '@/components/auth/NahomBrandLogo';

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
    .required('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/, 'Enter a valid phone number (e.g. +919988776655)'),
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
  const { loading, error, clearStatus } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [localLoading, setLocalLoading] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Input focus refs
  const emailInputRef = React.useRef<TextInput>(null);
  const phoneInputRef = React.useRef<TextInput>(null);
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
      // Route to resident login or request OTP verification
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: data.phone },
      });
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
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                          className="flex-1 text-sm text-foreground font-sans p-0"
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
                          onSubmitEditing={() => phoneInputRef.current?.focus()}
                          blurOnSubmit={false}
                          className="flex-1 text-sm text-foreground font-sans p-0"
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

                {/* Phone */}
                <View>
                  <Text className="text-xs font-bold text-foreground mb-1.5">
                    Phone Number
                  </Text>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="flex-row items-center bg-background border border-border/90 rounded-2xl px-3.5 py-3">
                        <Smartphone size={18} color="#94A3B8" className="me-2.5 shrink-0" />
                        <TextInput
                          ref={phoneInputRef}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="+919988776655"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          returnKeyType="next"
                          onSubmitEditing={() => unitInputRef.current?.focus()}
                          blurOnSubmit={false}
                          className="flex-1 text-sm text-foreground font-sans p-0"
                        />
                      </View>
                    )}
                  />
                  {errors.phone && (
                    <Text className="text-rose-500 text-[11px] mt-1 ms-1 font-medium">
                      {errors.phone.message}
                    </Text>
                  )}
                </View>

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
                          className="flex-1 text-sm text-foreground font-sans p-0"
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
                          className="flex-1 text-sm text-foreground font-sans p-0"
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
                          className="flex-1 text-sm text-foreground font-sans p-0"
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

                {/* Sign Up CTA Button */}
                <TouchableOpacity
                  onPress={handleSubmit(onSubmit)}
                  disabled={loading || localLoading}
                  activeOpacity={0.85}
                  className="mt-1 h-12 bg-[#172B70] dark:bg-[#245FA8] rounded-2xl flex-row items-center justify-center gap-2 shadow-xs active:bg-[#0F1E50] dark:active:bg-[#1D4ED8]"
                >
                  {loading || localLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text className="font-bold text-white text-base font-sans">
                        Create Account
                      </Text>
                      <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Already Have Account */}
              <View className="flex-row items-center justify-center pt-0.5">
                <Text className="text-xs text-slate-900 dark:text-white font-bold">
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/login')}
                  activeOpacity={0.8}
                >
                  <Text className="text-xs font-extrabold text-[#172B70] dark:text-[#60A5FA] underline">
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Trust Badges */}
              <View className="pt-1 px-1 items-center justify-center">
                <NahomTrustBadges />
              </View>

              {/* Bottom Security Caption */}
              <View className="flex-row items-center justify-center pb-2 pt-0.5 gap-1.5">
                <Shield size={12} color="#172B70" strokeWidth={2.5} />
                <Text className="text-[11px] text-slate-900 dark:text-slate-100 font-bold font-sans">
                  256-Bit Encrypted Community Security Network
                </Text>
              </View>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
      </ImageBackground>
    </>
  );
}
