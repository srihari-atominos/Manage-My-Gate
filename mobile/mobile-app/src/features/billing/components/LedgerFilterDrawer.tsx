import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Chip } from '@/components/common/Chip';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { DatePicker } from '@/components/common/DatePicker';
import { formatDateString } from '@/components/common/DatePickerModal';
import { Calendar, Building2, CreditCard } from 'lucide-react-native';
import { fetchVillaBlocks } from '@/src/features/villa/services/villaService';

export interface LedgerFilterValues {
  startDate: string;
  endDate: string;
  datePreset: string;
  block: string;
  paymentMethod: string;
}

interface LedgerFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: LedgerFilterValues;
  onApply: (newFilters: LedgerFilterValues) => void;
  onReset: () => void;
}

const DATE_PRESETS = [
  { id: 'ALL_TIME', label: 'All Time' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'LAST_MONTH', label: 'Last Month' },
  { id: 'THIS_QUARTER', label: 'This Quarter' },
  { id: 'THIS_FY', label: 'FY 2026-27' },
  { id: 'CUSTOM', label: 'Custom Range' },
];

const PAYMENT_METHODS = [
  { id: 'ALL', label: 'All Methods' },
  { id: 'CASH', label: 'Cash' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
  { id: 'UPI', label: 'UPI / QR' },
  { id: 'CHEQUE', label: 'Cheque' },
  { id: 'DEMAND_DRAFT', label: 'Demand Draft' },
  { id: 'WALLET', label: 'Wallet' },
  { id: 'RAZORPAY', label: 'Online / Gateway' },
];

export const LedgerFilterDrawer: React.FC<LedgerFilterDrawerProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
}) => {
  const [datePreset, setDatePreset] = useState(filters.datePreset || 'ALL_TIME');
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');
  const [selectedBlock, setSelectedBlock] = useState(filters.block || 'ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(filters.paymentMethod || 'ALL');
  const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setDatePreset(filters.datePreset || 'ALL_TIME');
      setStartDate(filters.startDate || '');
      setEndDate(filters.endDate || '');
      setSelectedBlock(filters.block || 'ALL');
      setSelectedPaymentMethod(filters.paymentMethod || 'ALL');

      // Fetch distinct blocks for this community
      fetchVillaBlocks()
        .then((res: any) => {
          const raw = res?.data?.data || res?.data || res || [];
          const blocks = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
          setAvailableBlocks(
            blocks
              .map((b: any) => (typeof b === 'string' ? b : b?.block || b?.blockOrBuilding || b?._id || b?.name || ''))
              .filter((b: string) => Boolean(b) && b !== '[object Object]')
          );
        })
        .catch(() => {});
    }
  }, [visible, filters]);

  const handleSelectPreset = (presetId: string) => {
    setDatePreset(presetId);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (presetId === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    } else if (presetId === 'THIS_MONTH') {
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      setStartDate(formatDateString(firstDay));
      setEndDate(formatDateString(lastDay));
    } else if (presetId === 'LAST_MONTH') {
      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);
      setStartDate(formatDateString(firstDay));
      setEndDate(formatDateString(lastDay));
    } else if (presetId === 'THIS_QUARTER') {
      const q = Math.floor(m / 3);
      const firstDay = new Date(y, q * 3, 1);
      const lastDay = new Date(y, (q + 1) * 3, 0);
      setStartDate(formatDateString(firstDay));
      setEndDate(formatDateString(lastDay));
    } else if (presetId === 'THIS_FY') {
      const fyStartYear = m >= 3 ? y : y - 1;
      const firstDay = new Date(fyStartYear, 3, 1);
      const lastDay = new Date(fyStartYear + 1, 2, 31);
      setStartDate(formatDateString(firstDay));
      setEndDate(formatDateString(lastDay));
    }
  };

  const handleApply = () => {
    onApply({
      startDate,
      endDate,
      datePreset,
      block: selectedBlock,
      paymentMethod: selectedPaymentMethod,
    });
    onClose();
  };

  const handleResetInternal = () => {
    setDatePreset('ALL_TIME');
    setStartDate('');
    setEndDate('');
    setSelectedBlock('ALL');
    setSelectedPaymentMethod('ALL');
    onReset();
    onClose();
  };

  const blockOptions = useMemo(() => {
    const opts = [{ label: 'All Blocks', value: 'ALL' }];
    availableBlocks.forEach((blk) => {
      opts.push({ label: `Block ${blk}`, value: blk });
    });
    return opts;
  }, [availableBlocks]);

  const totalActiveCount =
    (datePreset !== 'ALL_TIME' || startDate || endDate ? 1 : 0) +
    (selectedBlock !== 'ALL' && selectedBlock !== '' ? 1 : 0) +
    (selectedPaymentMethod !== 'ALL' && selectedPaymentMethod !== '' ? 1 : 0);

  const renderDateSection = () => (
    <View className="gap-3 pt-1">
      {/* Date Preset Chips */}
      <View className="flex-row flex-wrap gap-2">
        {DATE_PRESETS.map((preset) => (
          <Chip
            key={preset.id}
            label={preset.label}
            selected={datePreset === preset.id}
            onPress={() => handleSelectPreset(preset.id)}
            className="py-1.5 px-3"
          />
        ))}
      </View>

      {/* DatePicker inputs for Start and End Date */}
      {datePreset === 'CUSTOM' || startDate || endDate ? (
        <View className="gap-2.5 pt-2 border-t border-border/40 mt-1">
          <DatePicker
            label="Start Date"
            value={startDate ? new Date(`${startDate}T00:00:00`) : null}
            onChange={(d) => {
              setStartDate(formatDateString(d));
              setDatePreset('CUSTOM');
            }}
            placeholder="Select Start Date"
          />
          <DatePicker
            label="End Date"
            value={endDate ? new Date(`${endDate}T00:00:00`) : null}
            onChange={(d) => {
              setEndDate(formatDateString(d));
              setDatePreset('CUSTOM');
            }}
            placeholder="Select End Date"
          />
        </View>
      ) : null}
    </View>
  );

  const renderBlockSection = () => (
    <View className="gap-3 pt-1">
      <DropdownSelect
        options={blockOptions}
        value={selectedBlock}
        onValueChange={setSelectedBlock}
        placeholder="Select Community Block"
      />
    </View>
  );

  const categoryConfigs: FilterCategoryConfig[] = useMemo(() => [
    {
      id: 'date',
      label: 'Date Range',
      icon: Calendar,
      type: 'custom',
      selectedCount: datePreset !== 'ALL_TIME' || startDate || endDate ? 1 : 0,
      renderCustom: renderDateSection,
    },
    {
      id: 'block',
      label: 'Block / Building',
      icon: Building2,
      type: 'custom',
      selectedCount: selectedBlock !== 'ALL' && selectedBlock !== '' ? 1 : 0,
      renderCustom: renderBlockSection,
    },
    {
      id: 'paymentMethod',
      label: 'Payment Method',
      icon: CreditCard,
      type: 'radio',
      options: PAYMENT_METHODS,
      selectedValues: selectedPaymentMethod,
      selectedCount: selectedPaymentMethod !== 'ALL' && selectedPaymentMethod !== '' ? 1 : 0,
      onOptionSelect: (val) => setSelectedPaymentMethod(val),
    },
  ], [datePreset, startDate, endDate, selectedBlock, selectedPaymentMethod, blockOptions]);

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title="Advanced Ledger Filters"
      categories={categoryConfigs}
      onApply={handleApply}
      onClearAll={handleResetInternal}
      totalActiveCount={totalActiveCount}
    />
  );
};

export default LedgerFilterDrawer;
