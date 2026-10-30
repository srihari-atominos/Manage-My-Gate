import React, { useEffect, useMemo, useState } from 'react';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { Calendar } from 'lucide-react-native';
import { type ReportingPeriod } from '../types';
import { getPeriodDateRange } from '../utils/financeFormatters';

export interface FinancePeriodFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedPeriod: ReportingPeriod;
  onSelectPeriod: (period: ReportingPeriod) => void;
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

const getPeriodDescription = (period: ReportingPeriod): string => {
  const { startDate, endDate } = getPeriodDateRange(period);
  if (!startDate || !endDate) return 'Full community financial history (All Records)';
  if (startDate === endDate) return formatDateDisplay(startDate);
  return `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
};

const PERIOD_DEFINITIONS: { id: ReportingPeriod; label: string; summary: string }[] = [
  { id: 'Today', label: 'Today', summary: "Today's transactions and live balance" },
  { id: 'This Week', label: 'This Week', summary: 'Current week (Monday to Sunday)' },
  { id: 'This Month', label: 'This Month', summary: 'Current calendar month (Default)' },
  { id: 'Last Month', label: 'Last Month', summary: 'Previous closed calendar month' },
  { id: 'This Year', label: 'This Year', summary: 'Financial year to date' },
  { id: 'Previous Year', label: 'Previous Year', summary: 'Full previous financial year' },
  { id: 'All Time', label: 'All Time', summary: 'Complete financial history without date constraints' },
];

export const FinancePeriodFilterSheet: React.FC<FinancePeriodFilterSheetProps> = ({
  visible,
  onClose,
  selectedPeriod,
  onSelectPeriod,
}) => {
  const [draftPeriod, setDraftPeriod] = useState<ReportingPeriod>(selectedPeriod);

  useEffect(() => {
    if (visible) {
      setDraftPeriod(selectedPeriod);
    }
  }, [visible, selectedPeriod]);

  const activeCount = useMemo(() => (draftPeriod !== 'This Month' ? 1 : 0), [draftPeriod]);

  const handleApply = () => {
    onSelectPeriod(draftPeriod);
    onClose();
  };

  const handleReset = () => {
    setDraftPeriod('This Month');
    onSelectPeriod('This Month');
    onClose();
  };

  const categoryConfigs: FilterCategoryConfig[] = useMemo(() => {
    const options = PERIOD_DEFINITIONS.map((def) => {
      const dateText = getPeriodDescription(def.id);
      return {
        id: def.id,
        label: def.label,
        description: `${def.summary} • ${dateText}`,
      };
    });

    return [
      {
        id: 'period',
        label: 'Reporting Period',
        icon: Calendar,
        type: 'radio' as const,
        options,
        selectedValues: draftPeriod,
        selectedCount: activeCount,
        onOptionSelect: (val) => setDraftPeriod(val as ReportingPeriod),
      },
    ];
  }, [draftPeriod, activeCount]);

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title="Filter Reporting Period"
      categories={categoryConfigs}
      onApply={handleApply}
      onClearAll={handleReset}
      totalActiveCount={activeCount}
      applyLabel="Apply Period"
      clearLabel="Reset to Default"
    />
  );
};

export default FinancePeriodFilterSheet;
