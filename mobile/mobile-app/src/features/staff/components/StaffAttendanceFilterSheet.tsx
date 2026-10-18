import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/common/Chip';
import { Text } from '@/components/ui/text';
import { DatePicker } from '@/components/common/DatePicker';

export interface AttendanceDepartmentOption {
  key: string;
  label: string;
}

export interface AttendanceRoleOption {
  key: string;
  label: string;
  scope: 'COMMUNITY' | 'UNIT';
}

interface StaffAttendanceFilterSheetProps {
  visible: boolean;
  selectedStatus: string;
  selectedDepartment?: string;
  selectedRole?: string;
  departmentOptions?: AttendanceDepartmentOption[];
  roleOptions?: AttendanceRoleOption[];
  startDate: string;
  endDate: string;
  onSelectStatus: (status: string) => void;
  onSelectDepartment?: (department: string) => void;
  onSelectRole?: (role: string) => void;
  onChangeStartDate: (date: string) => void;
  onChangeEndDate: (date: string) => void;
  onApplyFilters?: () => void;
  onReset: () => void;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { key: 'ALL', label: 'All Attendance' },
  { key: 'Open', label: 'Checked In' },
  { key: 'Closed', label: 'Checked Out' },
  { key: 'Missing Checkout', label: 'Missing Checkout' },
];

export const StaffAttendanceFilterSheet: React.FC<StaffAttendanceFilterSheetProps> = ({
  visible,
  selectedStatus,
  selectedDepartment = 'ALL',
  selectedRole = 'ALL',
  departmentOptions = [],
  roleOptions = [],
  startDate,
  endDate,
  onSelectStatus,
  onSelectDepartment,
  onSelectRole,
  onChangeStartDate,
  onChangeEndDate,
  onApplyFilters,
  onReset,
  onClose,
}) => {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLocalStartDate(startDate);
      setLocalEndDate(endDate);
      setDateError(null);
    }
  }, [visible, startDate, endDate]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toYMD = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseToDate = (value: string): Date | null => {
    const [year, month, day] = value.split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day) : null;
  };

  const apply = () => {
    if (localStartDate && localEndDate && localStartDate > localEndDate) {
      setDateError('Start date cannot be after end date.');
      return;
    }
    setDateError(null);
    onChangeStartDate(localStartDate.trim());
    onChangeEndDate(localEndDate.trim());
    onApplyFilters?.();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Attendance Filters">
      <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="mb-5">
          <Text className="text-sm font-semibold text-foreground mb-2.5">Attendance Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <Chip key={option.key} label={option.label} selected={selectedStatus === option.key} onPress={() => onSelectStatus(option.key)} />
            ))}
          </View>
        </View>

        {onSelectRole ? (
          <View className="mb-5">
            <Text className="text-sm font-semibold text-foreground mb-2.5">Staff Scope</Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="All Staff" selected={selectedRole === 'ALL'} onPress={() => onSelectRole('ALL')} />
              <Chip label="Community Staff" selected={selectedRole === 'COMMUNITY'} onPress={() => onSelectRole('COMMUNITY')} />
              <Chip label="Unit Staff" selected={selectedRole === 'UNIT'} onPress={() => onSelectRole('UNIT')} />
              {roleOptions.map((role) => (
                <Chip key={role.key} label={role.label} selected={selectedRole === role.key} onPress={() => onSelectRole(role.key)} />
              ))}
            </View>
          </View>
        ) : null}

        {onSelectDepartment ? (
          <View className="mb-5">
            <Text className="text-sm font-semibold text-foreground mb-2.5">Department / Trade</Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="All Departments" selected={selectedDepartment === 'ALL'} onPress={() => onSelectDepartment('ALL')} />
              {departmentOptions.map((option) => (
                <Chip key={option.key} label={option.label} selected={selectedDepartment === option.key} onPress={() => onSelectDepartment(option.key)} />
              ))}
            </View>
          </View>
        ) : null}

        <View className="mb-5">
          <Text className="text-sm font-semibold text-foreground mb-2.5">Date Range</Text>
          <Text className="text-xs text-muted-foreground mb-3">Leave both dates empty to include all attendance data.</Text>
          {dateError ? <Text className="text-xs text-destructive mb-2">{dateError}</Text> : null}
          <View className="flex-row gap-3">
            <View className="flex-1"><DatePicker label="Start Date" placeholder="From date" value={parseToDate(localStartDate)} onChange={(date) => { setLocalStartDate(toYMD(date)); setDateError(null); }} /></View>
            <View className="flex-1"><DatePicker label="End Date" placeholder="To date" value={parseToDate(localEndDate)} onChange={(date) => { setLocalEndDate(toYMD(date)); setDateError(null); }} /></View>
          </View>
          <Button size="sm" variant="outline" className="self-end mt-3 h-8 px-3" onPress={() => { setLocalStartDate(''); setLocalEndDate(''); setDateError(null); }}><Text className="text-xs">Clear Range</Text></Button>
        </View>

        <View className="flex-row gap-3 pt-3 border-t border-border/60">
          <Button variant="outline" className="flex-1" onPress={() => { setLocalStartDate(''); setLocalEndDate(''); setDateError(null); onReset(); }}>Reset Filters</Button>
          <Button variant="default" className="flex-1" onPress={apply}>Apply Filters</Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default StaffAttendanceFilterSheet;


