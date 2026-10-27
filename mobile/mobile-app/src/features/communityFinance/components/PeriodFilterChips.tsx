import React from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { type ReportingPeriod } from '../types';

interface PeriodFilterChipsProps {
  selectedPeriod: ReportingPeriod;
  onSelectPeriod: (period: ReportingPeriod) => void;
  disabled?: boolean;
}

const PERIODS: ReportingPeriod[] = [
  'Today',
  'This Week',
  'This Month',
  'Last Month',
  'This Year',
  'Previous Year',
  'All Time',
];

export const PeriodFilterChips: React.FC<PeriodFilterChipsProps> = ({
  selectedPeriod,
  onSelectPeriod,
  disabled = false,
}) => {
  return (
    <View className="py-3 mb-4 -mx-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-5 gap-2.5"
        accessibilityRole="tablist"
        accessibilityLabel="Reporting Period Filter">
        {PERIODS.map((period) => {
          const isSelected = period === selectedPeriod;
          return (
            <TouchableOpacity
              key={period}
              disabled={disabled}
              onPress={() => onSelectPeriod(period)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Select period ${period}`}
              className={`py-2 px-4 rounded-full border transition-all flex-row items-center justify-center ${
                isSelected
                  ? 'bg-primary border-primary shadow-xs'
                  : 'bg-card border-border/60'
              } ${disabled ? 'opacity-40' : ''}`}>
              <Text
                className={`text-sm font-semibold ${
                  isSelected ? 'text-white' : 'text-muted-foreground'
                }`}>
                {period}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default PeriodFilterChips;
