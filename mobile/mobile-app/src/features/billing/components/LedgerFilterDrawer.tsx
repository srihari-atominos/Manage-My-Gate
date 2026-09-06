import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { DatePicker } from '@/components/common/DatePicker';
import { formatDateString } from '@/components/common/DatePickerModal';
import { Calendar, Building2, CreditCard, RotateCcw, Check } from 'lucide-react-native';
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
  { id: 'CHEQUE', label: 'Cheque' },
  { id: 'NEFT', label: 'NEFT / RTGS' },
  { id: 'CASH', label: 'Cash' },
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

  const blockOptions = [
    { label: 'All Blocks & Buildings', value: 'ALL' },
    ...availableBlocks.map((b) => ({ label: `Block ${b}`, value: b })),
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Advanced Ledger Filters">
      <View className="gap-5 py-2">
        {/* Section 1: Date Range */}
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <Text className="font-bold text-sm text-foreground">Date Range</Text>
          </View>
          
          {/* Date Preset Chips using catalog Chip component */}
          <View className="flex-row flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <Chip
                key={preset.id}
                label={preset.label}
                selected={datePreset === preset.id}
                onPress={() => handleSelectPreset(preset.id)}
              />
            ))}
          </View>

          {/* Reusable DatePicker components for Start and End Date */}
          {datePreset === 'CUSTOM' || startDate || endDate ? (
            <View className="flex-row items-center gap-3 pt-1">
              <View className="flex-1">
                <DatePicker
                  label="Start Date"
                  value={startDate ? new Date(`${startDate}T00:00:00`) : null}
                  onChange={(d) => {
                    setStartDate(formatDateString(d));
                    setDatePreset('CUSTOM');
                  }}
                  placeholder="Select Start Date"
                />
              </View>
              <View className="flex-1">
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
            </View>
          ) : null}
        </View>

        {/* Section 2: Block / Building */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Building2 size={16} className="text-primary" />
            <Text className="font-bold text-sm text-foreground">Block / Building</Text>
          </View>
          <DropdownSelect
            options={blockOptions}
            value={selectedBlock}
            onValueChange={setSelectedBlock}
            placeholder="Select Community Block"
          />
        </View>

        {/* Section 3: Payment Method */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <CreditCard size={16} className="text-primary" />
            <Text className="font-bold text-sm text-foreground">Payment Method</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <Chip
                key={pm.id}
                label={pm.label}
                selected={selectedPaymentMethod === pm.id}
                onPress={() => setSelectedPaymentMethod(pm.id)}
              />
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onPress={handleResetInternal}
            accessibilityLabel="Reset Filters"
          >
            <RotateCcw size={16} className="me-2 text-muted-foreground" />
            <Text className="font-bold text-sm text-foreground">Reset All</Text>
          </Button>

          <Button
            variant="default"
            size="lg"
            className="flex-1 bg-primary"
            onPress={handleApply}
            accessibilityLabel="Apply Filters"
          >
            <Check size={16} className="me-2 text-primary-foreground" />
            <Text className="font-bold text-sm text-primary-foreground">Apply Filters</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default LedgerFilterDrawer;
