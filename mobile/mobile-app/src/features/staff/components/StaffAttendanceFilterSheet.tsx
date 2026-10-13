import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/common/Chip';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { DEPARTMENTS } from '../hooks/useStaffManagement';

export type AttendancePeriodPreset = 'today' | 'yesterday' | 'week' | 'this_month' | 'last_month' | 'custom' | 'all';

interface StaffAttendanceFilterSheetProps {
  visible: boolean;
  selectedStatus: string;
  selectedDepartment?: string;
  startDate: string;
  endDate: string;
  activePeriod?: AttendancePeriodPreset;
  onSelectStatus: (status: string) => void;
  onSelectDepartment?: (dept: string) => void;
  onChangeStartDate: (date: string) => void;
  onChangeEndDate: (date: string) => void;
  onApplyPeriodPreset?: (preset: AttendancePeriodPreset) => void;
  onApplyFilters?: () => void;
  onReset: () => void;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { key: 'ALL', label: 'All Sessions' },
  { key: 'Open', label: 'Open / Checked In' },
  { key: 'Closed', label: 'Closed / Checked Out' },
  { key: 'Missing Checkout', label: 'Missing Checkout / Exception' },
];

export const StaffAttendanceFilterSheet: React.FC<StaffAttendanceFilterSheetProps> = ({
  visible,
  selectedStatus,
  selectedDepartment = 'ALL',
  startDate,
  endDate,
  activePeriod = 'all',
  onSelectStatus,
  onSelectDepartment,
  onChangeStartDate,
  onChangeEndDate,
  onApplyPeriodPreset,
  onApplyFilters,
  onReset,
  onClose,
}) => {
  // Local temporary state for Custom Date Range to support Apply / Cancel validation
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [customDateError, setCustomDateError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLocalStartDate(startDate);
      setLocalEndDate(endDate);
      setCustomDateError(null);
    }
  }, [visible, startDate, endDate]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Handle preset selection
  const handleSelectPreset = (preset: AttendancePeriodPreset) => {
    setCustomDateError(null);
    const now = new Date();

    if (preset === 'today') {
      const todayStr = toYMD(now);
      setLocalStartDate(todayStr);
      setLocalEndDate(todayStr);
      onChangeStartDate(todayStr);
      onChangeEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestStr = toYMD(yest);
      setLocalStartDate(yestStr);
      setLocalEndDate(yestStr);
      onChangeStartDate(yestStr);
      onChangeEndDate(yestStr);
    } else if (preset === 'week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const mStr = toYMD(monday);
      const sStr = toYMD(sunday);
      setLocalStartDate(mStr);
      setLocalEndDate(sStr);
      onChangeStartDate(mStr);
      onChangeEndDate(sStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const fStr = toYMD(firstDay);
      const lStr = toYMD(lastDay);
      setLocalStartDate(fStr);
      setLocalEndDate(lStr);
      onChangeStartDate(fStr);
      onChangeEndDate(lStr);
    } else if (preset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      const fStr = toYMD(firstDay);
      const lStr = toYMD(lastDay);
      setLocalStartDate(fStr);
      setLocalEndDate(lStr);
      onChangeStartDate(fStr);
      onChangeEndDate(lStr);
    } else if (preset === 'all') {
      setLocalStartDate('');
      setLocalEndDate('');
      onChangeStartDate('');
      onChangeEndDate('');
    }

    if (onApplyPeriodPreset) {
      onApplyPeriodPreset(preset);
    }
  };

  const handleApplyCustomDates = () => {
    // Validation: Start Date must not be after End Date
    if (localStartDate && localEndDate) {
      const start = new Date(`${localStartDate}T00:00:00Z`).getTime();
      const end = new Date(`${localEndDate}T23:59:59Z`).getTime();
      if (!isNaN(start) && !isNaN(end) && start > end) {
        setCustomDateError('Start date cannot be after end date.');
        return;
      }
    }
    setCustomDateError(null);
    onChangeStartDate(localStartDate.trim());
    onChangeEndDate(localEndDate.trim());
    if (onApplyPeriodPreset) {
      onApplyPeriodPreset(localStartDate || localEndDate ? 'custom' : 'all');
    }
  };

  const handleApplyAll = () => {
    if (localStartDate && localEndDate) {
      const start = new Date(`${localStartDate}T00:00:00Z`).getTime();
      const end = new Date(`${localEndDate}T23:59:59Z`).getTime();
      if (!isNaN(start) && !isNaN(end) && start > end) {
        setCustomDateError('Start date cannot be after end date.');
        return;
      }
    }
    onChangeStartDate(localStartDate.trim());
    onChangeEndDate(localEndDate.trim());
    if (onApplyFilters) {
      onApplyFilters();
    }
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Attendance Filters">
      <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* A. Session Status Section */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-foreground mb-2.5">Session Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <Chip
                key={opt.key}
                label={opt.label}
                selected={selectedStatus === opt.key}
                onPress={() => onSelectStatus(opt.key)}
              />
            ))}
          </View>
        </View>

        {/* B. Department / Classification Section */}
        {onSelectDepartment ? (
          <View className="mb-5">
            <Text className="text-sm font-semibold text-foreground mb-2.5">
              Department / Classification
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="All Departments"
                selected={selectedDepartment === 'ALL'}
                onPress={() => onSelectDepartment('ALL')}
              />
              {DEPARTMENTS.map((dept) => (
                <Chip
                  key={dept}
                  label={dept}
                  selected={selectedDepartment === dept}
                  onPress={() => onSelectDepartment(dept)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* C. Date Period Presets */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-foreground mb-2.5">Date Period Presets</Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="Today"
              selected={activePeriod === 'today'}
              onPress={() => handleSelectPreset('today')}
            />
            <Chip
              label="Yesterday"
              selected={activePeriod === 'yesterday'}
              onPress={() => handleSelectPreset('yesterday')}
            />
            <Chip
              label="This Week"
              selected={activePeriod === 'week'}
              onPress={() => handleSelectPreset('week')}
            />
            <Chip
              label="This Month"
              selected={activePeriod === 'this_month'}
              onPress={() => handleSelectPreset('this_month')}
            />
            <Chip
              label="Last Month"
              selected={activePeriod === 'last_month'}
              onPress={() => handleSelectPreset('last_month')}
            />
            <Chip
              label="All Periods"
              selected={activePeriod === 'all' && !startDate && !endDate}
              onPress={() => handleSelectPreset('all')}
            />
          </View>
        </View>

        {/* D. Custom Date Range Section */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-sm font-semibold text-foreground">Custom Date Range</Text>
            {activePeriod === 'custom' && (
              <View className="px-2 py-0.5 rounded-full bg-primary/10">
                <Text className="text-[10px] font-bold text-primary">Custom Active</Text>
              </View>
            )}
          </View>

          {customDateError ? (
            <View className="mb-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <Text className="text-xs text-destructive font-medium">{customDateError}</Text>
            </View>
          ) : null}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextInput
                label="Start Date (YYYY-MM-DD)"
                placeholder="2026-01-01"
                value={localStartDate}
                onChangeText={(text) => {
                  setLocalStartDate(text);
                  setCustomDateError(null);
                }}
                helperText="From date"
              />
            </View>
            <View className="flex-1">
              <TextInput
                label="End Date (YYYY-MM-DD)"
                placeholder="2026-12-31"
                value={localEndDate}
                onChangeText={(text) => {
                  setLocalEndDate(text);
                  setCustomDateError(null);
                }}
                helperText="To date"
              />
            </View>
          </View>

          <View className="flex-row gap-2 mt-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3"
              onPress={() => {
                setLocalStartDate('');
                setLocalEndDate('');
                setCustomDateError(null);
                onChangeStartDate('');
                onChangeEndDate('');
                if (onApplyPeriodPreset) onApplyPeriodPreset('all');
              }}
            >
              <Text className="text-xs">Clear Range</Text>
            </Button>
            <Button
              size="sm"
              variant="default"
              className="h-8 px-3"
              onPress={handleApplyCustomDates}
            >
              <Text className="text-xs font-semibold text-primary-foreground">Set Range</Text>
            </Button>
          </View>
        </View>

        {/* Action Controls */}
        <View className="flex-row gap-3 pt-3 border-t border-border/60">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => {
              setLocalStartDate('');
              setLocalEndDate('');
              setCustomDateError(null);
              onReset();
            }}
          >
            Reset Filters
          </Button>
          <Button variant="default" className="flex-1" onPress={handleApplyAll}>
            Apply Filters
          </Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default StaffAttendanceFilterSheet;
