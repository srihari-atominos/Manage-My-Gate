import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { DatePicker } from '@/components/common/DatePicker';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { Calendar, Clock, Repeat } from 'lucide-react-native';

export interface MaintenanceScheduleStepProps {
  isRecurring: boolean;
  onToggleRecurring: (val: boolean) => void;
  startDate: string;
  onChangeStartDate: (val: string) => void;
  endDate: string;
  onChangeEndDate: (val: string) => void;
  startTime: string;
  onChangeStartTime: (val: string) => void;
  endTime: string;
  onChangeEndTime: (val: string) => void;
  frequency: string;
  onChangeFrequency: (val: string) => void;
  interval: number;
  onChangeInterval: (val: number) => void;
  occurrenceCount: number;
  onChangeOccurrences: (val: number) => void;
  selectedDays: number[];
  onToggleDay: (day: number) => void;
  isOngoing: boolean;
  onToggleOngoing: (val: boolean) => void;
}

const TIME_PRESETS = [
  { label: 'Full Day (00:00–17:00)', start: '00:00', end: '17:00' },
  { label: 'Morning (08:00–12:00)', start: '08:00', end: '12:00' },
  { label: 'Afternoon (12:00–17:00)', start: '12:00', end: '17:00' },
  { label: 'Evening (17:00–22:00)', start: '17:00', end: '22:00' },
];

