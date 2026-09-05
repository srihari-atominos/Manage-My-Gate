import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Zap, ZapOff } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export type FlashMode = 'off' | 'on';

export interface FlashlightToggleProps {
  mode?: FlashMode;
  isOn?: boolean;
  onModeChange?: (mode: FlashMode) => void;
  onToggle?: () => void;
  variant?: 'segmented' | 'compact-pill' | 'button';
  className?: string;
}

export const FlashlightToggle = ({
  mode,
  isOn,
  onModeChange,
  onToggle,
  variant = 'segmented',
  className,
}: FlashlightToggleProps) => {
  // Derive active mode (support legacy isOn prop if mode not provided)
  const currentMode: FlashMode = mode !== undefined ? mode : isOn ? 'on' : 'off';

  const handleSelectMode = (newMode: FlashMode) => {
    if (onModeChange) {
      onModeChange(newMode);
    } else if (onToggle) {
      onToggle();
    }
  };

  const handleCycleNext = () => {
    const next: FlashMode = currentMode === 'on' ? 'off' : 'on';
    if (onModeChange) {
      onModeChange(next);
    } else if (onToggle) {
      onToggle();
    }
  };

  // 1. Segmented Control [ OFF | ON ]
  if (variant === 'segmented') {
    return (
      <View
        className={cn(
          'flex-row items-center bg-black/80 dark:bg-black/90 p-1 rounded-full border border-white/20 shadow-lg',
          className
        )}
      >
        {/* OFF */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelectMode('off')}
          className={cn(
            'flex-row items-center gap-1.5 px-3 py-1.5 rounded-full',
            currentMode === 'off' ? 'bg-slate-700 shadow-sm' : 'opacity-70'
          )}
        >
          <ZapOff size={13} color={currentMode === 'off' ? '#ffffff' : '#94a3b8'} />
          <Text
            className={cn(
              'text-[11px] font-bold tracking-wider',
              currentMode === 'off' ? 'text-white' : 'text-slate-400'
            )}
          >
            OFF
          </Text>
        </TouchableOpacity>

        {/* ON */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelectMode('on')}
          className={cn(
            'flex-row items-center gap-1.5 px-3 py-1.5 rounded-full',
            currentMode === 'on' ? 'bg-amber-400 shadow-sm' : 'opacity-70'
          )}
        >
          <Zap
            size={13}
            color={currentMode === 'on' ? '#000000' : '#94a3b8'}
            fill={currentMode === 'on' ? '#000000' : 'transparent'}
          />
          <Text
            className={cn(
              'text-[11px] font-extrabold tracking-wider',
              currentMode === 'on' ? 'text-black' : 'text-slate-400'
            )}
          >
            ON
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Compact cycling pill button
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleCycleNext}
      className={cn(
        'flex-row items-center justify-center rounded-full px-3.5 py-1.5 border shadow-md',
        currentMode === 'on'
          ? 'border-amber-300 bg-amber-400 shadow-amber-500/30'
          : 'border-white/25 bg-black/75 shadow-black/40',
        className
      )}
    >
      <View
        className={cn(
          'mr-1.5 h-5 w-5 items-center justify-center rounded-full',
          currentMode === 'on' ? 'bg-black/15' : 'bg-white/10'
        )}
      >
        {currentMode === 'on' ? (
          <Zap size={12} color="#000000" fill="#000000" />
        ) : (
          <ZapOff size={12} color="#ffffff" />
        )}
      </View>
      <Text
        className={cn(
          'text-[10px] font-black tracking-wider uppercase',
          currentMode === 'on' ? 'text-black' : 'text-white'
        )}
      >
        Flash: {currentMode}
      </Text>
    </TouchableOpacity>
  );
};

export default FlashlightToggle;
