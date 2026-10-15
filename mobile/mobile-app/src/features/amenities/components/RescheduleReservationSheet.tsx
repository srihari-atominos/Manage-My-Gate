import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';
import { ScheduleDateNavigator } from './ScheduleDateNavigator';
import { amenityManagementService, ApiDailySlot } from '../services/amenityManagementService';
import { AmenityReservation } from '../types/amenityDomain.types';
import { formatUtcToLocalDisplay, formatTo12Hour } from '../utils/amenityStateHelpers';

interface RescheduleReservationSheetProps {
  visible: boolean;
  reservation: AmenityReservation | null;
  onClose: () => void;
  /** Called after the booking was moved, so the screen can refresh it. */
  onRescheduled: () => void;
}

const errorText = (err: any, fallback: string) =>
  (typeof err === 'string' && err) || err?.response?.data?.message || err?.message || fallback;

/**
 * "Change time": the resident picks another slot of the SAME length on the same facility. The server keeps the
 * price and the household quota consistent, so this sheet only offers slots that can actually be swapped in.
 */
export function RescheduleReservationSheet({ visible, reservation, onClose, onRescheduled }: RescheduleReservationSheetProps) {
  const { t } = useTranslation();
  const tz = reservation?.facilityTimezone || 'Asia/Kolkata';
  const rawStart = (reservation as any)?.requestedStartDateTime || reservation?.startDateTime;
  const rawEnd = (reservation as any)?.requestedEndDateTime || reservation?.endDateTime;

  const durationMs = useMemo(() => {
    const ms = new Date(rawEnd || 0).getTime() - new Date(rawStart || 0).getTime();
    return Number.isFinite(ms) && ms > 0 ? ms : 0;
  }, [rawStart, rawEnd]);

  const currentDisplay = useMemo(() => formatUtcToLocalDisplay(rawStart, tz), [rawStart, tz]);
  const currentEndDisplay = useMemo(() => formatUtcToLocalDisplay(rawEnd, tz), [rawEnd, tz]);

  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<ApiDailySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState<ApiDailySlot | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open: start on the booking's own day and ask the server whether this booking may be moved.
  useEffect(() => {
    if (!visible || !reservation) return;
    setDate(currentDisplay.dateStr || '');
    setSelected(null);
    setError(null);
    setBlockReason(null);
    let active = true;
    setChecking(true);
    amenityManagementService
      .getCancellationPreview(reservation._id)
      .then((res: any) => {
        const reschedule = res?.data?.reschedule;
        if (active && reschedule && reschedule.allowed === false) setBlockReason(reschedule.blockReason || null);
      })
      .catch(() => undefined)
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [visible, reservation?._id]);

  const loadSlots = useCallback(async () => {
    if (!visible || !reservation || !date) return;
    setLoadingSlots(true);
    setSelected(null);
    try {
      const res: any = await amenityManagementService.getDailySlots({
        facilityId: String(reservation.facilityId),
        date,
        resourceId: reservation.resourceId ? String(reservation.resourceId) : undefined,
        headcount: reservation.headcount || 1,
        quantity: reservation.quantity || 1,
      });
      setSlots(res?.data?.slots || []);
    } catch (err) {
      setSlots([]);
      setError(errorText(err, t('amenity_reschedule_slots_failed', 'Could not load the available times.')));
    } finally {
      setLoadingSlots(false);
    }
  }, [visible, reservation?._id, date]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Only same-length windows other than the current one can replace this booking.
  const options = useMemo(
    () =>
      slots.filter((s) => {
        const length = new Date(s.endUtc).getTime() - new Date(s.startUtc).getTime();
        return length === durationMs && new Date(s.startUtc).getTime() !== new Date(rawStart || 0).getTime();
      }),
    [slots, durationMs, rawStart]
  );

  const handleConfirm = async () => {
    if (!reservation || !selected || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await amenityManagementService.rescheduleReservation(reservation._id, {
        newStartDateTime: selected.startUtc,
        newEndDateTime: selected.endUtc,
      });
      onRescheduled();
      onClose();
    } catch (err) {
      setError(errorText(err, t('amenity_reschedule_failed', 'Could not move the booking. Please try again.')));
    } finally {
      setSubmitting(false);
    }
  };

  if (!reservation) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('amenity_change_time', 'Change time')}>
      <View className="px-4 pb-8 gap-4">
        <View className="bg-muted/40 border border-border/60 rounded-2xl p-3">
          <Text className="text-[11px] font-bold text-muted-foreground uppercase">
            {t('amenity_current_booking', 'Current booking')}
          </Text>
          <Text className="text-sm font-semibold text-foreground mt-0.5">
            {currentDisplay.humanDate || currentDisplay.dateStr} · {formatTo12Hour(currentDisplay.timeStr)} -{' '}
            {formatTo12Hour(currentEndDisplay.timeStr)}
          </Text>
          <Text className="text-[11px] text-muted-foreground mt-1">
            {t('amenity_reschedule_rule', 'The new time must be the same length. The price and your payment stay the same.')}
          </Text>
        </View>

        {checking ? (
          <ActivityIndicator />
        ) : blockReason ? (
          <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3">
            <Text className="text-xs font-semibold text-amber-900 dark:text-amber-200">{blockReason}</Text>
          </View>
        ) : (
          <>
            <ScheduleDateNavigator selectedDate={date} onDateChange={setDate} title={t('amenity_new_date', 'New date')} />

            <View>
              <Text className="text-xs font-bold text-foreground uppercase mb-2">
                {t('amenity_available_times', 'Available times')}
              </Text>
              {loadingSlots ? (
                <ActivityIndicator />
              ) : options.length === 0 ? (
                <View className="p-4 bg-muted/30 rounded-2xl items-center">
                  <Clock size={20} className="text-muted-foreground/60 mb-1" />
                  <Text className="text-xs text-muted-foreground text-center">
                    {t('amenity_reschedule_none', 'No other time of the same length is free on this day. Try another date.')}
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {options.map((slot) => {
                    const isSelected = selected?.startUtc === slot.startUtc;
                    return (
                      <Pressable
                        key={slot.startUtc}
                        onPress={() => setSelected(slot)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        className={`px-3.5 py-2.5 rounded-xl border ${
                          isSelected ? 'bg-primary border-primary' : 'bg-card border-border'
                        }`}
                      >
                        <Text className={`text-xs font-semibold ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                          {slot.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {error ? <Text className="text-xs font-semibold text-destructive">{error}</Text> : null}

        {!blockReason ? (
          <Button variant="default" onPress={handleConfirm} loading={submitting} disabled={!selected || submitting}>
            {t('amenity_confirm_new_time', 'Move my booking')}
          </Button>
        ) : null}
      </View>
    </BottomSheet>
  );
}

export default RescheduleReservationSheet;
