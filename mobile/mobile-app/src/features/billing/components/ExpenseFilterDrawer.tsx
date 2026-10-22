import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Chip } from '@/components/common/Chip';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { DatePicker } from '@/components/common/DatePicker';
import { formatDateString } from '@/components/common/DatePickerModal';
import { TextInput } from '@/components/forms/TextInput';
import { Calendar, Layers, Tag, CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';

export interface ExpenseFilterValues {
  status: string;
  expenseType: string;
  category: string;
  startDate: string;
  endDate: string;
  datePreset?: string;
}

interface ExpenseFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: ExpenseFilterValues;
  onApply: (newFilters: ExpenseFilterValues) => void;
  onReset: () => void;
}

export const ExpenseFilterDrawer: React.FC<ExpenseFilterDrawerProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
}) => {
  const { t } = useTranslation();

  const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
  const [selectedExpenseType, setSelectedExpenseType] = useState(filters.expenseType || '');
  const [selectedCategory, setSelectedCategory] = useState(filters.category || '');
  const [datePreset, setDatePreset] = useState(filters.datePreset || 'ALL_TIME');
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');

  useEffect(() => {
    if (visible) {
      setSelectedStatus(filters.status || '');
      setSelectedExpenseType(filters.expenseType || '');
      setSelectedCategory(filters.category || '');
      setDatePreset(filters.datePreset || (filters.startDate || filters.endDate ? 'CUSTOM' : 'ALL_TIME'));
      setStartDate(filters.startDate || '');
      setEndDate(filters.endDate || '');
    }
  }, [visible, filters]);

  const datePresets = useMemo(
    () => [
      { id: 'ALL_TIME', label: t('all_time', 'All Time') },
      { id: 'TODAY', label: t('today', 'Today') },
      { id: 'THIS_WEEK', label: t('this_week', 'This Week') },
      { id: 'THIS_MONTH', label: t('this_month', 'This Month') },
      { id: 'THIS_YEAR', label: t('this_year', 'This Year') },
      { id: 'CUSTOM', label: t('custom_range', 'Custom Range') },
    ],
    [t]
  );

  const quickCategories = useMemo(
    () => [
      'Repairs & Maintenance',
      'Electricity',
      'Water Supply',
      'Security',
      'Cleaning & Janitorial',
      'Gardening & Landscaping',
      'Office Supplies',
      'Plumbing',
      'Hardware & Tools',
      'Pest Control',
      'Waste Management',
    ],
    []
  );

  const handleSelectPreset = (presetId: string) => {
    setDatePreset(presetId);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (presetId === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    } else if (presetId === 'TODAY') {
      setStartDate(formatDateString(now));
      setEndDate(formatDateString(now));
    } else if (presetId === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const monday = new Date(y, m, now.getDate() + diff);
      const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
      setStartDate(formatDateString(monday));
      setEndDate(formatDateString(sunday));
    } else if (presetId === 'THIS_MONTH') {
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      setStartDate(formatDateString(firstDay));
      setEndDate(formatDateString(lastDay));
    } else if (presetId === 'THIS_YEAR') {
      const firstDay = new Date(y, 0, 1);
      const lastDay = new Date(y, 11, 31);
      setStartDate(formatDateString(firstDay));
      setEndDate(formatDateString(lastDay));
    }
  };

  const handleApply = () => {
    onApply({
      status: selectedStatus,
      expenseType: selectedExpenseType,
      category: selectedCategory.trim(),
      startDate,
      endDate,
      datePreset,
    });
    onClose();
  };

  const handleResetInternal = () => {
    setSelectedStatus('');
    setSelectedExpenseType('');
    setSelectedCategory('');
    setDatePreset('ALL_TIME');
    setStartDate('');
    setEndDate('');
    onReset();
    onClose();
  };

  const totalActiveCount =
    (selectedStatus && selectedStatus !== 'ALL' && selectedStatus !== '' ? 1 : 0) +
    (selectedExpenseType && selectedExpenseType !== 'ALL' && selectedExpenseType !== '' ? 1 : 0) +
    (selectedCategory.trim() !== '' ? 1 : 0) +
    (datePreset !== 'ALL_TIME' || startDate || endDate ? 1 : 0);

  const renderDateSection = () => (
    <View className="gap-3 pt-1">
      <View className="flex-row flex-wrap gap-2">
        {datePresets.map((preset) => (
          <Chip
            key={preset.id}
            label={preset.label}
            selected={datePreset === preset.id}
            onPress={() => handleSelectPreset(preset.id)}
            className="py-1.5 px-3"
          />
        ))}
      </View>

      {datePreset === 'CUSTOM' || startDate || endDate ? (
        <View className="gap-2.5 pt-2 border-t border-border/40 mt-1">
          <DatePicker
            label={t('from_date', 'From Date')}
            value={startDate ? new Date(`${startDate}T00:00:00`) : null}
            onChange={(d) => {
              setStartDate(formatDateString(d));
              setDatePreset('CUSTOM');
            }}
            placeholder={t('select_start_date', 'Select From Date')}
          />
          <DatePicker
            label={t('to_date', 'To Date')}
            value={endDate ? new Date(`${endDate}T00:00:00`) : null}
            onChange={(d) => {
              setEndDate(formatDateString(d));
              setDatePreset('CUSTOM');
            }}
            placeholder={t('select_end_date', 'Select To Date')}
          />
        </View>
      ) : null}
    </View>
  );

  const renderCategorySection = () => (
    <View className="gap-3 pt-1">
      <TextInput
        label={t('custom_category', 'Category Name')}
        value={selectedCategory}
        placeholder={t('category_placeholder', 'e.g. Repairs, Electricity, Cleaning')}
        clearable
        onChangeText={setSelectedCategory}
      />

      <View className="gap-1.5 pt-1">
        <Text className="text-xs font-semibold text-muted-foreground">
          {t('quick_categories', 'Popular Categories')}
        </Text>
        <View className="flex-row flex-wrap gap-2 pt-1">
          <Chip
            label={t('all', 'All Categories')}
            selected={!selectedCategory}
            onPress={() => setSelectedCategory('')}
            className="py-1 px-2.5"
          />
          {quickCategories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              selected={selectedCategory.toLowerCase() === cat.toLowerCase()}
              onPress={() => setSelectedCategory(selectedCategory.toLowerCase() === cat.toLowerCase() ? '' : cat)}
              className="py-1 px-2.5"
            />
          ))}
        </View>
      </View>
    </View>
  );

  const categoryConfigs: FilterCategoryConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('status', 'Payment Status'),
        icon: CheckCircle2,
        type: 'radio',
        options: [
          { id: '', label: t('all_statuses', 'All Statuses') },
          { id: 'UNPAID', label: t('unpaid', 'Unpaid') },
          { id: 'PARTIALLY_PAID', label: t('partially_paid', 'Partially Paid') },
          { id: 'PAID', label: t('paid', 'Paid') },
        ],
        selectedValues: selectedStatus,
        selectedCount: selectedStatus !== '' ? 1 : 0,
        onOptionSelect: (val) => setSelectedStatus(val),
      },
      {
        id: 'expenseType',
        label: t('expense_type', 'Expense Type'),
        icon: Layers,
        type: 'radio',
        options: [
          { id: '', label: t('all_types', 'All Types') },
          { id: 'PURCHASE', label: t('purchase', 'Purchase for Community') },
          { id: 'REPAIRS_MAINTENANCE', label: t('repairs_maintenance', 'Repairs & Maintenance') },
          { id: 'BILLS_UTILITIES', label: t('bills_utilities', 'Bills & Utilities') },
          { id: 'SERVICES_LABOUR', label: t('services_labour', 'Services & Labour') },
          { id: 'OTHER', label: t('other_expense', 'Other Expense') },
        ],
        selectedValues: selectedExpenseType,
        selectedCount: selectedExpenseType !== '' ? 1 : 0,
        onOptionSelect: (val) => setSelectedExpenseType(val),
      },
      {
        id: 'category',
        label: t('category', 'Category'),
        icon: Tag,
        type: 'custom',
        selectedCount: selectedCategory.trim() !== '' ? 1 : 0,
        renderCustom: renderCategorySection,
      },
      {
        id: 'date',
        label: t('date_range', 'Date Range'),
        icon: Calendar,
        type: 'custom',
        selectedCount: datePreset !== 'ALL_TIME' || startDate || endDate ? 1 : 0,
        renderCustom: renderDateSection,
      },
    ],
    [selectedStatus, selectedExpenseType, selectedCategory, datePreset, startDate, endDate, t]
  );

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title={t('filter_expenses', 'Filter Expenses')}
      categories={categoryConfigs}
      onApply={handleApply}
      onClearAll={handleResetInternal}
      totalActiveCount={totalActiveCount}
    />
  );
};

export default ExpenseFilterDrawer;
