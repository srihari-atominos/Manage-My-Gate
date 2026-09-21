import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { QrCode, ChevronRight, User as UserIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/src/utils/i18n';

export interface SettingsProfileBlockProps {
  name: string;
  roleLabel?: string;
  unitId?: string;
  avatarUrl?: string | null;
  avatarLetter?: string;
  onPressProfile?: () => void;
  onPressQr?: () => void;
  className?: string;
}

export const SettingsProfileBlock: React.FC<SettingsProfileBlockProps> = ({
  name,
  roleLabel,
  unitId,
  avatarUrl,
  avatarLetter = 'U',
  onPressProfile,
  onPressQr,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <View
      className={cn(
        'mx-4 mt-3.5 bg-card rounded-2xl border border-border p-4 shadow-xs',
        className
      )}
    >
      <View className="flex-row items-center gap-3.5">
        {/* User Info Main Tap Area */}
        <Pressable
          onPress={onPressProfile}
          className="flex-1 flex-row items-center gap-3.5 min-w-0 active:opacity-75"
          accessibilityRole="button"
          accessibilityLabel={`Profile, ${name}`}
        >
          {/* Large Circular Avatar */}
          <View className="h-14 w-14 rounded-full bg-primary/15 border-2 border-primary/30 items-center justify-center overflow-hidden shrink-0">
            {avatarUrl && avatarUrl.trim() ? (
              <Image source={{ uri: avatarUrl }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <Text className="text-primary font-black text-xl font-sans">
                {avatarLetter.toUpperCase()}
              </Text>
            )}
          </View>

          {/* User Info */}
          <View className="flex-1 min-w-0">
            <Text className="text-base font-bold text-foreground font-sans tracking-tight" numberOfLines={1}>
              {name}
            </Text>
            <View className="flex-row items-center gap-2 mt-1 flex-wrap">
              {unitId ? (
                <View className="bg-primary/15 px-2.5 py-0.5 rounded-full border border-primary/25">
                  <Text className="text-[11px] font-bold text-primary font-sans">
                    {unitId}
                  </Text>
                </View>
              ) : null}
              {roleLabel ? (
                <Text className="text-xs text-muted-foreground font-medium font-sans" numberOfLines={1}>
                  {roleLabel}
                </Text>
              ) : null}
            </View>
          </View>
        </Pressable>

        {/* QR Button & Chevron */}
        <View className="flex-row items-center gap-1.5 shrink-0">
          {onPressQr ? (
            <Pressable
              onPress={onPressQr}
              className="p-2 rounded-xl bg-secondary border border-border/80 active:bg-muted/60"
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('quick_qr_pass', 'Quick Pass QR')}
            >
              <Icon as={QrCode} size={18} className="text-foreground" />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onPressProfile}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Open ${name} settings`}
            className="p-1 active:opacity-60"
          >
            <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default SettingsProfileBlock;
