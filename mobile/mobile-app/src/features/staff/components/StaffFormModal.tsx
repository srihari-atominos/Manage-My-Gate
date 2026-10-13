import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StaffMember, CreateStaffPayload, UpdateStaffPayload, StaffDepartment, StaffType, StaffStatus } from '../services/staffService';
import { DEPARTMENTS, STAFF_TYPES, STAFF_STATUSES } from '../hooks/useStaffManagement';

interface StaffFormModalProps {
  visible: boolean;
  member: StaffMember | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStaffPayload | UpdateStaffPayload) => Promise<any>;
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({
  visible,
  member,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(member?._id);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState<StaffDepartment>('Electrical');
  const [type, setType] = useState<StaffType>('In-House Staff');
  const [status, setStatus] = useState<StaffStatus>('Active');
  const [designation, setDesignation] = useState('');
  const [staffCode, setStaffCode] = useState('');
  const [qrValidFrom, setQrValidFrom] = useState('');
  const [qrValidUntil, setQrValidUntil] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('08:00');
  const [shiftEndTime, setShiftEndTime] = useState('18:00');

  // Form error state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (member) {
        setName(member.name || '');
        setPhone(member.phone || '');
        setEmail(member.email || '');
        setDepartment(member.department || 'Electrical');
        setType(member.type || 'In-House Staff');
        setStatus(member.status || 'Active');
        setDesignation(member.designation || '');
        setStaffCode(member.staffCode || '');
        setQrValidFrom((member as any).qrValidFrom ? new Date((member as any).qrValidFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setQrValidUntil((member as any).qrValidUntil ? new Date((member as any).qrValidUntil).toISOString().split('T')[0] : '');
        setShiftStartTime((member as any).shiftWindow?.startTime || '08:00');
        setShiftEndTime((member as any).shiftWindow?.endTime || '18:00');
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setDepartment('Electrical');
        setType('In-House Staff');
        setStatus('Active');
        setDesignation('');
        setStaffCode('');
        // Default pass validity: Start today, expire 1 year from today
        const today = new Date();
        setQrValidFrom(today.toISOString().split('T')[0]);
        const oneYear = new Date();
        oneYear.setFullYear(oneYear.getFullYear() + 1);
        setQrValidUntil(oneYear.toISOString().split('T')[0]);
        setShiftStartTime('08:00');
        setShiftEndTime('18:00');
      }
      setErrors({});
      setServerError(null);
    }
  }, [visible, member]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Staff name is required';
    }
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.trim().length < 8) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!validate()) return;

    try {
      setServerError(null);
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        department,
        type,
        status,
        designation: designation.trim() || undefined,
        staffCode: staffCode.trim() || undefined,
        qrValidFrom: qrValidFrom ? new Date(qrValidFrom).toISOString() : undefined,
        qrValidUntil: qrValidUntil ? new Date(qrValidUntil).toISOString() : undefined,
        shiftWindow: {
          startTime: shiftStartTime || '08:00',
          endTime: shiftEndTime || '18:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6],
        },
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save staff member');
    }
  };

  const deptOptions = DEPARTMENTS.map((d) => ({ label: d, value: d }));
  const typeOptions = STAFF_TYPES.map((t) => ({ label: t, value: t }));
  const statusOptions = STAFF_STATUSES.map((s) => ({ label: s, value: s }));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? `Edit ${member?.name}` : 'Add Staff Member'}
    >
      <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 40 }}>
        {serverError ? (
          <View className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
            <Text className="text-xs font-medium text-destructive">{serverError}</Text>
          </View>
        ) : null}

        <View className="gap-3.5">
          <TextInput
            label="Full Name"
            placeholder="e.g. Ahmed Al-Mansoor"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            error={errors.name}
            required
            editable={!isSubmitting}
          />

          <TextInput
            label="Phone Number"
            placeholder="e.g. +966 50 123 4567"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
            }}
            keyboardType="phone-pad"
            error={errors.phone}
            required
            editable={!isSubmitting}
          />

          <TextInput
            label="Email Address (Optional)"
            placeholder="e.g. staff@community.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            editable={!isSubmitting}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextInput
                label="Designation (Optional)"
                placeholder="e.g. Lead Electrician"
                value={designation}
                onChangeText={setDesignation}
                editable={!isSubmitting}
              />
            </View>
            <View className="flex-1">
              <TextInput
                label="Staff Code (Optional)"
                placeholder="e.g. STF-01"
                value={staffCode}
                onChangeText={setStaffCode}
                editable={!isSubmitting}
              />
            </View>
          </View>

          <DropdownSelect
            label="Department"
            required
            options={deptOptions}
            value={department}
            onValueChange={(val) => setDepartment(val as StaffDepartment)}
          />

          <DropdownSelect
            label="Staff Type"
            required
            options={typeOptions}
            value={type}
            onValueChange={(val) => setType(val as StaffType)}
          />

          {isEditing ? (
            <DropdownSelect
              label="Account Status"
              required
              options={statusOptions}
              value={status}
              onValueChange={(val) => setStatus(val as StaffStatus)}
            />
          ) : null}

          {/* QR Pass Expiry & Shift Timings */}
          <View className="mt-1 p-3.5 rounded-2xl bg-muted/40 border border-border gap-3">
            <Text className="text-xs font-bold text-foreground">
              Pass Validity & Daily Shift Schedule
            </Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextInput
                  label="Pass Start Date (YYYY-MM-DD)"
                  placeholder="e.g. 2026-01-01"
                  value={qrValidFrom}
                  onChangeText={setQrValidFrom}
                  helperText="Access active from"
                  editable={!isSubmitting}
                />
              </View>
              <View className="flex-1">
                <TextInput
                  label="Pass Expire Date (YYYY-MM-DD)"
                  placeholder="e.g. 2026-12-31"
                  value={qrValidUntil}
                  onChangeText={setQrValidUntil}
                  helperText="Access expires on"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextInput
                  label="Shift Start"
                  placeholder="08:00"
                  value={shiftStartTime}
                  onChangeText={setShiftStartTime}
                  editable={!isSubmitting}
                />
              </View>
              <View className="flex-1">
                <TextInput
                  label="Shift End"
                  placeholder="18:00"
                  value={shiftEndTime}
                  onChangeText={setShiftEndTime}
                  editable={!isSubmitting}
                />
              </View>
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onPress={handleSave}
              disabled={isSubmitting}
              accessibilityLabel={isEditing ? 'Save Staff Changes' : 'Create Staff Member'}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Staff'}
            </Button>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default StaffFormModal;
