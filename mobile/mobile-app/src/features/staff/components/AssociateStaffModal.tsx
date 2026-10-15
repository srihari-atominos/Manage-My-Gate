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
  resolveStaffPhotoUrl,
} from '../services/staffService';
import { UsersRound, Home, FileText } from 'lucide-react-native';
import { StaffAvatar } from './StaffAvatar';

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
      setStartTime('08:00');
      setEndTime('12:00');
      setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setNotes('');
      setConflictWarning(null);
      setErrors({});
      setServerError(null);
    }
  }, [visible, myUnits]);

  const triggerConflictCheck = async (staffId: string, sTime: string, eTime: string, days: string[]) => {
    if (!staffId || !sTime || !eTime) return;
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
      // Non-blocking failure
    } finally {
      setIsCheckingConflict(false);
    }
  };

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

    if (staffId && startTime && endTime) {
      triggerConflictCheck(staffId, startTime, endTime, selectedDays);
    }
  };

  const toggleDay = (day: string) => {
    const updated = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    setSelectedDays(updated);
    if (selectedStaffId && startTime && endTime) {
      triggerConflictCheck(selectedStaffId, startTime, endTime, updated);
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
    if (!startTime.trim()) {
      errs.startTime = 'Start time is required (HH:MM)';
    }
    if (!endTime.trim()) {
      errs.endTime = 'End time is required (HH:MM)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (conflictWarning) {
      setServerError('Please select a non-overlapping time window to avoid scheduling conflicts.');
      return;
    }
    setServerError(null);

    const payload: CreateStaffAssociationPayload = {
      villaId: selectedUnitId,
      technicianId: selectedStaffId,
      roleOrTrade: roleOrTrade.trim() || undefined,
      notes: notes.trim() || undefined,
      accessSchedule: {
        days: selectedDays,
        timeWindow: { start: startTime, end: endTime },
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
    label: s.name,
    description: `${s.designation || s.department} · ${s.staffCategory === 'UNIT' ? 'Unit Staff' : 'Community Staff'}`,
    imageUrl: resolveStaffPhotoUrl(s.photoUrl),
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
          {selectedStaffId ? (() => {
            const selected = eligibleStaff.find((staff) => staff._id === selectedStaffId);
            return selected ? (
              <View className="mt-3 flex-row items-center rounded-xl border border-border bg-muted/35 px-3 py-2.5">
                <StaffAvatar name={selected.name} photoUrl={selected.photoUrl} size={42} />
                <View className="ms-3 flex-1">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{selected.name}</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                    {selected.designation || selected.department}
                  </Text>
                </View>
              </View>
            ) : null;
          })() : null}
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

        {/* Daily Working Hours & Shift Window */}
        <View className="mb-4 p-3.5 rounded-2xl bg-muted/40 border border-border">
          <Text className="text-xs font-bold text-foreground mb-1.5">
            Daily Working Hours (Start - End)
          </Text>
          <Text className="text-[11px] text-muted-foreground mb-3">
            Specify the allocated time window to prevent double-booking across households.
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
                error={errors.startTime}
                editable={!isSubmitting}
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
                error={errors.endTime}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Working Days Selector */}
          <Text className="text-xs font-semibold text-foreground mt-3 mb-2">
            Active Days
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
              const isSelected = selectedDays.includes(day);
              return (
                <Button
                  key={day}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className="px-2.5 py-1 h-8 rounded-lg"
                  onPress={() => toggleDay(day)}
                  disabled={isSubmitting}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isSelected ? 'text-primary-foreground font-bold' : 'text-foreground'
                    }`}
                  >
                    {day}
                  </Text>
                </Button>
              );
            })}
          </View>
        </View>

        {/* Schedule Conflict Alert Banner */}
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
