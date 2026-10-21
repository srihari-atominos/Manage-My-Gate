import React, { useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SheetGrabHandle } from '@/components/ui/SheetGrabHandle';
import { useTranslation } from '@/src/utils/i18n';
import {
  Flame,
  HeartPulse,
  ShieldAlert,
  AlertTriangle,
  X,
  MapPin,
  Clock,
  Radio,
  CheckCircle2,
  PhoneCall,
} from 'lucide-react-native';
import { SosAlertType } from '../types/emergencySos.types';
import { useEmergencySos } from '../hooks/useEmergencySos';

interface EmergencySosModalProps {
  visible: boolean;
  onClose: () => void;
  unitNumber?: string;
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  visible,
  onClose,
  unitNumber,
}) => {
  const { t } = useTranslation();
  const {
    activeAlert,
    isTriggering,
    isLoading,
    triggerSos,
    cancelSos,
    locationCoords,
  } = useEmergencySos();

  const [selectedType, setSelectedType] = useState<SosAlertType | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const displayUnit = activeAlert?.unitNumber || unitNumber || 'My Villa / Unit';

  const handleTrigger = async (type: SosAlertType) => {
    setSelectedType(type);
    const result: any = await triggerSos(type);
    if (result?.error) {
      const msg = result.error.message || t('sos_error', 'Failed to dispatch emergency alert.');
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert(t('error', 'Error'), msg);
      }
    }
  };

  const handleCancelAlert = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        t('confirm_cancel_sos', 'Are you sure you want to cancel this emergency alert?')
      );
      if (confirmed) {
        cancelSos();
      }
    } else {
      Alert.alert(
        t('cancel_emergency_alert', 'Cancel Emergency Alert?'),
        t('confirm_cancel_sos', 'Are you sure you want to cancel this emergency alert?'),
        [
          { text: t('no', 'No'), style: 'cancel' },
          {
            text: t('yes_cancel_sos', 'Yes, Cancel Alert'),
            style: 'destructive',
            onPress: () => cancelSos(),
          },
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-card rounded-t-3xl border-t border-border overflow-hidden max-h-[92%] shadow-2xl">
          {/* Grab Handle */}
          <View className="items-center pt-2">
            <SheetGrabHandle onClose={onClose} />
          </View>

          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-border/60">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 rounded-full bg-destructive/15 border border-destructive/30 items-center justify-center">
                <ShieldAlert size={20} className="text-destructive" color="#ef4444" />
              </View>
              <View>
                <Text className="text-lg font-black text-foreground tracking-tight font-sans">
                  {t('emergency_sos_title', 'Emergency SOS Panic')}
                </Text>
                <Text className="text-xs text-muted-foreground font-sans">
                  {t('sos_subtitle', '1-Tap Resident Distress Dispatch')}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="p-2 rounded-full active:bg-muted/60"
              accessibilityRole="button"
              accessibilityLabel={t('close', 'Close')}
            >
              <X size={20} className="text-muted-foreground" />
            </Pressable>
          </View>

          <ScrollView
            className="p-5"
            contentContainerClassName="gap-4 pb-12"
            showsVerticalScrollIndicator={false}
          >
            {/* If Active Alert exists */}
            {activeAlert ? (
              <View className="rounded-2xl border-2 border-destructive bg-destructive/10 p-4 gap-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Radio size={20} className="text-destructive animate-pulse" color="#ef4444" />
                    <Text className="text-base font-black text-destructive uppercase tracking-wider font-sans">
                      {t('sos_active_siren', 'ACTIVE EMERGENCY ALERT')}
                    </Text>
                  </View>
                  <StatusBadge
                    variant={activeAlert.status === 'ACKNOWLEDGED' ? 'warning' : 'danger'}
                    label={activeAlert.status}
                    dot={true}
                  />
                </View>

                <Text className="text-sm font-semibold text-foreground font-sans">
                  {t('alert_broadcast_to_guards', 'Gate guards & security response team alerted.')}
                </Text>

                <View className="bg-card/80 rounded-xl p-3 border border-border/80 gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground font-sans">{t('unit_villa', 'Unit / Villa')}:</Text>
                    <Text className="text-xs font-bold text-foreground font-sans">{displayUnit}</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground font-sans">{t('emergency_type', 'Emergency Type')}:</Text>
                    <Text className="text-xs font-bold text-destructive font-sans">{activeAlert.alertType}</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground font-sans">{t('reported_time', 'Reported Time')}:</Text>
                    <Text className="text-xs font-medium text-foreground font-sans">
                      {new Date(activeAlert.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                  {activeAlert.acknowledgedAt && (
                    <View className="flex-row items-center justify-between pt-1 border-t border-border/40">
                      <Text className="text-xs text-emerald-600 font-sans font-semibold">
                        {t('guard_acknowledged', 'Security Acknowledged')}:
                      </Text>
                      <Text className="text-xs font-bold text-emerald-600 font-sans">
                        {new Date(activeAlert.acknowledgedAt).toLocaleTimeString()}
                      </Text>
                    </View>
                  )}
                </View>

                <Button
                  variant="outline"
                  onPress={handleCancelAlert}
                  disabled={isLoading}
                  className="w-full border-destructive/40 bg-card active:bg-destructive/10"
                >
                  <Text className="text-sm font-bold text-destructive font-sans">
                    {t('cancel_sos_button', 'Cancel Alert (False Alarm)')}
                  </Text>
                </Button>
              </View>
            ) : (
              <>
                {/* Location & Villa Verification Pill */}
                <View className="bg-muted/50 rounded-xl p-3 border border-border/60 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <MapPin size={16} className="text-primary" color="#3b82f6" />
                    <Text className="text-xs font-bold text-foreground font-sans">
                      {t('dispatch_location', 'Dispatch Target')}: {displayUnit}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-muted-foreground font-sans">
                    {locationCoords.latitude ? t('gps_active', 'GPS Linked') : t('villa_pin', 'Villa Pin')}
                  </Text>
                </View>

                {/* Instructions */}
                <Text className="text-xs font-medium text-muted-foreground font-sans leading-relaxed">
                  {t(
                    'sos_instruction_text',
                    'Tap any category below to immediately alert gate guards, trigger loud guardhouse alarm, and transmit your villa location to on-duty security officers.'
                  )}
                </Text>

                {/* 1-Tap Trigger Grid */}
                <View className="gap-3">
                  {/* 1. Fire Emergency */}
                  <Pressable
                    onPress={() => handleTrigger('Fire')}
                    disabled={isTriggering}
                    className="flex-row items-center p-4 rounded-2xl bg-orange-500/10 border-2 border-orange-500/40 active:bg-orange-500/20"
                    accessibilityRole="button"
                    accessibilityLabel={t('fire_emergency', 'Fire Emergency')}
                  >
                    <View className="h-12 w-12 rounded-xl bg-orange-500/20 border border-orange-500/30 items-center justify-center me-3.5">
                      <Flame size={26} color="#f97316" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-extrabold text-foreground font-sans tracking-tight">
                        {t('fire_emergency', 'Fire Emergency')}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                        {t('fire_desc', 'Smoke, gas leak, active fire at unit')}
                      </Text>
                    </View>
                    <View className="px-2.5 py-1 rounded-full bg-orange-500/20">
                      <Text className="text-[11px] font-black text-orange-600 uppercase font-sans">
                        {t('one_tap', '1-TAP')}
                      </Text>
                    </View>
                  </Pressable>

                  {/* 2. Medical Emergency */}
                  <Pressable
                    onPress={() => handleTrigger('Medical')}
                    disabled={isTriggering}
                    className="flex-row items-center p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 active:bg-rose-500/20"
                    accessibilityRole="button"
                    accessibilityLabel={t('medical_emergency', 'Medical Emergency')}
                  >
                    <View className="h-12 w-12 rounded-xl bg-rose-500/20 border border-rose-500/30 items-center justify-center me-3.5">
                      <HeartPulse size={26} color="#f43f5e" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-extrabold text-foreground font-sans tracking-tight">
                        {t('medical_emergency', 'Medical Emergency')}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                        {t('medical_desc', 'Ambulance, cardiac, sudden trauma / injury')}
                      </Text>
                    </View>
                    <View className="px-2.5 py-1 rounded-full bg-rose-500/20">
                      <Text className="text-[11px] font-black text-rose-600 uppercase font-sans">
                        {t('one_tap', '1-TAP')}
                      </Text>
                    </View>
                  </Pressable>

                  {/* 3. Security Threat / Intrusion */}
                  <Pressable
                    onPress={() => handleTrigger('Security')}
                    disabled={isTriggering}
                    className="flex-row items-center p-4 rounded-2xl bg-destructive/10 border-2 border-destructive/40 active:bg-destructive/20"
                    accessibilityRole="button"
                    accessibilityLabel={t('security_threat', 'Security Threat')}
                  >
                    <View className="h-12 w-12 rounded-xl bg-destructive/20 border border-destructive/30 items-center justify-center me-3.5">
                      <ShieldAlert size={26} color="#ef4444" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-extrabold text-foreground font-sans tracking-tight">
                        {t('security_threat', 'Security Intrusion')}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                        {t('security_desc', 'Trespasser, theft, violent threat, distress')}
                      </Text>
                    </View>
                    <View className="px-2.5 py-1 rounded-full bg-destructive/20">
                      <Text className="text-[11px] font-black text-destructive uppercase font-sans">
                        {t('one_tap', '1-TAP')}
                      </Text>
                    </View>
                  </Pressable>

                  {/* 4. General Distress */}
                  <Pressable
                    onPress={() => handleTrigger('General')}
                    disabled={isTriggering}
                    className="flex-row items-center p-4 rounded-2xl bg-muted/60 border border-border active:bg-muted"
                    accessibilityRole="button"
                    accessibilityLabel={t('general_emergency', 'General Emergency')}
                  >
                    <View className="h-12 w-12 rounded-xl bg-muted border border-border items-center justify-center me-3.5">
                      <AlertTriangle size={24} className="text-muted-foreground" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-extrabold text-foreground font-sans tracking-tight">
                        {t('general_emergency', 'Other Urgent Crisis')}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                        {t('general_desc', 'Elevator trap, flood, electrical hazard')}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </>
            )}

            {isTriggering && (
              <View className="items-center py-2 flex-row justify-center gap-2">
                <ActivityIndicator size="small" color="#ef4444" />
                <Text className="text-xs font-bold text-destructive font-sans">
                  {t('broadcasting_siren', 'Broadcasting alarm to guardhouse...')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default EmergencySosModal;
