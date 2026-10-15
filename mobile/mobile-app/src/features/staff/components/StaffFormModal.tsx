import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StaffMember, CreateStaffPayload, UpdateStaffPayload, StaffDepartment, StaffStatus, StaffPhotoFile, staffService } from '../services/staffService';
import { DEPARTMENTS, STAFF_STATUSES } from '../hooks/useStaffManagement';
import { fetchRoles, RoleData } from '../../roleBuilder/services/roleService';
import { StaffPhotoPicker } from './StaffPhotoPicker';

interface StaffFormModalProps {
  visible: boolean;
  member: StaffMember | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStaffPayload | UpdateStaffPayload) => Promise<any>;
  onSaved?: () => void;
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({
  visible,
  member,
  isSubmitting,
  onClose,
  onSubmit,
  onSaved,
}) => {
  const isEditing = Boolean(member?._id);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState<StaffDepartment>('Electrical');
  const [customDepartment, setCustomDepartment] = useState('');
  const [roleId, setRoleId] = useState('');
  const [photo, setPhoto] = useState<StaffPhotoFile | null>(null);
  const [roleOptions, setRoleOptions] = useState<{ label: string; value: string }[]>([]);
  const [status, setStatus] = useState<StaffStatus>('Active');
  const [designation, setDesignation] = useState('');
  const [staffCode, setStaffCode] = useState('');

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
        setCustomDepartment(member.department === 'Others' ? (member.departmentOther || member.designation || '') : '');
        setPhoto(null);
        setRoleId(typeof member.roleId === 'object' ? member.roleId?._id || '' : member.roleId || '');
        setStatus(member.status || 'Active');
        setDesignation(member.designation || '');
        setStaffCode(member.staffCode || '');
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setDepartment('Electrical');
        setCustomDepartment('');
        setPhoto(null);
        setRoleId('');
        setStatus('Active');
        setDesignation('');
        setStaffCode('');
      }
      setErrors({});
      setServerError(null);
    }
  }, [visible, member]);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    fetchRoles({ page: 1, limit: 100 })
      .then((response: any) => {
        const roles = (response?.data?.data || response?.data || response || []) as RoleData[];
        const staffRoles = roles.filter((role) => role.roleScope === 'COMMUNITY_STAFF' || role.roleScope === 'STAFF');
        if (mounted) setRoleOptions(staffRoles.map((role) => ({ label: role.name, value: role._id || role.id || '' })).filter((role) => role.value));
      })
      .catch(() => { if (mounted) setRoleOptions([]); });
    return () => { mounted = false; };
  }, [visible]);

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
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email format';
    }
    if (department === 'Others' && !customDepartment.trim()) {
      newErrors.customDepartment = 'Please specify the department name';
    }
    if (!roleId) newErrors.roleId = 'Please select a staff role';

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
        email: email.trim(),
        department,
        departmentOther: department === 'Others' ? customDepartment.trim() : '',
        roleId,
        status,
        designation: designation.trim() || undefined,
        staffCode: staffCode.trim() || undefined,
      };

      const saved = await onSubmit(payload);
      if (photo && saved?._id) await staffService.uploadStaffPhoto(saved._id, photo);
      onSaved?.();
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save staff member');
    }
  };

  const deptOptions = DEPARTMENTS.map((d) => ({ label: d, value: d }));
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
          <StaffPhotoPicker
            photo={photo}
            existingUrl={member?.photoUrl}
            onChange={setPhoto}
            disabled={isSubmitting}
          />
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
            label="Email Address"
            placeholder="e.g. staff@community.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            required
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
            onValueChange={(val) => {
              setDepartment(val as StaffDepartment);
              if (val !== 'Others') {
                setCustomDepartment('');
                if (errors.customDepartment) {
                  setErrors((prev) => ({ ...prev, customDepartment: '' }));
                }
              }
            }}
          />

          {department === 'Others' ? (
            <TextInput
              label="Specify Department Name"
              placeholder="e.g. Landscape / Pool Maintenance / HVAC"
              value={customDepartment}
              onChangeText={(text) => {
                setCustomDepartment(text);
                if (errors.customDepartment) setErrors((prev) => ({ ...prev, customDepartment: '' }));
              }}
              error={errors.customDepartment}
              required
              editable={!isSubmitting}
            />
          ) : null}

          <DropdownSelect
            label="Role"
            required
            options={roleOptions}
            value={roleId}
            placeholder="Choose a role from Role Builder"
            error={errors.roleId}
            onValueChange={(value) => {
              setRoleId(value);
              if (errors.roleId) setErrors((prev) => ({ ...prev, roleId: '' }));
            }}
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
