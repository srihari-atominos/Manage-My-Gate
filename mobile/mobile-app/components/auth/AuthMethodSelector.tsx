import * as React from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import { Mail, Phone } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

type AuthMode = 'basic' | 'phone';

export function AuthMethodSelector({ value, onChange, emailLabel, otpLabel, reduceMotion, disabled = false }: {
  value: AuthMode;
  onChange: (value: AuthMode) => void;
  emailLabel: string;
  otpLabel: string;
  reduceMotion: boolean;
  disabled?: boolean;
}) {
  const [width, setWidth] = React.useState(0);
  const position = React.useRef(new Animated.Value(value === 'basic' ? 0 : 1)).current;
  const segmentWidth = Math.max(0, (width - 8) / 2);
  const animateTo = React.useCallback((mode: AuthMode) => {
    Animated.spring(position, {
      toValue: mode === 'basic' ? 0 : 1,
      stiffness: 260,
      damping: 28,
      mass: 1,
      useNativeDriver: true,
      ...(reduceMotion ? { overshootClamping: true } : {}),
    }).start();
  }, [position, reduceMotion]);

  React.useEffect(() => {
    if (reduceMotion) position.setValue(value === 'basic' ? 0 : 1);
    else animateTo(value);
  }, [value, reduceMotion, position, animateTo]);

  const responder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !disabled && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => {
      if (segmentWidth) position.setValue(Math.max(0, Math.min(1, (value === 'basic' ? 0 : 1) + gesture.dx / segmentWidth)));
    },
    onPanResponderRelease: (_, gesture) => {
      const next = gesture.dx > 20 ? 'phone' : gesture.dx < -20 ? 'basic' : value;
      onChange(next);
      if (reduceMotion) position.setValue(next === 'basic' ? 0 : 1);
      else animateTo(next);
    },
    onPanResponderTerminate: () => {
      if (reduceMotion) position.setValue(value === 'basic' ? 0 : 1);
      else animateTo(value);
    },
  }), [disabled, segmentWidth, value, position, onChange, animateTo, reduceMotion]);

  return (
    <View
      {...responder.panHandlers}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: 28,
        backgroundColor: '#F1F5F9',
        borderWidth: 1.2,
        borderColor: '#E2E8F0',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 4,
          top: 4,
          bottom: 4,
          width: segmentWidth,
          borderRadius: 28,
          overflow: 'hidden',
          shadowColor: '#FF7A1A',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 4,
          transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, segmentWidth] }) }],
        }}
      >
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="toggleActiveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#1E293B" />
              <Stop offset="30%" stopColor="#334155" />
              <Stop offset="75%" stopColor="#EA580C" />
              <Stop offset="100%" stopColor="#FF7A1A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={28} fill="url(#toggleActiveGrad)" />
        </Svg>
      </Animated.View>

      {(['basic', 'phone'] as const).map((mode) => {
        const isSelected = value === mode;
        const textColor = isSelected ? '#FFFFFF' : '#475569';
        const iconColor = isSelected ? '#FFFFFF' : '#64748B';

        return (
          <Pressable
            key={mode}
            disabled={disabled}
            onPress={() => onChange(mode)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected, disabled }}
            accessibilityLabel={mode === 'basic' ? emailLabel : otpLabel}
            style={{
              flex: 1,
              minHeight: 46,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
              borderRadius: 28,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minWidth: 0 }}>
              {mode === 'basic' ? (
                <Mail size={16} color={iconColor} strokeWidth={2.2} />
              ) : (
                <Phone size={16} color={iconColor} strokeWidth={2.2} />
              )}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{
                  color: textColor,
                  fontSize: 13.5,
                  fontWeight: isSelected ? '700' : '500',
                  textAlign: 'center',
                  flexShrink: 1,
                }}
              >
                {mode === 'basic' ? emailLabel : otpLabel}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
