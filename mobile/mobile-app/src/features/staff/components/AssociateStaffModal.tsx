import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  AuthorizedUnit,
  EligibleStaff,
  CreateStaffAssociationPayload,
  staffService,
} from '../services/staffService';
import { UsersRound, Home, FileText } from 'lucide-react-native';

interface AssociateStaffModalProps {
  visible: boolean;
  myUnits: AuthorizedUnit[];
  eligibleStaff: EligibleStaff[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStaffAssociationPayload) => Promise<any>;
}

export const AssociateStaffModal: React.FC<AssociateStaffModalProps> = ({
  visible,
  myUnits,
  eligibleStaff,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [roleOrTrade, setRoleOrTrade] = useState<string>('');
  const [durationPreset, setDurationPreset] = useState<'1m' | '3m' | '6m' | '1y' | 'custom'>('6m');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [notes, setNotes] = useState<string>('');
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (myUnits.length > 0) {
        setSelectedUnitId(myUnits[0]._id);
      } else {
        setSelectedUnitId('');
      }
      setSelectedStaffId('');
      setRoleOrTrade('');
      setDurationPreset('6m');
      setStartTime('08:00');
      setEndTime('12:00');
      setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setNotes('');
      setConflictWarning(null);
      setErrors({});
      setServerError(null);
    }
  }, [visible, myUnits]);

  // When staff is selected, prefill suggested role and trigger conflict check
  const handleStaffChange = async (staffId: string) => {
    setSelectedStaffId(staffId);
    setConflictWarning(null);
    const chosen = eligibleStaff.find((s) => s._id === staffId);
    if (chosen && !roleOrTrade) {
      setRoleOrTrade(chosen.designation || chosen.department || '');
    }
    if (errors.staffId) {
      setErrors((prev) => ({ ...prev, staffId: '' }));
    }

    // Trigger conflict check if time window is valid
    if (staffId && startTime && endTime) {
      triggerConflictCheck(staffId, startTime, endTime, selectedDays);
    }
  };

  const triggerConflictCheck = async (staffId: string, sTime: string, eTime: string, days: string[]) => {
    if (!staffId) return;
    try {
      setIsCheckingConflict(true);
      const res = await staffService.checkConflict({
        technicianId: staffId,
        accessSchedule: {
          days,
          timeWindow: { start: sTime, end: eTime },
        },
        excludeVillaId: selectedUnitId || undefined,
      });
      if (res && res.hasConflict) {
        setConflictWarning(res.conflictMessage || 'This staff member is already assigned to another unit during these hours.');
      } else {
        setConflictWarning(null);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsCheckingConflict(false);
    }
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedUnitId) {
      errs.unitId = 'Please select an authorized unit';
    }
    if (!selectedStaffId) {
      errs.staffId = 'Please select an eligible staff member';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setServerError(null);

    // Calculate contract expiry based on preset
    const now = new Date();
    const validUntilDate = new Date();
    if (durationPreset === '1m') validUntilDate.setMonth(now.getMonth() + 1);
    else if (durationPreset === '3m') validUntilDate.setMonth(now.getMonth() + 3);
    else if (durationPreset === '6m') validUntilDate.setMonth(now.getMonth() + 6);
    else if (durationPreset === '1y') validUntilDate.setFullYear(now.getFullYear() + 1);
    else validUntilDate.setFullYear(now.getFullYear() + 1); // default custom

    const payload: CreateStaffAssociationPayload = {
      villaId: selectedUnitId,
      technicianId: selectedStaffId,
      roleOrTrade: roleOrTrade.trim() || undefined,
      notes: notes.trim() || undefined,
      accessSchedule: {
        days: selectedDays,
        timeWindow: { start: startTime, end: endTime },
        notes: `Contract Period: ${durationPreset.toUpperCase()}`,
      },
    };

    const result = await onSubmit(payload);
    if (!result?.success) {
      setServerError(result?.error || 'Failed to associate staff with unit');
    }
  };

  const unitOptions = myUnits.map((u) => ({
    label: `${u.unitNumber}${u.blockOrBuilding ? ` (${u.blockOrBuilding})` : ''} • ${u.type || 'Unit'}`,
    value: u._id,
  }));

  const staffOptions = eligibleStaff.map((s) => ({
    label: `${s.name} (${s.department}${s.designation ? ` - ${s.designation}` : ''})`,
    value: s._id,
  }));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Associate Staff to Unit"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="p-4 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        {serverError && (
          <View className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
            <Text className="text-sm font-medium text-destructive">{serverError}</Text>
          </View>
        )}

        {/* Unit Selector */}
        <View className="mb-4">
          <DropdownSelect
            label="Authorized Unit"
            required
            placeholder="Select Unit / Villa"
            options={unitOptions}
            value={selectedUnitId}
            onValueChange={(val) => {
              setSelectedUnitId(val);
              if (errors.unitId) setErrors((prev) => ({ ...prev, unitId: '' }));
            }}
            error={errors.unitId}
          />
          {myUnits.length === 0 && (
            <Text className="text-xs text-destructive mt-1">
              No authorized residential units found for your account.
            </Text>
          )}
        </View>

        {/* Staff Member Selector */}
        <View className="mb-4">
          <DropdownSelect
            label="Community Staff Member"
            required
            placeholder="Select Staff from Registry"
            options={staffOptions}
            value={selectedStaffId}
            onValueChange={handleStaffChange}
            error={errors.staffId}
          />
          {eligibleStaff.length === 0 && (
            <Text className="text-xs text-muted-foreground mt-1">
              No active staff currently registered in this community.
            </Text>
          )}
        </View>

        {/* Role / Trade in Household */}
        <View className="mb-4">
          <TextInput
            label="Household Role / Trade"
            placeholder="e.g. Private Driver, Cook, Maid"
            value={roleOrTrade}
            onChangeText={setRoleOrTrade}
            helperText="Custom role title within your household"
          />
        </View>

        {/* Conflict Alert Banner */}
        {conflictWarning ? (
          <View className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
            <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
              ⚠️ Schedule Conflict Detected
            </Text>
            <Text className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              {conflictWarning}
            </Text>
          </View>
        ) : null}

        {/* Contract Duration Presets */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-foreground mb-2">
            Contract Duration Period
          </Text>
          <View className="flex-row gap-2">
            {(
              [
                { label: '1 Month', value: '1m' },
                { label: '3 Months', value: '3m' },
                { label: '6 Months', value: '6m' },
                { label: '1 Year', value: '1y' },
              ] as const
            ).map((p) => {
              const isSelected = durationPreset === p.value;
              return (
                <Button
                  key={p.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 py-1.5"
                  onPress={() => setDurationPreset(p.value)}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {p.label}
                  </Text>
                </Button>
              );
            })}
          </View>
        </View>

        {/* Shift Timings & Working Hours */}
        <View className="mb-4 p-3 rounded-2xl bg-muted/40 border border-border">
          <Text className="text-xs font-bold text-foreground mb-2">
            Daily Working Hours & Shift Window
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextInput
                label="Start Time"
                placeholder="08:00"
                value={startTime}
                onChangeText={(t) => {
                  setStartTime(t);
                  if (selectedStaffId && t && endTime) {
                    triggerConflictCheck(selectedStaffId, t, endTime, selectedDays);
                  }
                }}
              />
            </View>
            <View className="flex-1">
              <TextInput
                label="End Time"
                placeholder="12:00"
                value={endTime}
                onChangeText={(t) => {
                  setEndTime(t);
                  if (selectedStaffId && startTime && t) {
                    triggerConflictCheck(selectedStaffId, startTime, t, selectedDays);
                  }
                }}
              />
            </View>
          </View>
        </View>

        {/* Notes */}
        <View className="mb-6">
          <TextInput
            label="Access Notes & Instructions (Optional)"
            placeholder="e.g. Morning access, keycard handed over"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Actions */}
        <View className="flex-row items-center gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text className="text-sm font-semibold">Cancel</Text>
          </Button>

          <Button
            variant="default"
            className="flex-1"
            onPress={handleSubmit}
            disabled={isSubmitting || myUnits.length === 0 || eligibleStaff.length === 0}
          >
            <Text className="text-sm font-bold text-white">
              {isSubmitting ? 'Associating...' : 'Associate Staff'}
            </Text>
          </Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default AssociateStaffModal;
