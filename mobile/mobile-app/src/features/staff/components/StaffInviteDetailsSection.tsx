import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { useTranslation } from '@/src/utils/i18n';
import { StaffPhotoPicker } from './StaffPhotoPicker';
import type { StaffPhotoFile } from '../services/staffService';

export const STAFF_DEPARTMENTS = ['Electrical', 'Plumbing', 'Housekeeping', 'Security', 'Carpentry', 'Others'] as const;
export const STAFF_TYPES = ['In-House Staff', 'External Vendor', 'Community Staff'] as const;

interface StaffInviteDetailsSectionProps {
  photo: StaffPhotoFile | null;
  onPhotoChange: (photo: StaffPhotoFile | null) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  departmentOther: string;
  onDepartmentOtherChange: (value: string) => void;
  departmentOtherError?: string;
  designation: string;
  onDesignationChange: (value: string) => void;
  disabled?: boolean;
}

const FieldLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <View className="flex-row items-baseline mb-2">
    <Text className="text-xs font-bold text-foreground uppercase tracking-wide">{children}</Text>
    {hint ? <Text className="text-[11px] text-muted-foreground ms-1.5">{hint}</Text> : null}
  </View>
);

/**
 * Everything specific to a staff invitation, grouped in one clean card:
 * photo, trade (tap a chip), and an optional title.
 */
export const StaffInviteDetailsSection: React.FC<StaffInviteDetailsSectionProps> = ({
  photo,
  onPhotoChange,
  department,
  onDepartmentChange,
  departmentOther,
  onDepartmentOtherChange,
  departmentOtherError,
  designation,
  onDesignationChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <View className="rounded-2xl border border-border bg-muted/30 p-4 gap-5">
      {/* Photo */}
      <StaffPhotoPicker photo={photo} onChange={onPhotoChange} disabled={disabled} centered />

      <View className="h-px bg-border/60" />

      {/* Trade */}
      <View>
        <FieldLabel>{t('department_trade', 'Trade')}</FieldLabel>
        <View className="flex-row flex-wrap gap-2">
          {STAFF_DEPARTMENTS.map((d) => {
            const selected = department === d;
            return (
              <Pressable
                key={d}
                onPress={() => onDepartmentChange(d)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`px-3.5 py-2 rounded-full border ${
                  selected ? 'bg-primary border-primary' : 'bg-card border-border'
                }`}
              >
                <Text className={`text-xs font-semibold ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {t(`dept_${d.toLowerCase()}`, d)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {department === 'Others' ? (
          <View className="mt-3">
            <TextInput
              placeholder={t('department_other_placeholder', 'Type the trade, e.g. Gardener, Driver')}
              value={departmentOther}
              onChangeText={(val) => onDepartmentOtherChange(val.slice(0, 60))}
              maxLength={60}
              error={departmentOtherError}
              editable={!disabled}
            />
          </View>
        ) : null}
      </View>

      {/* Title */}
      <View>
        <FieldLabel hint={t('optional', '(optional)')}>{t('designation_title', 'Job title')}</FieldLabel>
        <TextInput
          placeholder={t('designation_placeholder', 'e.g. Senior Electrician, Private Maid')}
          value={designation}
          onChangeText={onDesignationChange}
          editable={!disabled}
        />
      </View>
    </View>
  );
};

export default StaffInviteDetailsSection;
