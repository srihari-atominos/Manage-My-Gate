import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Filter, RotateCcw, ChevronDown } from 'lucide-react-native';
import { type ReportingPeriod } from '../types';
import { getPeriodDateRange } from '../utils/financeFormatters';
import { FinancePeriodFilterSheet } from './FinancePeriodFilterSheet';

export interface PeriodFilterChipsProps {
  selectedPeriod: ReportingPeriod;
  onSelectPeriod: (period: ReportingPeriod) => void;
  disabled?: boolean;
  onOpenFilter?: () => void;
}

const formatDateDisplay = (dateStr: string): string => {
  try {
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[parseInt(m, 10) - 1] || m;
    return `${parseInt(d, 10)} ${month} ${y}`;
  } catch {
    return dateStr;
  }
};

const formatRangeLabel = (period: ReportingPeriod): string => {
  const { startDate, endDate } = getPeriodDateRange(period);
  if (!startDate || !endDate) return 'All Records';
  if (startDate === endDate) return formatDateDisplay(startDate);
  return `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
};

export const PeriodFilterChips: React.FC<PeriodFilterChipsProps> = ({
  selectedPeriod,
  onSelectPeriod,
  disabled = false,
  onOpenFilter,
}) => {
  const [internalSheetOpen, setInternalSheetOpen] = useState(false);
  const isFiltered = selectedPeriod !== 'This Month';
  const rangeText = formatRangeLabel(selectedPeriod);

  const handleOpenFilter = () => {
    if (disabled) return;
    if (onOpenFilter) {
      onOpenFilter();
    } else {
      setInternalSheetOpen(true);
    }
  };

  const handleReset = () => {
    if (disabled) return;
    onSelectPeriod('This Month');
  };

  return (
    <View className="mb-4">
      {/* Modern Filter Option Bar without left image/icon, perfectly aligned */}
      <View className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs flex-row items-center justify-between">
        {/* Left: Interactive Reporting Period Indicator */}
        <TouchableOpacity
          disabled={disabled}
          onPress={handleOpenFilter}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Reporting Period: ${selectedPeriod}. ${rangeText}. Tap to filter.`}
          className="flex-1 me-3 justify-center min-w-0">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Text className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Reporting Period
            </Text>
            {isFiltered && (
              <View className="px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                <Text className="text-[9px] font-bold text-primary uppercase">Filtered</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center mt-1">
            <Text className="text-sm font-bold text-foreground shrink-0">
              {selectedPeriod}
            </Text>
            <Text className="text-xs text-muted-foreground ms-1.5 truncate flex-1" numberOfLines={1}>
              • {rangeText}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right: Actions (Reset + Filter Button with Filter Icon) */}
        <View className="flex-row items-center gap-1.5 shrink-0">
          {isFiltered && (
            <TouchableOpacity
              disabled={disabled}
              onPress={handleReset}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Reset period filter to default"
              className="h-9 px-2.5 rounded-xl border border-border/70 bg-muted/30 flex-row items-center justify-center gap-1 active:bg-muted">
              <Icon as={RotateCcw} size={12} className="text-muted-foreground" />
              <Text className="text-[11px] font-semibold text-muted-foreground">Reset</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            disabled={disabled}
            onPress={handleOpenFilter}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open reporting period filter"
            className={`h-9 px-3.5 rounded-xl border flex-row items-center justify-center gap-1.5 ${
              isFiltered
                ? 'bg-primary border-primary shadow-xs'
                : 'bg-card border-border/80 shadow-2xs'
            }`}>
            <Icon
              as={Filter}
              size={15}
              className={isFiltered ? 'text-white' : 'text-primary'}
            />
            <Text
              className={`text-xs font-semibold ${
                isFiltered ? 'text-white' : 'text-foreground'
              }`}>
              Filter
            </Text>
            <Icon
              as={ChevronDown}
              size={13}
              className={isFiltered ? 'text-white/80' : 'text-muted-foreground'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Internal Filter Sheet fallback when not controlled by parent */}
      {!onOpenFilter && (
        <FinancePeriodFilterSheet
          visible={internalSheetOpen}
          onClose={() => setInternalSheetOpen(false)}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={onSelectPeriod}
        />
      )}
    </View>
  );
};

export const FinancePeriodFilterBar = PeriodFilterChips;
export default PeriodFilterChips;
