import React, { useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import {
  Search,
  X,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  type TransactionFilters,
  type ReportingPeriod,
  type TransactionTypeFilter,
  type TransactionDomainFilter,
  type TransactionStatusFilter,
} from '../types';

const REPORTING_PERIODS: ReportingPeriod[] = [
  'Today',
  'This Week',
  'This Month',
  'Last Month',
  'This Year',
  'Previous Year',
  'All Time',
];

const TRANSACTION_TYPES: {
  label: string;
  value: TransactionTypeFilter;
  icon?: any;
}[] = [
  { label: 'All', value: 'all' },
  { label: 'Inflows', value: 'income', icon: ArrowDownLeft },
  { label: 'Outflows', value: 'expense', icon: ArrowUpRight },
];

const TRANSACTION_DOMAINS: { label: string; value: TransactionDomainFilter }[] = [
  { label: 'All Sources', value: 'ALL' },
  { label: 'Invoices', value: 'INVOICE' },
  { label: 'Amenities', value: 'AMENITY' },
  { label: 'Expenses', value: 'EXPENSE' },
];

const TRANSACTION_STATUSES: { label: string; value: TransactionStatusFilter }[] = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Settled', value: 'SUCCESS' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Refunded', value: 'REFUNDED' },
];

interface TransactionFiltersBarProps {
  filters: TransactionFilters;
  onSearchChange: (text: string) => void;
  onPeriodChange: (period: ReportingPeriod) => void;
  onTypeChange: (type: TransactionTypeFilter) => void;
  onDomainChange: (domain: TransactionDomainFilter) => void;
  onStatusChange: (status: TransactionStatusFilter) => void;
  onClearFilters: () => void;
}

export const TransactionFiltersBar: React.FC<TransactionFiltersBarProps> = ({
  filters,
  onSearchChange,
  onPeriodChange,
  onTypeChange,
  onDomainChange,
  onStatusChange,
  onClearFilters,
}) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  const handleSearchChange = (text: string) => {
    setLocalSearch(text);
    onSearchChange(text);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.domain !== 'ALL' ||
    filters.status !== 'ALL' ||
    Boolean(filters.search && filters.search.trim().length > 0);

  return (
    <View className="bg-card border-b border-border/40 pb-3 pt-2.5">
      {/* 1. Search Bar (SearchFilterBar standard input style) */}
      <View className="px-4 mb-3">
        <View className="flex-row items-center h-11 border border-border/80 bg-background rounded-2xl px-3.5 shadow-2xs">
          <Icon as={Search} size={16} className="text-muted-foreground me-2 shrink-0" />
          <TextInput
            value={localSearch}
            onChangeText={handleSearchChange}
            placeholder="Search description, voucher, reference..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-xs text-foreground py-0 font-sans"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
          />
          {localSearch.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="p-1 rounded-full bg-muted/80 active:opacity-70">
              <Icon as={X} size={11} className="text-muted-foreground" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Type Filter Pill Segmented Control */}
      <View className="px-4 mb-2.5">
        <View className="flex-row items-center bg-muted/40 p-1 rounded-full border border-border/50">
          {TRANSACTION_TYPES.map((t) => {
            const isSelected = filters.type === t.value;
            const isIncome = t.value === 'income';
            const isExpense = t.value === 'expense';

            return (
              <TouchableOpacity
                key={`type-${t.value}`}
                onPress={() => onTypeChange(t.value)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Filter by type ${t.label}`}
                className={`flex-1 py-1.5 px-3 rounded-full flex-row items-center justify-center gap-1.5 transition-all ${
                  isSelected
                    ? isIncome
                      ? 'bg-card border border-emerald-500/30 shadow-sm'
                      : isExpense
                      ? 'bg-card border border-rose-500/30 shadow-sm'
                      : 'bg-card border border-border/60 shadow-sm'
                    : 'opacity-70'
                }`}>
                {t.icon && (
                  <Icon
                    as={t.icon}
                    size={12}
                    className={
                      isSelected
                        ? isIncome
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : isExpense
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-foreground'
                        : 'text-muted-foreground'
                    }
                  />
                )}
                <Text
                  className={`text-xs font-semibold ${
                    isSelected
                      ? isIncome
                        ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                        : isExpense
                        ? 'text-rose-700 dark:text-rose-400 font-bold'
                        : 'text-foreground font-bold'
                      : 'text-muted-foreground'
                  }`}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Period Chips (User Management Pill Tabs style) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-2"
        className="mb-2">
        {REPORTING_PERIODS.map((period) => {
          const isSelected = filters.period === period;
          return (
            <TouchableOpacity
              key={period}
              onPress={() => onPeriodChange(period)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Filter by period ${period}`}
              className={`py-1.5 px-4 rounded-full border transition-all ${
                isSelected
                  ? 'bg-primary border-primary shadow-sm'
                  : 'bg-card border-border/60'
              }`}>
              <Text
                className={`text-[11px] font-bold tracking-wide ${
                  isSelected ? 'text-white' : 'text-muted-foreground'
                }`}>
                {period}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 4. Domain & Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-2">
        {/* Domain filters */}
        {TRANSACTION_DOMAINS.map((d) => {
          const isSelected = filters.domain === d.value;
          return (
            <TouchableOpacity
              key={`domain-${d.value}`}
              onPress={() => onDomainChange(d.value)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Filter by domain ${d.label}`}
              className={`px-3 py-1 rounded-full border transition-all ${
                isSelected
                  ? 'bg-primary/10 border-primary/40'
                  : 'bg-card border-border/60'
              }`}>
              <Text
                className={`text-[11px] font-semibold ${
                  isSelected ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}>
                {d.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View className="h-4 w-px bg-border/40 mx-0.5 self-center" />

        {/* Status filters */}
        {TRANSACTION_STATUSES.map((s) => {
          const isSelected = filters.status === s.value;
          return (
            <TouchableOpacity
              key={`status-${s.value}`}
              onPress={() => onStatusChange(s.value)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Filter by status ${s.label}`}
              className={`px-3 py-1 rounded-full border transition-all ${
                isSelected
                  ? 'bg-primary/10 border-primary/40'
                  : 'bg-card border-border/60'
              }`}>
              <Text
                className={`text-[11px] font-semibold ${
                  isSelected ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Clear Filters Reset Button */}
        {hasActiveFilters && (
          <>
            <View className="h-4 w-px bg-border/40 mx-0.5 self-center" />
            <TouchableOpacity
              onPress={onClearFilters}
              activeOpacity={0.7}
              className="flex-row items-center rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 px-3 py-1">
              <Icon as={RotateCcw} size={11} className="text-rose-600 dark:text-rose-400 me-1" />
              <Text className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Reset</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default TransactionFiltersBar;
