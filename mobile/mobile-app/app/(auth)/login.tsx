import { Text } from '@/components/ui/text';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  Mail,
  Lock,
  Smartphone,
  User,
  Eye,
  EyeOff,
  Check,
  Shield,
  ArrowRight,
  Send,
  Sparkles,
  X,
} from 'lucide-react-native';
import * as React from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
  Platform,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  AccessibilityInfo,
  Text as RNText,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useGoogleAuthSession } from '@/src/features/auth/hooks/useGoogleAuthSession';
import { AppleSignInButton } from '@/src/features/auth/components/AppleSignInButton';
import {
  NahomEmblem,
  NahomWordmark,
  NahomHouseH,
  NahomThemedTitle,
} from '@/components/auth/NahomBrandLogo';
import { AuthMethodSelector } from '@/components/auth/AuthMethodSelector';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { TextInput } from '@/components/forms/TextInput';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { OtpInputField } from '@/components/auth/OtpInputField';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { Checkbox } from '@/components/forms/Checkbox';
import { parseBackendError } from '@/src/utils/validation';
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';
import { storage } from '@/src/utils/storage';
import { setPendingInviteToken, getPendingInviteToken, clearPendingInviteToken } from '@/src/features/auth/utils/inviteContext';
import { hasActiveCommunity } from '@/src/features/auth/utils/landing';
import { useDispatch, useSelector } from 'react-redux';
import { clearPendingRoute } from '@/src/features/notification/store/notificationSlice';
import { useTranslation } from '@/src/utils/i18n';
import { KeyboardAwareScrollView } from '@/components/layout/KeyboardAwareScrollView';
import { useKeyboard } from '@/components/layout/useKeyboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

// 1. Basic Auth Validation Schema
const emailAuthSchema = yup.object().shape({
  login: yup.string().required('Email is required').email('Must be a valid email'),
});

// 2. Phone OTP Validation Schema
const phoneSchema = yup.object().shape({
  phone: yup
    .string()
    .required('Phone number is required')
    .test('valid-phone', 'Please enter a valid mobile number with country code', (value) => {
      if (!value) return false;
      return /^\+[1-9]\d{10,14}$/.test(value.trim());
    }),
});

interface EmailFormValues {
  login: string;
}

interface PhoneFormValues {
  phone: string;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const { user, requestOtp, verifyOtp, error, isAuthenticated, otpSent, clearStatus, acceptInvitation } = useAuth();
  const { handleGoogleSignIn, loading: googleLoading } = useGoogleAuthSession();
  const params = useLocalSearchParams<{
    intent?: string;
    email?: string;
    inviteToken?: string;
    token?: string;
    switchType?: 'community' | 'villa' | 'role';
    targetName?: string;
    targetCommunity?: string;
    targetRole?: string;
  }>();
  // An invitation link brought the person here: remember exactly which invitation
  // they are answering, so it can be accepted after OTP/SSO verification
  React.useEffect(() => {
    setPendingInviteToken(params.inviteToken || params.token);
  }, [params.inviteToken, params.token]);
  const hasPendingInvite = !!(params.inviteToken || params.token || getPendingInviteToken());

