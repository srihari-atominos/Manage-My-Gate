import React, { useEffect, useMemo, useState } from 'react';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { Calendar, ArrowUpDown, Building2, Layers } from 'lucide-react-native';
import {
  type ReportingPeriod,
  type TransactionTypeFilter,
  type TransactionDomainFilter,
  type TransactionStatusFilter,
  type TransactionFilters,
} from '../types';

export interface TransactionFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: TransactionFilters;
  onApplyFilters: (newFilters: {
    period: ReportingPeriod;
    type: TransactionTypeFilter;
    domain: TransactionDomainFilter;
    status: TransactionStatusFilter;
  }) => void;
  onClearAll: () => void;
}

const REPORTING_PERIODS: { id: ReportingPeriod; label: string }[] = [
  { id: 'Today', label: 'Today' },
  { id: 'This Week', label: 'This Week' },
  { id: 'This Month', label: 'This Month' },
  { id: 'Last Month', label: 'Last Month' },
  { id: 'This Year', label: 'This Year' },
  { id: 'Previous Year', label: 'Previous Year' },
  { id: 'All Time', label: 'All Time' },
];

const TRANSACTION_TYPES: { id: TransactionTypeFilter; label: string }[] = [
  { id: 'all', label: 'All Types' },
  { id: 'income', label: 'Inflows (Collections)' },
  { id: 'expense', label: 'Outflows (Disbursements)' },
];

const TRANSACTION_DOMAINS: { id: TransactionDomainFilter; label: string }[] = [
  { id: 'ALL', label: 'All Sources' },
  { id: 'INVOICE', label: 'Invoices' },
  { id: 'AMENITY', label: 'Amenities' },
  { id: 'EXPENSE', label: 'Expenses' },
];

const TRANSACTION_STATUSES: { id: TransactionStatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All Statuses' },
  { id: 'SUCCESS', label: 'Settled (Success)' },
  { id: 'PENDING', label: 'Pending Verification' },
  { id: 'REFUNDED', label: 'Refunded' },
];

export const TransactionFilterSheet: React.FC<TransactionFilterSheetProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onClearAll,
}) => {
  const [draftPeriod, setDraftPeriod] = useState<ReportingPeriod>(filters.period);
  const [draftType, setDraftType] = useState<TransactionTypeFilter>(filters.type);
  const [draftDomain, setDraftDomain] = useState<TransactionDomainFilter>(filters.domain);
  const [draftStatus, setDraftStatus] = useState<TransactionStatusFilter>(filters.status);

  useEffect(() => {
    if (visible) {
      setDraftPeriod(filters.period);
      setDraftType(filters.type);
      setDraftDomain(filters.domain);
      setDraftStatus(filters.status);
    }
  }, [visible, filters]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (draftPeriod !== 'This Month') count++;
    if (draftType !== 'all') count++;
    if (draftDomain !== 'ALL') count++;
    if (draftStatus !== 'ALL') count++;
    return count;
  }, [draftPeriod, draftType, draftDomain, draftStatus]);

  const handleApply = () => {
    onApplyFilters({
      period: draftPeriod,
      type: draftType,
      domain: draftDomain,
      status: draftStatus,
    });
    onClose();
  };

  const handleReset = () => {
    setDraftPeriod('This Month');
    setDraftType('all');
    setDraftDomain('ALL');
    setDraftStatus('ALL');
    onClearAll();
    onClose();
  };

  const categoryConfigs: FilterCategoryConfig[] = useMemo(() => [
    {
      id: 'period',
      label: 'Reporting Period',
      icon: Calendar,
      type: 'radio',
      options: REPORTING_PERIODS,
      selectedValues: draftPeriod,
      selectedCount: draftPeriod !== 'This Month' ? 1 : 0,
      onOptionSelect: (val) => setDraftPeriod(val as ReportingPeriod),
    },
    {
      id: 'type',
      label: 'Cash Flow Direction',
      icon: ArrowUpDown,
      type: 'radio',
      options: TRANSACTION_TYPES,
      selectedValues: draftType,
      selectedCount: draftType !== 'all' ? 1 : 0,
      onOptionSelect: (val) => setDraftType(val as TransactionTypeFilter),
    },
    {
      id: 'domain',
      label: 'Source / Channel',
      icon: Building2,
      type: 'radio',
      options: TRANSACTION_DOMAINS,
      selectedValues: draftDomain,
      selectedCount: draftDomain !== 'ALL' ? 1 : 0,
      onOptionSelect: (val) => setDraftDomain(val as TransactionDomainFilter),
    },
    {
      id: 'status',
      label: 'Settlement Status',
      icon: Layers,
      type: 'radio',
      options: TRANSACTION_STATUSES,
      selectedValues: draftStatus,
      selectedCount: draftStatus !== 'ALL' ? 1 : 0,
      onOptionSelect: (val) => setDraftStatus(val as TransactionStatusFilter),
    },
  ], [draftPeriod, draftType, draftDomain, draftStatus]);

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title="Filter Transactions"
      categories={categoryConfigs}
      onApply={handleApply}
      onClearAll={handleReset}
      totalActiveCount={activeCount}
    />
  );
};

export default TransactionFilterSheet;
