import { Text } from '@/components/ui/text';
import { Stack, router } from 'expo-router';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Home,
  UserPlus,
  LogIn,
} from 'lucide-react-native';
import * as React from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
  Platform,
  KeyboardAvoidingView,
  ImageBackground,
  Animated,
  Easing,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useGoogleAuthSession } from '../../src/features/auth/hooks/useGoogleAuthSession';
import {
  NahomEmblem,
  NahomWordmark,
} from '@/components/auth/NahomBrandLogo';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { TextInput } from '@/components/forms/TextInput';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { parseBackendError } from '@/src/utils/validation';
// Sign-Up Schema
const signupSchema = yup.object().shape({
  name: yup.string().required('Full name is required').min(2, 'Must be at least 2 characters'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  phone: yup
    .string()
    .required('Phone number is required')
    .test('valid-phone', 'Invalid phone number format', function (value) {
      if (!value) return false;
      if (value.startsWith('+91')) {
        const n = value.slice(3);
        if (n.length !== 10) return this.createError({ message: 'India mobile number must be exactly 10 digits' });
        if (!/^[6-9]\d{9}$/.test(n)) return this.createError({ message: 'India mobile number must start with 6, 7, 8, or 9' });
        return true;
      }
      if (value.startsWith('+966')) { const n = value.slice(4); if (n.length !== 9) return this.createError({ message: 'Saudi mobile number must be exactly 9 digits' }); return true; }
      if (value.startsWith('+971')) { const n = value.slice(4); if (n.length !== 9) return this.createError({ message: 'UAE mobile number must be exactly 9 digits' }); return true; }
      return /^\+[1-9]\d{7,14}$/.test(value);
    }),
  unitNumber: yup.string().optional(),
  password: yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Confirm password is required'),
});

// Sign-In Schema
const signInSchema = yup.object().shape({
  login: yup.string().required('Email or Username is required').min(3, 'Must be at least 3 characters'),
  password: yup.string().required('Password is required').min(4, 'Password must be at least 4 characters'),
});

interface SignupFormValues { name: string; email: string; phone: string; unitNumber?: string; password: string; confirmPassword: string; }
interface SignInFormValues { login: string; password: string; }

// CTA Button — inline styles so the background & text are ALWAYS visible
interface CTAButtonProps { onPress: () => void; disabled: boolean; loading: boolean; label: string; loadingLabel?: string; }

function CTAButton({ onPress, disabled, loading, label, loadingLabel }: CTAButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        marginTop: 4,
        height: 48,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? '#94A3B8' : '#FF5E00',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
        overflow: 'hidden',
      }}
    >
      {/* Charcoal overlay on left for dark→orange brand split */}
      {!disabled && (
        <View
          style={{
            position: 'absolute',
            top: 0, bottom: 0, left: 0,
            width: '45%',
            backgroundColor: '#1E232E',
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
          pointerEvents="none"
        />
      )}
      {loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 }}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          {loadingLabel ? <Text style={{ fontWeight: '700', color: '#FFFFFF', fontSize: 14 }}>{loadingLabel}</Text> : null}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 10 }}>
          <Text style={{ fontWeight: '700', color: '#FFFFFF', fontSize: 16 }}>{label}</Text>
          <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SignupScreen() {
  const { register: performRegister, login: performLogin, loading, error, clearStatus, isAuthenticated } = useAuth();
  const { handleGoogleSignIn, loading: googleLoading } = useGoogleAuthSession();

  const [userType, setUserType] = React.useState<'new' | 'existing'>('new');
  const [localLoading, setLocalLoading] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [signInLoading, setSignInLoading] = React.useState(false);
  const [signInError, setSignInError] = React.useState<string | null>(null);

  const emailInputRef = React.useRef<RNTextInput>(null);
  const unitInputRef = React.useRef<RNTextInput>(null);
  const passwordInputRef = React.useRef<RNTextInput>(null);
  const confirmPasswordInputRef = React.useRef<RNTextInput>(null);
  const signInPasswordRef = React.useRef<RNTextInput>(null);

  const emblemScale = React.useRef(new Animated.Value(0)).current;
  const emblemOpacity = React.useRef(new Animated.Value(0)).current;
  const emblemFloat = React.useRef(new Animated.Value(0)).current;
  const contentOpacity = React.useRef(new Animated.Value(0)).current;
  const contentTranslateY = React.useRef(new Animated.Value(20)).current;

  const { control, handleSubmit, watch, setError, formState: { errors } } = useForm<SignupFormValues>({
    resolver: yupResolver(signupSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', phone: '', unitNumber: '', password: '', confirmPassword: '' },
  });

  const signInForm = useForm<SignInFormValues>({
    resolver: yupResolver(signInSchema),
    mode: 'onTouched',
    defaultValues: { login: '', password: '' },
  });

  React.useEffect(() => {
    clearStatus();
    Animated.parallel([
      Animated.spring(emblemScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.timing(emblemOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(contentTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
    ]).start(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(emblemFloat, { toValue: -5, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(emblemFloat, { toValue: 5, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    });
    return () => clearStatus();
  }, []);

  const handleTabSwitch = (tab: 'new' | 'existing') => {
    setUserType(tab);
    setLocalError(null);
    setSignInError(null);
    clearStatus();
  };

  const hasNavigatedRef = React.useRef(false);
  React.useEffect(() => {
    if (isAuthenticated && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.replace('/(resident)/dashboard');
    } else if (!isAuthenticated) {
      hasNavigatedRef.current = false;
    }
  }, [isAuthenticated]);

  const onSubmit = async (data: SignupFormValues) => {
    try {
      setLocalLoading(true);
      setLocalError(null);
      const emailPrefix = data.email.trim().split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      let derivedUsername = emailPrefix;
      if (derivedUsername.length < 3) derivedUsername = 'user' + Math.floor(100 + Math.random() * 900);
      else if (derivedUsername.length > 30) derivedUsername = derivedUsername.substring(0, 30);
      const formattedPhone = data.phone.trim().startsWith('+') ? data.phone.trim() : `+${data.phone.trim()}`;
      const action = await performRegister({ name: data.name.trim(), username: derivedUsername, email: data.email.trim().toLowerCase(), phone: formattedPhone, password: data.password, unitNumber: data.unitNumber?.trim() || undefined });
      if (action && (action.type?.endsWith('/fulfilled') || action.meta?.requestStatus === 'fulfilled')) {
        router.push({ pathname: '/(auth)/register-otp', params: { email: data.email.trim().toLowerCase() } });
      }
    } catch (err: any) {
      const parsed = parseBackendError(err, 'Registration failed. Please try again.');
      if (parsed.field === 'email') setError('email', { message: parsed.userMessage });
      else if (parsed.field === 'phone') setError('phone', { message: parsed.userMessage });
      else setLocalError(parsed.userMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  const onSignInSubmit = async (data: SignInFormValues) => {
    try {
      setSignInLoading(true);
      setSignInError(null);
      await performLogin({ login: data.login.trim(), password: data.password });
    } catch (err: any) {
      const parsed = parseBackendError(err, 'Sign in failed. Please try again.');
      setSignInError(parsed.userMessage);
    } finally {
      setSignInLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground source={require('../../assets/images/auth-bg.jpg')} style={{ flex: 1 }} blurRadius={Platform.OS === 'ios' ? 3 : 2} resizeMode="cover">
        <View className="absolute inset-0 bg-white/40 dark:bg-[#0B0E14]/55" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'} className="px-5 py-6">
            <View className="max-w-sm mx-auto w-full gap-3.5">

              {/* Brand Header */}
              <Animated.View style={{ opacity: emblemOpacity, transform: [{ scale: emblemScale }, { translateY: emblemFloat }], alignItems: 'center', justifyContent: 'center' }}>
                <NahomEmblem size={102} />
                <NahomWordmark />
              </Animated.View>

              {/* Animated Content */}
              <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }} className="gap-3.5 w-full">

                {/* Form Card */}
                <View className="bg-card border border-border/80 rounded-3xl p-5 gap-3.5 shadow-xs">

                  {/* Tab Switcher */}
                  <View className="bg-muted/40 p-1 rounded-2xl flex-row border border-border/60">
                    <TouchableOpacity onPress={() => handleTabSwitch('new')} activeOpacity={0.85} accessibilityRole="tab" accessibilityLabel="New User Sign Up" accessibilityState={{ selected: userType === 'new' }} className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${userType === 'new' ? 'bg-card border border-border/60 shadow-xs' : ''}`}>
                      <UserPlus size={14} color={userType === 'new' ? '#FF5E00' : '#64748B'} strokeWidth={2.2} />
                      <Text className={`text-xs font-bold ${userType === 'new' ? 'text-[#1E232E] dark:text-[#FF7A00]' : 'text-muted-foreground'}`}>New User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleTabSwitch('existing')} activeOpacity={0.85} accessibilityRole="tab" accessibilityLabel="Existing User Sign In" accessibilityState={{ selected: userType === 'existing' }} className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${userType === 'existing' ? 'bg-card border border-border/60 shadow-xs' : ''}`}>
                      <LogIn size={14} color={userType === 'existing' ? '#FF5E00' : '#64748B'} strokeWidth={2.2} />
                      <Text className={`text-xs font-bold ${userType === 'existing' ? 'text-[#1E232E] dark:text-[#FF7A00]' : 'text-muted-foreground'}`}>Existing User</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tab Content */}
                  {userType === 'new' ? (
                    /* NEW USER: Sign-Up Form */
                    <View className="gap-3.5">
                      <Text className="text-base font-bold text-foreground text-center">Create Resident Account</Text>
                      <Controller control={control} name="name" render={({ field: { onChange, onBlur, value } }) => (<TextInput label="Full Name" required value={value} onChangeText={onChange} onBlur={onBlur} placeholder="e.g. John Doe" autoCapitalize="words" leftIcon={User} error={errors.name?.message} returnKeyType="next" onSubmitEditing={() => emailInputRef.current?.focus()} blurOnSubmit={false} />)} />
                      <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (<TextInput ref={emailInputRef} label="Email Address" required value={value} onChangeText={onChange} onBlur={onBlur} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} leftIcon={Mail} error={errors.email?.message} returnKeyType="next" onSubmitEditing={() => unitInputRef.current?.focus()} blurOnSubmit={false} />)} />
                      <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (<PhoneInput label="Phone Number" required placeholder="98765 43210" value={value} onChangeText={onChange} error={errors.phone?.message} />)} />
                      <Controller control={control} name="unitNumber" render={({ field: { onChange, onBlur, value } }) => (<TextInput ref={unitInputRef} label="Villa / Unit No. (Optional)" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="e.g. Villa 104, Block B" leftIcon={Home} returnKeyType="next" onSubmitEditing={() => passwordInputRef.current?.focus()} blurOnSubmit={false} />)} />
                      <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (<PasswordInput ref={passwordInputRef} label="Password" required value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Create a password" leftIcon={Lock} showRequirements error={errors.password?.message} returnKeyType="next" onSubmitEditing={() => confirmPasswordInputRef.current?.focus()} blurOnSubmit={false} />)} />
                      <Controller control={control} name="confirmPassword" render={({ field: { onChange, onBlur, value } }) => (<PasswordInput ref={confirmPasswordInputRef} label="Confirm Password" required value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Re-enter password" leftIcon={Lock} confirmValue={watch('password')} error={errors.confirmPassword?.message} returnKeyType="go" onSubmitEditing={handleSubmit(onSubmit)} />)} />
                      {(localError || error) ? (<View className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5"><Text className="text-rose-500 text-xs text-center font-medium">{localError || error}</Text></View>) : null}
                      <CTAButton onPress={handleSubmit(onSubmit)} disabled={loading || localLoading} loading={loading || localLoading} label="Create Account" loadingLabel="Creating..." />
                    </View>
                  ) : (
                    /* EXISTING USER: Sign-In Form */
                    <View className="gap-3.5">
                      <Text className="text-base font-bold text-foreground text-center">Welcome Back</Text>
                      <Controller control={signInForm.control} name="login" render={({ field: { onChange, onBlur, value } }) => (<TextInput label="Email or Username" required value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Enter your email or username" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" leftIcon={Mail} error={signInForm.formState.errors.login?.message} returnKeyType="next" onSubmitEditing={() => signInPasswordRef.current?.focus()} blurOnSubmit={false} />)} />
                      <View>
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Text className="text-sm font-medium text-foreground">Password <Text className="text-destructive font-bold">*</Text></Text>
                          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} activeOpacity={0.8} hitSlop={8} accessibilityRole="button" accessibilityLabel="Forgot password">
                            <Text className="text-xs font-bold text-[#FF5E00] dark:text-[#FF7A00]">Forgot?</Text>
                          </TouchableOpacity>
                        </View>
                        <Controller control={signInForm.control} name="password" render={({ field: { onChange, onBlur, value } }) => (<PasswordInput ref={signInPasswordRef} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Enter your password" leftIcon={Lock} error={signInForm.formState.errors.password?.message} returnKeyType="go" onSubmitEditing={signInForm.handleSubmit(onSignInSubmit)} />)} />
                      </View>
                      {(signInError || error) ? (<View className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5"><Text className="text-rose-500 text-xs text-center font-medium">{signInError || error}</Text></View>) : null}
                      <CTAButton onPress={signInForm.handleSubmit(onSignInSubmit)} disabled={signInLoading || googleLoading} loading={signInLoading} label="Sign In" loadingLabel="Signing In..." />
                    </View>
                  )}
                </View>

                {/* OR CONTINUE WITH */}
                <View className="flex-row items-center my-1 gap-3">
                  <View className="flex-1 h-px bg-border/80" />
                  <Text className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase font-sans">Or Continue With</Text>
                  <View className="flex-1 h-px bg-border/80" />
                </View>

                {/* Social Auth */}
                <View className="flex-row items-center gap-3 w-full">
                  <SocialAuthButton provider="google" onPress={handleGoogleSignIn} loading={googleLoading} />
                  <SocialAuthButton provider="apple" />
                </View>

                {/* Bottom Hint */}
                <View className="flex-row items-center justify-center pt-2 pb-1">
                  {userType === 'new' ? (
                    <>
                      <Text className="text-xs text-slate-900 dark:text-white font-bold">Already have an account?{' '}</Text>
                      <TouchableOpacity onPress={() => handleTabSwitch('existing')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Switch to sign in">
                        <Text className="text-xs font-extrabold text-[#FF5E00] dark:text-[#FF7A00] underline">Sign In</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text className="text-xs text-slate-900 dark:text-white font-bold">Don't have an account?{' '}</Text>
                      <TouchableOpacity onPress={() => handleTabSwitch('new')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Switch to create account">
                        <Text className="text-xs font-extrabold text-[#FF5E00] dark:text-[#FF7A00] underline">Create Account</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </>
  );
}