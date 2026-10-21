import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { useTranslation } from '@/src/utils/i18n';
import { ShieldAlert, ChevronRight, Radio, Flame, HeartPulse } from 'lucide-react-native';
import { useEmergencySos } from '../hooks/useEmergencySos';

interface EmergencySosCardProps {
  unitNumber?: string;
  onPressOpen?: () => void;
  className?: string;
}

export const EmergencySosCard: React.FC<EmergencySosCardProps> = ({
  unitNumber,
  onPressOpen,
  className,
}) => {
  const { t } = useTranslation();
  const { activeAlert, openModal } = useEmergencySos();

  const handlePress = () => {
    if (onPressOpen) {
      onPressOpen();
    } else {
      openModal();
    }
  };

  const isActive = Boolean(activeAlert);

  return (
    <SettingsCard
      title={t('safety_emergency_group', 'Safety & Emergency Protection')}
      containerClassName={className}
    >
      <Pressable
        onPress={handlePress}
        className={`p-4 flex-row items-center justify-between ${
          isActive
            ? 'bg-destructive/15 border-2 border-destructive/60'
            : 'bg-card active:bg-muted/40'
        }`}
        accessibilityRole="button"
        accessibilityLabel={t('emergency_sos_title', 'Emergency SOS Panic Button')}
      >
        <View className="flex-row items-center flex-1 me-3">
          <View
            className={`h-11 w-11 rounded-full items-center justify-center me-3.5 shrink-0 ${
              isActive
                ? 'bg-destructive/25 border border-destructive/50'
                : 'bg-destructive/10 border border-destructive/20'
            }`}
          >
            {isActive ? (
              <Radio size={22} className="text-destructive animate-pulse" color="#ef4444" />
            ) : (
              <ShieldAlert size={22} color="#ef4444" />
            )}
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-extrabold text-foreground font-sans tracking-tight">
                {t('emergency_sos_button', 'Emergency SOS Panic')}
              </Text>
              {isActive ? (
                <StatusBadge variant="danger" label={activeAlert?.status || 'ACTIVE'} dot={true} />
              ) : (
                <View className="px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20">
                  <Text className="text-[10px] font-black text-destructive font-sans">1-TAP</Text>
                </View>
              )}
            </View>

            <Text className="text-xs text-muted-foreground font-sans mt-0.5">
              {isActive
                ? `${t('sos_alert_dispatched', 'Alert dispatched for')} ${activeAlert?.alertType} (${activeAlert?.unitNumber || unitNumber || 'Unit'})`
                : t('sos_card_sublabel', 'Fire, Medical & Security alarm to guardhouse')}
            </Text>
          </View>
        </View>

        <ChevronRight size={18} className="text-muted-foreground shrink-0" />
      </Pressable>
    </SettingsCard>
  );
};

export default EmergencySosCard;