const OCCURRENCE_PRESETS: Record<string, Array<{ count: number; label: string }>> = {
  DAILY: [
    { count: 7, label: '7 Days' },
    { count: 14, label: '14 Days' },
    { count: 30, label: '30 Days' },
  ],
  WEEKLY: [
    { count: 4, label: '4 Weeks' },
    { count: 8, label: '8 Weeks' },
    { count: 12, label: '12 Weeks' },
  ],
  MONTHLY: [
    { count: 3, label: '3 Months' },
    { count: 6, label: '6 Months' },
    { count: 12, label: '12 Months' },
  ],
  YEARLY: [
    { count: 2, label: '2 Years' },
    { count: 5, label: '5 Years' },
  ],
};

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export const MaintenanceScheduleStep: React.FC<MaintenanceScheduleStepProps> = ({
  isRecurring,
  onToggleRecurring,
  startDate,
  onChangeStartDate,
  endDate,
  onChangeEndDate,
  startTime,
  onChangeStartTime,
  endTime,
  onChangeEndTime,
  frequency,
  onChangeFrequency,
  interval,
  onChangeInterval,
  occurrenceCount,
  onChangeOccurrences,
  selectedDays,
  onToggleDay,
  isOngoing,
  onToggleOngoing,
}) => {
  const formatDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-6" keyboardShouldPersistTaps="handled">
      {/* Recurring Series Switch */}
      <ToggleSwitch
        label="Recurring Maintenance Series"
        description="Repeat this upkeep on a scheduled cadence (e.g. every Monday or monthly)"
        value={isRecurring}
        onValueChange={onToggleRecurring}
        className="p-3.5 bg-card border border-border rounded-2xl"
      />

      {!isRecurring ? (
        /* ── One-Off Window Schedule ────────────────────────────── */
        <View className="gap-3 bg-card border border-border rounded-2xl p-4">
          <View className="flex-row items-center gap-2 pb-1 border-b border-border/50">
            <Calendar size={15} className="text-primary" />
            <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
              Date & Operating Window
            </Text>
          </View>

          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <DatePicker
                label="Start Date *"
                value={startDate ? new Date(`${startDate}T00:00:00`) : new Date()}
                onChange={(d: Date) => {
                  const s = formatDateString(d);
                  onChangeStartDate(s);
                  if (!endDate) onChangeEndDate(s);
                }}
              />
            </View>
            <View className="flex-1">
              <DatePicker
                label="End Date *"
                value={endDate ? new Date(`${endDate}T00:00:00`) : new Date()}
                onChange={(d: Date) => onChangeEndDate(formatDateString(d))}
              />
            </View>
          </View>

          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <TextInput
                label="Start Time"
                placeholder="00:00"
                value={startTime}
                onChangeText={onChangeStartTime}
                leftIcon={<Clock size={15} className="text-muted-foreground" />}
              />
            </View>
            <View className="flex-1">
              <TextInput
                label="End Time"
                placeholder="17:00"
                value={endTime}
                onChangeText={onChangeEndTime}
                leftIcon={<Clock size={15} className="text-muted-foreground" />}
              />
            </View>
          </View>

          {/* Time Presets */}
          <View className="gap-1.5 pt-1">
            <Text className="text-[11px] font-semibold text-muted-foreground">
              Quick Time Presets:
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {TIME_PRESETS.map((preset) => {
                const isActive = startTime === preset.start && endTime === preset.end;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    onPress={() => {
                      onChangeStartTime(preset.start);
                      onChangeEndTime(preset.end);
                    }}
                    activeOpacity={0.7}
                    className={`px-2.5 py-1 rounded-lg border ${
                      isActive ? 'bg-primary/15 border-primary' : 'bg-muted/40 border-border'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        isActive ? 'text-primary font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      ) : (
        /* ── Recurring Series Configuration ─────────────────────── */
        <View className="gap-3 bg-card border border-border rounded-2xl p-4">
          <View className="flex-row items-center gap-2 pb-1 border-b border-border/50">
            <Repeat size={15} className="text-purple-600" />
            <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
              Recurrence Rules
            </Text>
          </View>

          {/* Frequency Chips */}
          <View className="gap-1.5">
            <Text className="text-xs font-bold text-foreground">Repeat Frequency</Text>
            <View className="flex-row gap-2">
              {FREQUENCIES.map((f) => {
                const isSelected = frequency === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    onPress={() => onChangeFrequency(f.value)}
                    activeOpacity={0.7}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      isSelected ? 'bg-primary/10 border-primary' : 'bg-muted/40 border-border'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-primary font-bold' : 'text-foreground'
                      }`}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Days of Week (Weekly) */}
          {frequency === 'WEEKLY' && (
            <View className="gap-1.5">
              <Text className="text-xs font-bold text-foreground">Repeat On</Text>
              <View className="flex-row justify-between gap-1">
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = selectedDays.includes(d.value);
                  return (
                    <TouchableOpacity
                      key={d.value}
                      onPress={() => onToggleDay(d.value)}
                      activeOpacity={0.7}
                      className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                        isSelected ? 'bg-primary border-primary' : 'bg-muted/40 border-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-foreground'
                        }`}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Start Date */}
          <DatePicker
            label="First Occurrence Date *"
            value={startDate ? new Date(`${startDate}T00:00:00`) : new Date()}
            onChange={(d: Date) => onChangeStartDate(formatDateString(d))}
          />

          {/* Operating Time Range */}
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <TextInput
                label="Daily Start Time"
                placeholder="00:00"
                value={startTime}
                onChangeText={onChangeStartTime}
                leftIcon={<Clock size={15} className="text-muted-foreground" />}
              />
            </View>
            <View className="flex-1">
              <TextInput
                label="Daily End Time"
                placeholder="17:00"
                value={endTime}
                onChangeText={onChangeEndTime}
                leftIcon={<Clock size={15} className="text-muted-foreground" />}
              />
            </View>
          </View>

          {/* Recurrence Duration / Occurrences Mode */}
          <View className="gap-2">
            <Text className="text-xs font-bold text-foreground">Series Duration</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onToggleOngoing(true)}
                activeOpacity={0.7}
                className={`flex-1 py-2.5 px-2 rounded-xl border items-center justify-center ${
                  isOngoing ? 'bg-primary/10 border-primary' : 'bg-muted/40 border-border'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isOngoing ? 'text-primary font-bold' : 'text-foreground'
                  }`}
                >
                  Ongoing (No Limit)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onToggleOngoing(false)}
                activeOpacity={0.7}
                className={`flex-1 py-2.5 px-2 rounded-xl border items-center justify-center ${
                  !isOngoing ? 'bg-primary/10 border-primary' : 'bg-muted/40 border-border'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    !isOngoing ? 'text-primary font-bold' : 'text-foreground'
                  }`}
                >
                  Fixed Sessions
                </Text>
              </TouchableOpacity>
            </View>

            {isOngoing ? (
              <View className="p-3 bg-muted/30 border border-border/70 rounded-xl flex-row items-center gap-2">
                <Repeat size={15} className="text-primary shrink-0" />
                <Text className="text-xs text-muted-foreground flex-1">
                  Repeats automatically on schedule until manually cancelled or paused.
                </Text>
              </View>
            ) : (
              <View className="gap-2 pt-1">
                {/* Quick Presets */}
                <View className="flex-row flex-wrap gap-1.5">
                  {(OCCURRENCE_PRESETS[frequency] || OCCURRENCE_PRESETS.WEEKLY).map((p) => {
                    const isSelected = occurrenceCount === p.count;
                    return (
                      <TouchableOpacity
                        key={p.count}
                        onPress={() => onChangeOccurrences(p.count)}
                        activeOpacity={0.7}
                        className={`px-3 py-1.5 rounded-lg border ${
                          isSelected ? 'bg-primary/15 border-primary' : 'bg-card border-border/80'
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            isSelected ? 'text-primary font-bold' : 'text-muted-foreground'
                          }`}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Occurrences Count Input */}
                <TextInput
                  label="Total Occurrences (Sessions)"
                  placeholder="e.g. 8"
                  keyboardType="numeric"
                  value={String(occurrenceCount || 8)}
                  onChangeText={(val) => onChangeOccurrences(parseInt(val, 10) || 8)}
                />
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default MaintenanceScheduleStep;
