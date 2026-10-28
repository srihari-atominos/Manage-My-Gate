import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { VoiceAssistantStatus } from '../store/voiceAssistantSlice';

interface VoiceWaveformProps {
  status: VoiceAssistantStatus;
  barCount?: number;
  testID?: string;
}

const WaveformBar: React.FC<{
  index: number;
  status: VoiceAssistantStatus;
  reducedMotion: boolean;
}> = ({ index, status, reducedMotion }) => {
  const scale = useSharedValue(0.3);

  const isActive =
    status === 'listening' ||
    status === 'speaking' ||
    status === 'transcribing' ||
    status === 'processing';
  const isSpeaking = status === 'speaking';

  useEffect(() => {
    if (reducedMotion || !isActive) {
      scale.value = withTiming(0.3, { duration: 250 });
      return;
    }

    const duration = isSpeaking ? 300 + (index % 3) * 120 : 600 + (index % 4) * 150;
    const targetScale = isSpeaking ? 0.95 : 0.65;

    scale.value = withRepeat(
      withSequence(
        withTiming(targetScale, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [isActive, isSpeaking, reducedMotion, index, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scaleY: scale.value }],
    };
  });

  const getBarColorHex = () => {
    if (status === 'error' || status === 'permission_denied') return '#f43f5e';
    if (status === 'muted') return '#94a3b8';
    if (status === 'speaking') return '#6366f1';
    if (status === 'listening') return '#10b981';
    if (status === 'transcribing' || status === 'processing' || status === 'thinking') return '#eab308';
    if (status === 'awaiting_confirmation') return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <Animated.View
      style={[
        {
          width: 6,
          height: 44,
          borderRadius: 999,
          marginHorizontal: 4,
          backgroundColor: getBarColorHex(),
        },
        animatedStyle,
      ]}
    />
  );
};

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  status,
  barCount = 7,
  testID,
}) => {
  const reducedMotion = useReducedMotion();

  return (
    <View
      testID={testID}
      className="flex-row items-center justify-center h-16 py-2"
      accessibilityRole="image"
      accessibilityLabel={`Voice audio visualization, status is ${status}`}
    >
      {Array.from({ length: barCount }).map((_, idx) => (
        <WaveformBar
          key={idx}
          index={idx}
          status={status}
          reducedMotion={Boolean(reducedMotion)}
        />
      ))}
    </View>
  );
};

export default VoiceWaveform;