  const [authMode, setAuthMode] = React.useState<'basic' | 'phone'>('basic');
  const [keepSignedIn, setKeepSignedIn] = React.useState(true);
  const handleKeepSignedInChange = React.useCallback((checked: boolean) => {
    setKeepSignedIn(checked);
    storage.setItem('keep_signed_in', checked ? 'true' : 'false').catch(() => {});
  }, []);
  const [submitted, setSubmitted] = React.useState<{value: string, isEmail: boolean} | null>(null);
  const [submittedPhone, setSubmittedPhone] = React.useState('');
  const [phoneOtpCode, setPhoneOtpCode] = React.useState('');
  const [emailOtpCode, setEmailOtpCode] = React.useState('');
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmittingBasic, setIsSubmittingBasic] = React.useState(false);
  const [isSubmittingPhone, setIsSubmittingPhone] = React.useState(false);
  const hasNavigatedRef = React.useRef(false);
  const [switchDismissed, setSwitchDismissed] = React.useState(false);
  const passwordInputRef = React.useRef<RNTextInput>(null);

  // Resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  React.useEffect(() => {
    const loadSavedPreferences = async () => {
      try {
        const savedKeep = await storage.getItem('keep_signed_in');
        if (savedKeep !== null) {
          setKeepSignedIn(savedKeep === 'true');
        }
      } catch (e) {
        console.warn('Failed to load saved login preferences', e);
      }
    };
    loadSavedPreferences();
  }, []);

  // Accessibility: Reduced Motion Support
  const [reduceMotion, setReduceMotion] = React.useState(false);
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove?.();
  }, []);

  // Keyboard state & scroll lock management
  const { keyboardShown } = useKeyboard();
  const scrollRef = React.useRef<ScrollView>(null);

  React.useEffect(() => {
    if (!keyboardShown) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [keyboardShown]);

  // 1. Background Cinematic Parallax Drivers (Subtle slow breathing drift)
  const bgTranslateX = React.useRef(new Animated.Value(0)).current;
  const bgScale = React.useRef(new Animated.Value(1.04)).current;

  // 2. Nahom Logo Luxury Entrance Drivers (Initial: opacity 0, scale 0.95, translateY 8)
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const logoScale = React.useRef(new Animated.Value(0.95)).current;
  const logoTranslateY = React.useRef(new Animated.Value(8)).current;

  // 3. NAHOM Wordmark Entrance Drivers
  const wordmarkOpacity = React.useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = React.useRef(new Animated.Value(6)).current;

  // 4. Emblem Weightless Float Driver (0 -> -4px -> 0, calm 3800ms cycle)
  const emblemFloat = React.useRef(new Animated.Value(0)).current;

  // 5. Logo Light Sweep Active State (revealed after entrance)
  const [enableLogoSweep, setEnableLogoSweep] = React.useState(false);

  // 6. Login Card Floating Entrance Drivers (Initial: opacity 0, scale 0.97, translateY 20)
  const cardOpacity = React.useRef(new Animated.Value(0)).current;
  const cardScale = React.useRef(new Animated.Value(0.97)).current;
  const cardTranslateY = React.useRef(new Animated.Value(20)).current;

  // 7. Sign In Button Reflection Sweep Drivers (4.8s cycle)
  const buttonSweepX = React.useRef(new Animated.Value(-120)).current;
  const buttonSweepOpacity = React.useRef(new Animated.Value(0)).current;

  // 8. Tactile Micro-Interaction Drivers
  const buttonPressScale = React.useRef(new Animated.Value(1)).current;
  const arrowShiftX = React.useRef(new Animated.Value(0)).current;

  // 9. Input Focus Micro-Interaction Drivers
  const [isLoginFocused, setIsLoginFocused] = React.useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = React.useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = React.useState(false);
  const loginIconScale = React.useRef(new Animated.Value(1)).current;
  const passwordIconScale = React.useRef(new Animated.Value(1)).current;

  // Coordinated Luxury Entrance & Ambient Sequence
  React.useEffect(() => {
    if (reduceMotion) {
      // Immediate calm static state for accessibility
      logoOpacity.setValue(1);
      logoScale.setValue(1);
      logoTranslateY.setValue(0);
      wordmarkOpacity.setValue(1);
      wordmarkTranslateY.setValue(0);
      cardOpacity.setValue(1);
      cardScale.setValue(1);
      cardTranslateY.setValue(0);
      return;
    }

    let isMounted = true;
    let bgDriftLoop: Animated.CompositeAnimation | null = null;
    let emblemFloatLoop: Animated.CompositeAnimation | null = null;
    let buttonSweepLoop: Animated.CompositeAnimation | null = null;

    // Background slow cinematic breathing drift (16s cycle)
    bgDriftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bgTranslateX, {
          toValue: 5,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bgTranslateX, {
          toValue: -5,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    bgDriftLoop.start();

    // Coordinated Staged Entrance Sequence:
    // 0.1s - 1.1s: Nahom logo gently revealed (900-1200ms duration, cubic ease-out)
    // 0.35s - 0.95s: Wordmark unfurls gracefully
    // 0.55s - 1.25s: Login card floats into position (650ms duration, cubic ease-out)
    Animated.parallel([
      // Logo Entrance
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1050,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 1050,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 1050,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // Stage 2: Wordmark Reveal
      Animated.sequence([
        Animated.delay(250),
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wordmarkTranslateY, {
            toValue: 0,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),

      // Login Card Floating Entrance
      Animated.sequence([
        Animated.delay(550),
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 680,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(cardScale, {
            toValue: 1,
            duration: 680,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(cardTranslateY, {
            toValue: 0,
            duration: 680,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => {
      if (!isMounted) return;

      // 1.5s+: Ambient subtle animations begin
      setEnableLogoSweep(true);

      // Section 3: Orange orb / emblem subtle floating effect (3800ms cycle, 0 -> -4px -> 0, weightless)
      emblemFloatLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(emblemFloat, {
            toValue: -4,
            duration: 1900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(emblemFloat, {
            toValue: 0,
            duration: 1900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      emblemFloatLoop.start();

      // Section 9: Sign In button subtle light sweep (repeats every ~4.8 seconds)
      buttonSweepLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(buttonSweepX, {
              toValue: 360,
              duration: 950,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(buttonSweepOpacity, {
                toValue: 0.22,
                duration: 250,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.delay(450),
              Animated.timing(buttonSweepOpacity, {
                toValue: 0,
                duration: 250,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.timing(buttonSweepX, {
            toValue: -120,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.delay(3800),
        ])
      );
      buttonSweepLoop.start();
    });

    return () => {
      isMounted = false;
      bgDriftLoop?.stop();
      emblemFloatLoop?.stop();
      buttonSweepLoop?.stop();
    };
  }, [reduceMotion]);

  // Tactile Micro-Interactions: Sign In CTA
  const handleBasicSignIn = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(buttonPressScale, {
          toValue: 0.98,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(arrowShiftX, {
          toValue: 4,
          duration: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonPressScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(arrowShiftX, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    basicForm.handleSubmit(onBasicSubmit)();
  };

  const handlePhoneSignIn = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(buttonPressScale, {
          toValue: 0.98,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(arrowShiftX, {
          toValue: 4,
          duration: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonPressScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(arrowShiftX, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    phoneForm.handleSubmit(onPhoneSubmit)();
  };

  // Tactile Micro-Interactions: Input Focus
  const handleLoginFieldFocus = () => {
    setIsLoginFocused(true);
    Animated.sequence([
      Animated.timing(loginIconScale, { toValue: 1.08, duration: 90, useNativeDriver: true }),
      Animated.timing(loginIconScale, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start();
  };

  const handlePasswordFieldFocus = () => {
    setIsPasswordFocused(true);
    Animated.sequence([
      Animated.timing(passwordIconScale, { toValue: 1.08, duration: 90, useNativeDriver: true }),
      Animated.timing(passwordIconScale, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start();
  };

  // Basic Auth Form Hook
  const basicForm = useForm<EmailFormValues>({
    resolver: yupResolver(emailAuthSchema),
    mode: 'onTouched',
    defaultValues: {
      login: params.email ? decodeURIComponent(params.email) : '',
    },
  });

  // Phone Form Hook
  const phoneForm = useForm<PhoneFormValues>({
    resolver: yupResolver(phoneSchema),
    mode: 'onTouched',
    defaultValues: {
      phone: '',
    },
  });

  React.useEffect(() => {
    if (params.email) {
      basicForm.setValue('login', decodeURIComponent(params.email));
    }
  }, [params.email, basicForm]);

  React.useEffect(() => {
    clearStatus();
    setEmailOtpCode('');
    setPhoneOtpCode('');
    setResendCooldown(0);
    return () => {
      clearStatus();
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      Keyboard.dismiss();
    };
  }, [authMode]);

  React.useEffect(() => {
    let isCancelled = false;
    const handleRedirect = async () => {
      if (isAuthenticated && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        Keyboard.dismiss();

        const activeInviteToken = (params.inviteToken || params.token || (params as any).invite_token || getPendingInviteToken()) as string | undefined;
        clearPendingInviteToken();
        if (activeInviteToken && !hasActiveCommunity(user)) {
          try {
            await acceptInvitation(activeInviteToken);
          } catch (e) {
            console.warn('Failed to accept invitation during login redirect:', e);
          }
        }

        if (!isCancelled) {
          dispatch(clearPendingRoute());
          storage.removeItem('mobile_auth_intent');
          router.replace('/(resident)');
        }
      } else if (!isAuthenticated) {
        hasNavigatedRef.current = false;
      }
    };

    handleRedirect();
    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, dispatch, params.inviteToken, params.token, (params as any).invite_token, acceptInvitation]);

  // Handle Changing Email or Phone (Reset OTP state to allow re-entering)
  const handleChangeEmailOrPhone = () => {
    clearStatus();
    setEmailOtpCode('');
    setPhoneOtpCode('');
    setResendCooldown(0);
  };

  // Handle Resending OTP for either Email or Phone
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    if (authMode === 'basic') {
      const emailVal = basicForm.getValues('login')?.trim();
      if (!emailVal) return;
      setIsSubmittingBasic(true);
      try {
        await requestOtp(emailVal, true);
        setEmailOtpCode('');
        setResendCooldown(25);
      } finally {
        setIsSubmittingBasic(false);
      }
    } else {
      const phoneVal = phoneForm.getValues('phone');
      if (!phoneVal) return;
      setIsSubmittingPhone(true);
      try {
        await requestOtp(phoneVal, false);
        setPhoneOtpCode('');
        setResendCooldown(25);
      } finally {
        setIsSubmittingPhone(false);
      }
    }
  };

  // Universal Keyboard Dismiss Helper (React Native + Web)
  const dismissKeyboard = React.useCallback(() => {
    Keyboard.dismiss();
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Handle Basic (Email) Auth Submit: request code or verify code inline
  const onBasicSubmit = async (data: EmailFormValues) => {
    const trimmedEmail = data.login.trim();
    setSubmitted({ value: trimmedEmail, isEmail: true });
    setIsSubmittingBasic(true);
    try {
      if (otpSent) {
        dismissKeyboard();
        const tokenToPass = String(params.inviteToken || params.token || (params as any).invite_token || getPendingInviteToken() || '');
        await verifyOtp(trimmedEmail, emailOtpCode, true, tokenToPass);
        clearPendingInviteToken();
        return;
      }
      await requestOtp(trimmedEmail, true);
      setResendCooldown(25);
    } finally {
      setIsSubmittingBasic(false);
    }
  };

  // Phone + OTP: send a code by SMS or verify code inline
  const onPhoneSubmit = async (data: PhoneFormValues) => {
    setSubmitted({ value: data.phone, isEmail: false });
    setIsSubmittingPhone(true);
    try {
      if (otpSent) {
        dismissKeyboard();
        const tokenToPass = String(params.inviteToken || params.token || (params as any).invite_token || getPendingInviteToken() || '');
        await verifyOtp(data.phone, phoneOtpCode, false, tokenToPass);
        clearPendingInviteToken();
        return;
      }
      await requestOtp(data.phone, false);
      setResendCooldown(25);
    } finally {
      setIsSubmittingPhone(false);
    }
  };

  // Auto-Submit OTP when 6 digits are fully typed
  const lastAttemptedCodeRef = React.useRef<string>('');

  React.useEffect(() => {
    if (!otpSent) {
      lastAttemptedCodeRef.current = '';
      return;
    }

    if (authMode === 'basic') {
      const trimmed = emailOtpCode.trim();
      if (trimmed.length === 4 && trimmed !== lastAttemptedCodeRef.current && !isSubmittingBasic) {
        lastAttemptedCodeRef.current = trimmed;
        dismissKeyboard();
        const emailVal = basicForm.getValues('login')?.trim() || submitted?.value?.trim();
        if (emailVal) {
          const tokenToPass = String(params.inviteToken || params.token || (params as any).invite_token || getPendingInviteToken() || '');
          setIsSubmittingBasic(true);
          verifyOtp(emailVal, trimmed, true, tokenToPass)
            .finally(() => setIsSubmittingBasic(false));
        }
      }
    } else {
      const trimmed = phoneOtpCode.trim();
      if (trimmed.length === 4 && trimmed !== lastAttemptedCodeRef.current && !isSubmittingPhone) {
        lastAttemptedCodeRef.current = trimmed;
        dismissKeyboard();
        const phoneVal = phoneForm.getValues('phone')?.trim() || submitted?.value?.trim();
        if (phoneVal) {
          const tokenToPass = String(params.inviteToken || params.token || (params as any).invite_token || getPendingInviteToken() || '');
          setIsSubmittingPhone(true);
          verifyOtp(phoneVal, trimmed, false, tokenToPass)
            .finally(() => setIsSubmittingPhone(false));
        }
      }
    }
  }, [emailOtpCode, phoneOtpCode, otpSent, authMode, isSubmittingBasic, isSubmittingPhone, basicForm, phoneForm, submitted, params, verifyOtp, dismissKeyboard]);

  return (
    <>
      <View className="flex-1 bg-background overflow-hidden relative">
        {/* Cinematic Parallax Background Depth Layer */}
        <Animated.View
          style={{
            position: 'absolute',
            top: -12,
            bottom: -12,
            left: -24,
            right: -24,
            transform: [
              { scale: bgScale },
              { translateX: bgTranslateX },
            ],
          }}
          pointerEvents="none"
        >
          <Image
            source={require('../../assets/images/auth-bg.jpg')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </Animated.View>
        <View className="absolute inset-0 bg-black/25 dark:bg-black/50" pointerEvents="none" />


        {/* Layout for Full Responsiveness with stationary locked resting state */}
        <KeyboardAwareScrollView
          ref={scrollRef}
          extraScrollHeight={56}
          enableAutoScroll={Platform.OS !== 'ios'}
          scrollEnabled={keyboardShown}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: Math.max(insets.top, 20) + 4,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          className="px-5"
        >
          <View className="max-w-sm mx-auto w-full">
            {/* Logo Emblem with Luxury Reveal & Weightless Float */}
            <Animated.View
              style={{
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { translateY: Animated.add(logoTranslateY, emblemFloat) },
                ],
                alignItems: 'center',
                justifyContent: 'center',
              }}
              pointerEvents="none"
            >
              <NahomEmblem size={106} />
            </Animated.View>

            {/* App Name: N (Orange), A (White), H (House symbol with orange window), O (Orange), M (White) */}
            <Animated.View
              style={{
                opacity: wordmarkOpacity,
                transform: [
                  { translateY: wordmarkTranslateY },
                ],
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
              }}
              pointerEvents="none"
            >
              <View
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.55)',
                  paddingHorizontal: 20,
                  paddingVertical: 6,
                  borderRadius: 24,
                  borderWidth: 1.2,
                  borderColor: 'rgba(255, 255, 255, 0.22)',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <NahomThemedTitle fontSize={28} variant="house" textColor="#FFFFFF" orangeColor="#FF7A1A" />
              </View>
            </Animated.View>

            {/* Welcome Text Section - RNText with explicit lineHeight prevents any vertical clipping */}
            <Animated.View
              style={{
                opacity: cardOpacity,
                transform: [
                  { translateY: cardTranslateY },
                ],
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 18,
                marginBottom: 16,
              }}
            >
              <RNText
                style={{
                  color: '#0F172A',
                  fontWeight: '700',
                  fontSize: 28,
                  lineHeight: 38,
                  textAlign: 'center',
                  letterSpacing: -0.4,
                  includeFontPadding: false,
                }}
              >
                {t('welcome_back', 'Welcome Back')}
              </RNText>
              <RNText
                style={{
                  color: '#FFFFFF',
                  fontWeight: '500',
                  fontSize: 15,
                  lineHeight: 22,
                  textAlign: 'center',
                  marginTop: 4,
                  includeFontPadding: false,
                  textShadowColor: 'rgba(0, 0, 0, 0.45)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {t('sign_in_to_continue', 'Sign in to continue to NAHOM')}
              </RNText>
            </Animated.View>

            {/* Sign In Card */}
            <Animated.View
              style={{
                opacity: cardOpacity,
                transform: [
                  { scale: cardScale },
                  { translateY: cardTranslateY },
                ],
              }}
              className="gap-3.5 w-full"
            >
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderWidth: 1.5,
                  borderRadius: 28,
                  padding: 22,
                  overflow: 'hidden',
                  shadowColor: '#64748B',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.1,
                  shadowRadius: 20,
                  elevation: 4,
                }}
                className="w-full gap-3.5"
              >
                {/* Context Switch Auth Requirement Banner */}
                {params.switchType && params.targetName && !switchDismissed && (
                  <View className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 gap-2.5 shadow-2xs">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="w-7 h-7 rounded-lg bg-[#FF7A1A]/20 items-center justify-center">
                          <Lock size={14} color="#FF7A1A" strokeWidth={2.4} />
                        </View>
                        <Text className="text-[13px] font-bold text-slate-900 tracking-tight">
                          {t('authentication_required', 'Authentication Required')}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => setSwitchDismissed(true)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        className="w-6 h-6 rounded-full bg-slate-200 items-center justify-center"
                        accessibilityRole="button"
                        accessibilityLabel={t('dismiss_notice', 'Dismiss notice')}
                      >
                        <X size={12} color="#475569" />
                      </TouchableOpacity>
                    </View>

                    <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-3 py-2 gap-2 shadow-2xs">
                      <View className="bg-[#FF7A1A]/25 px-2 py-0.5 rounded-md shrink-0">
                        <Text className="text-[9.5px] font-bold text-[#EA580C] uppercase">
                          {params.switchType === 'villa' ? t('unit', 'Unit') : params.switchType === 'community' ? t('community', 'Community') : t('role', 'Role')}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        className="text-xs font-bold text-slate-900 flex-1"
                      >
                        {params.targetName}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Invitation context hint banner */}
                {hasPendingInvite && (
                  <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex-row items-center gap-2.5">
                    <Sparkles size={16} color="#D97706" />
                    <Text className="text-[12.5px] font-medium text-amber-900 flex-1">
                      {t('invite_sign_in_hint', 'Sign in with the email or phone your invitation was sent to, to join your community.')}
                    </Text>
                  </View>
                )}

                {/* Email / Phone Toggle */}
                <View className="mb-1">
                  <AuthMethodSelector
                    value={authMode}
                    onChange={(mode) => { Keyboard.dismiss(); setAuthMode(mode); }}
                    emailLabel={t('email_id', 'Email ID')}
                    otpLabel={t('phone_no', 'Phone No')}
                    reduceMotion={reduceMotion}
                    disabled={isSubmittingBasic || isSubmittingPhone || googleLoading}
                  />
                </View>

                {authMode === 'basic' ? (
                  /* Email + OTP Form */
                  <View className="gap-3.5">
                    <View>
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>
                          {t('email_id', 'Email ID')} <Text style={{ color: '#FF7A1A', fontWeight: '700' }}>*</Text>
                        </Text>
                        {otpSent && (
                          <TouchableOpacity
                            onPress={handleChangeEmailOrPhone}
                            disabled={isSubmittingBasic}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF7A1A' }}>
                              {t('change', 'Change')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Controller
                        control={basicForm.control}
                        name="login"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextInput
                            required
                            value={value}
                            onChangeText={onChange}
                            onFocus={handleLoginFieldFocus}
                            onBlur={() => {
                              setIsLoginFocused(false);
                              onBlur();
                            }}
                            placeholder={t('enter_email', 'Enter your email')}
                            placeholderTextColor="#94A3B8"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            editable={!otpSent}
                            wrapperStyle={{
                              backgroundColor: '#F8FAFC',
                              borderColor: isLoginFocused ? '#FF8C1A' : '#E2E8F0',
                              borderWidth: 1.5,
                              borderRadius: 16,
                              minHeight: 52,
                            }}
                            inputClassName="text-slate-900 text-[15px] font-medium"
                            style={{ fontSize: 15, fontWeight: '500', color: '#0F172A', backgroundColor: 'transparent' }}
                            selectionColor="#FF8C1A"
                            cursorColor="#FF8C1A"
                            leftIcon={
                              <Animated.View style={{ transform: [{ scale: loginIconScale }] }}>
                                <Mail size={18} color={isLoginFocused ? '#FF8C1A' : '#94A3B8'} />
                              </Animated.View>
                            }
                            error={basicForm.formState.errors.login?.message}
                            feedbackContainerClassName="bg-red-50 border border-red-200 px-2 py-0.5 rounded-md self-start mt-1.5"
                            errorClassName="text-[11.5px] font-bold text-red-600"
                            returnKeyType={otpSent ? 'done' : 'next'}
                            blurOnSubmit={false}
                          />
                        )}
                      />
                    </View>

                    {otpSent && (
                      <View className="gap-2.5 mt-0.5">
                        <View className="flex-row items-center justify-between">
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>
                            {t('enter_verification_code', 'Enter verification code')}
                          </Text>
                          {resendCooldown > 0 ? (
                            <Text style={{ fontSize: 12, fontWeight: '500', color: '#94A3B8' }}>
                              {t('resend_in', 'Resend in')} {resendCooldown}s
                            </Text>
                          ) : (
                            <TouchableOpacity
                              onPress={handleResendOtp}
                              disabled={isSubmittingBasic}
                              activeOpacity={0.7}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF7A1A' }}>
                                {t('resend_code', 'Resend Code')}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <OtpInputField
                          length={4}
                          value={emailOtpCode}
                          onValueChange={setEmailOtpCode}
                          variant="light"
                          error={Boolean(error)}
                        />
                      </View>
                    )}

                    {/* Stay signed in Checkbox */}
                    <View className="flex-row items-center pt-0.5">
                      <Checkbox
                        checked={keepSignedIn}
                        onCheckedChange={handleKeepSignedInChange}
                        label={t('stay_signed_in', 'Stay signed in')}
                        checkedColor="#FF7A1A"
                        checkedBorderColor="#FF7A1A"
                        uncheckedBgColor="#FFFFFF"
                        uncheckedBorderColor="#CBD5E1"
                        labelStyle={{ color: '#1E293B', fontSize: 13.5, fontWeight: '500' }}
                        className="items-center"
                      />
                    </View>

                    {/* Global Error Banner */}
                    {error ? (
                      <View className="bg-red-500/15 border border-red-500/40 rounded-xl p-2.5 shadow-sm">
                        <Text className="text-red-300 text-xs text-center font-semibold">
                          {error}
                        </Text>
                      </View>
                    ) : null}

                    {/* Send OTP CTA Button */}
                    <Animated.View style={{ transform: [{ scale: buttonPressScale }] }}>
                      <TouchableOpacity
                        onPress={handleBasicSignIn}
                        disabled={isSubmittingBasic || isSubmittingPhone || googleLoading || (otpSent && emailOtpCode.length < 4)}
                        activeOpacity={0.9}
                        style={{
                          height: 56,
                          borderRadius: 30,
                          shadowColor: '#FF7A1A',
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.45,
                          shadowRadius: 16,
                          elevation: 6,
                        }}
                        className="mt-1 rounded-[30px] flex-row items-center justify-center gap-2 overflow-hidden relative"
                      >
                        <View className="absolute inset-0">
                          <Svg width="100%" height="100%" preserveAspectRatio="none">
                            <Defs>
                              <LinearGradient id="signInGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <Stop offset="0%" stopColor="#141416" />
                                <Stop offset="28%" stopColor="#222226" />
                                <Stop offset="68%" stopColor="#E6580E" />
                                <Stop offset="100%" stopColor="#FF7A1A" />
                              </LinearGradient>
                            </Defs>
                            <Rect width="100%" height="100%" rx={30} fill="url(#signInGrad)" />
                          </Svg>
                        </View>

                        {/* Subtle Light Reflection Sweep */}
                        <Animated.View
                          style={{
                            position: 'absolute',
                            top: -10,
                            bottom: -10,
                            width: 55,
                            transform: [{ translateX: buttonSweepX }, { skewX: '-24deg' }],
                            opacity: buttonSweepOpacity,
                            backgroundColor: 'rgba(255, 255, 255, 0.28)',
                          }}
                          pointerEvents="none"
                        />

                        {isSubmittingBasic ? (
                          <View className="flex-row items-center gap-2 z-10">
                            <ActivityIndicator color="#FFFFFF" size="small" />
                            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
                              {otpSent ? t('verifying_code', 'Verifying...') : t('sending_otp', 'Sending OTP Code...')}
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center justify-center gap-2.5 z-10">
                            <Send size={18} color="#FFFFFF" strokeWidth={2.4} style={{ transform: [{ rotate: '-10deg' }] }} />
                            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16.5, includeFontPadding: false }}>
                              {otpSent ? t('verify_and_sign_in', 'Verify & Sign In') : t('send_otp', 'Send OTP')}
                            </Text>
                            <Animated.View style={{ transform: [{ translateX: arrowShiftX }] }}>
                              <ArrowRight size={19} color="#FFFFFF" strokeWidth={2.5} />
                            </Animated.View>
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                ) : (
                  /* Phone OTP Form */
                  <View className="gap-3.5">
                    <View>
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>
                          {t('phone_number', 'Mobile Number')} <Text style={{ color: '#FF7A1A', fontWeight: '700' }}>*</Text>
                        </Text>
                        {otpSent && (
                          <TouchableOpacity
                            onPress={handleChangeEmailOrPhone}
                            disabled={isSubmittingPhone}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF7A1A' }}>
                              {t('change', 'Change')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Controller
                        control={phoneForm.control}
                        name="phone"
                        render={({ field: { onChange, value } }) => (
                          <PhoneInput
                            variant="form"
                            defaultCountry="IN"
                            label=""
                            placeholder="Enter your phone number"
                            placeholderTextColor="#94A3B8"
                            wrapperStyle={{
                              backgroundColor: '#F8FAFC',
                              borderColor: isPhoneFocused ? '#FF8C1A' : '#E2E8F0',
                              borderWidth: 1.5,
                              borderRadius: 16,
                              minHeight: 52,
                            }}
                            inputClassName="text-slate-900 text-[15px] font-medium"
                            codeClassName="text-slate-900 font-bold"
                            dividerClassName="border-slate-300"
                            chevronColor="#64748B"
                            showCount={false}
                            helperContainerClassName="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg self-start mt-1.5"
                            helperClassName="text-xs font-bold text-slate-800"
                            style={{ fontSize: 15, fontWeight: '500', color: '#0F172A', backgroundColor: 'transparent' }}
                            value={value}
                            onChangeText={onChange}
                            editable={!otpSent}
                            onFocus={() => setIsPhoneFocused(true)}
                            onBlur={() => setIsPhoneFocused(false)}
                            error={phoneForm.formState.errors.phone?.message}
                            feedbackContainerClassName="bg-red-50 border border-red-200 px-2 py-0.5 rounded-md self-start mt-1.5"
                            errorClassName="text-[11.5px] font-bold text-red-600"
                          />
                        )}
                      />
                    </View>

                    {otpSent && (
                      <View className="gap-2.5 mt-0.5">
                        <View className="flex-row items-center justify-between">
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>
                            {t('enter_verification_code', 'Enter verification code')}
                          </Text>
                          {resendCooldown > 0 ? (
                            <Text style={{ fontSize: 12, fontWeight: '500', color: '#94A3B8' }}>
                              {t('resend_in', 'Resend in')} {resendCooldown}s
                            </Text>
                          ) : (
                            <TouchableOpacity
                              onPress={handleResendOtp}
                              disabled={isSubmittingPhone}
                              activeOpacity={0.7}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF7A1A' }}>
                                {t('resend_code', 'Resend Code')}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <OtpInputField
                          length={4}
                          value={phoneOtpCode}
                          onValueChange={setPhoneOtpCode}
                          variant="light"
                          error={Boolean(error)}
                        />
                      </View>
                    )}

                    {/* Stay signed in Checkbox */}
                    <View className="flex-row items-center pt-0.5">
                      <Checkbox
                        checked={keepSignedIn}
                        onCheckedChange={handleKeepSignedInChange}
                        label={t('stay_signed_in', 'Stay signed in')}
                        checkedColor="#FF7A1A"
                        checkedBorderColor="#FF7A1A"
                        uncheckedBgColor="#FFFFFF"
                        uncheckedBorderColor="#CBD5E1"
                        labelStyle={{ color: '#1E293B', fontSize: 13.5, fontWeight: '500' }}
                        className="items-center"
                      />
                    </View>

                    {/* Global Error Banner */}
                    {error ? (
                      <View className="bg-red-500/15 border border-red-500/40 rounded-xl p-2.5 shadow-sm">
                        <Text className="text-red-300 text-xs text-center font-semibold">
                          {error}
                        </Text>
                      </View>
                    ) : null}

                    {/* Sign in with OTP Button */}
                    <Animated.View style={{ transform: [{ scale: buttonPressScale }] }}>
                      <TouchableOpacity
                        onPress={handlePhoneSignIn}
                        disabled={isSubmittingBasic || isSubmittingPhone || googleLoading || (otpSent && phoneOtpCode.length < 4)}
                        activeOpacity={0.9}
                        style={{
                          height: 56,
                          borderRadius: 30,
                          shadowColor: '#FF7A1A',
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.45,
                          shadowRadius: 16,
                          elevation: 6,
                        }}
                        className="mt-1 rounded-[30px] flex-row items-center justify-center gap-2 overflow-hidden relative"
                      >
                        <View className="absolute inset-0">
                          <Svg width="100%" height="100%" preserveAspectRatio="none">
                            <Defs>
                              <LinearGradient id="otpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <Stop offset="0%" stopColor="#141416" />
                                <Stop offset="28%" stopColor="#222226" />
                                <Stop offset="68%" stopColor="#E6580E" />
                                <Stop offset="100%" stopColor="#FF7A1A" />
                              </LinearGradient>
                            </Defs>
                            <Rect width="100%" height="100%" rx={30} fill="url(#otpGrad)" />
                          </Svg>
                        </View>

                        {/* Subtle Light Reflection Sweep */}
                        <Animated.View
                          style={{
                            position: 'absolute',
                            top: -10,
                            bottom: -10,
                            width: 55,
                            transform: [{ translateX: buttonSweepX }, { skewX: '-24deg' }],
                            opacity: buttonSweepOpacity,
                            backgroundColor: 'rgba(255, 255, 255, 0.28)',
                          }}
                          pointerEvents="none"
                        />

                        {isSubmittingPhone ? (
                          <View className="flex-row items-center gap-2 z-10">
                            <ActivityIndicator color="#FFFFFF" size="small" />
                            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
                              {otpSent ? t('verifying_code', 'Verifying...') : t('sending_otp', 'Sending OTP Code...')}
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center justify-center gap-2.5 z-10">
                            <Send size={18} color="#FFFFFF" strokeWidth={2.4} style={{ transform: [{ rotate: '-10deg' }] }} />
                            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16.5, includeFontPadding: false }}>
                              {otpSent ? t('verify_and_sign_in', 'Verify & Sign In') : t('send_otp', 'Send OTP')}
                            </Text>
                            <Animated.View style={{ transform: [{ translateX: arrowShiftX }] }}>
                              <ArrowRight size={19} color="#FFFFFF" strokeWidth={2.5} />
                            </Animated.View>
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                )}
              </View>

              {/* OR CONTINUE WITH Divider */}
              <View className="flex-row items-center my-4 gap-3">
                <View className="flex-1 h-[1px] bg-white/40" />
                <Text
                  className="text-[11px] font-bold tracking-widest uppercase font-sans"
                  style={{
                    color: '#FFFFFF',
                    textShadowColor: 'rgba(0, 0, 0, 0.75)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }}
                >
                  {t('or_continue_with', 'Or Continue With')}
                </Text>
                <View className="flex-1 h-[1px] bg-white/40" />
              </View>

              {/* Social Authentication: Google ID & Apple ID */}
              <View className="flex-row items-center gap-3.5 w-full">
                <SocialAuthButton
                  provider="google"
                  variant="compact"
                  onPress={handleGoogleSignIn}
                  loading={googleLoading}
                  disabled={isSubmittingBasic || isSubmittingPhone}
                />
                <AppleSignInButton
                  variant="compact"
                  disabled={isSubmittingBasic || isSubmittingPhone || googleLoading}
                />
              </View>

              {/* Bottom Tagline: Display only Connect Harmony with subtle orange decorative lines */}
              <View
                className="w-full items-center justify-center mt-5 mb-2"
              >
                <View
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    paddingHorizontal: 20,
                    paddingVertical: 7,
                    borderRadius: 22,
                    borderWidth: 1.2,
                    borderColor: 'rgba(255, 255, 255, 0.20)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 5,
                  }}
                >
                  <View style={{ height: 2, width: 22, backgroundColor: '#FF7A1A', borderRadius: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <RNText
                      style={{
                        color: '#FF7A1A',
                        fontSize: 15,
                        lineHeight: 20,
                        fontWeight: '700',
                        letterSpacing: 0.5,
                        includeFontPadding: false,
                        textShadowColor: 'rgba(0, 0, 0, 0.8)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                      }}
                    >
                      Connect
                    </RNText>
                    <RNText
                      style={{
                        color: '#FFFFFF',
                        fontSize: 15,
                        lineHeight: 20,
                        fontWeight: '700',
                        letterSpacing: 0.5,
                        includeFontPadding: false,
                        textShadowColor: 'rgba(0, 0, 0, 0.8)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                      }}
                    >
                      {' '}Harmony
                    </RNText>
                  </View>
                  <View style={{ height: 2, width: 22, backgroundColor: '#FF7A1A', borderRadius: 1 }} />
                </View>
              </View>

            </Animated.View>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </>
  );
}

// Utility helper for classnames
function cnText(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
