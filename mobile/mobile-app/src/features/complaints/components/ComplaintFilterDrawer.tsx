import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { CheckCircle2, AlertTriangle, Tag, Layers } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';

export interface ComplaintFilterValues {
  status: string;
  priority: string;
  category: string;
}

export interface ComplaintFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: ComplaintFilterValues;
  onApply: (newFilters: ComplaintFilterValues) => void;
  onReset: () => void;
  availableCategories?: string[];
  statusCounts?: Record<string, number>;
}

const DEFAULT_STATUS_OPTIONS = [
  { id: 'ALL', label: 'All Statuses' },
  { id: 'UNASSIGNED', label: 'Unassigned / Open' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'ESCALATED', label: 'Escalated / SLA Breached' },
  { id: 'COMPLETED', label: 'Completed / Closed' },
];

const PRIORITY_OPTIONS = [
  { id: 'ALL', label: 'All Priorities' },
  { id: 'Critical', label: 'Critical' },
  { id: 'High', label: 'High Priority' },
  { id: 'Medium', label: 'Medium' },
  { id: 'Low', label: 'Low' },
];

const DEFAULT_CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'Plumbing', label: 'Plumbing' },
  { id: 'Electrical', label: 'Electrical' },
  { id: 'Carpentry', label: 'Carpentry' },
  { id: 'Civil & Masonry', label: 'Civil & Masonry' },
  { id: 'HVAC / AC Repair', label: 'HVAC / AC Repair' },
  { id: 'Security & Access', label: 'Security & Access' },
  { id: 'Housekeeping', label: 'Housekeeping' },
  { id: 'General', label: 'General' },
];

export const ComplaintFilterDrawer: React.FC<ComplaintFilterDrawerProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
  availableCategories,
  statusCounts = {},
}) => {
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState<string>(filters.status || 'ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>(filters.priority || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>(filters.category || 'ALL');

  useEffect(() => {
    if (visible) {
      setSelectedStatus(filters.status || 'ALL');
      setSelectedPriority(filters.priority || 'ALL');
      setSelectedCategory(filters.category || 'ALL');
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApply({
      status: selectedStatus,
      priority: selectedPriority,
      category: selectedCategory,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setSelectedCategory('ALL');
    onReset();
    onClose();
  };

  const statusOptions = useMemo(() => {
    return DEFAULT_STATUS_OPTIONS.map((opt) => ({
      ...opt,
      count: statusCounts[opt.id] !== undefined ? statusCounts[opt.id] : undefined,
    }));
  }, [statusCounts]);

  const categoryOptions = useMemo(() => {
    if (availableCategories && availableCategories.length > 0) {
      return [
        { id: 'ALL', label: 'All Categories' },
        ...availableCategories.map((cat) => ({ id: cat, label: cat })),
      ];
    }
    return DEFAULT_CATEGORIES;
  }, [availableCategories]);

  const totalActiveCount =
    (selectedStatus !== 'ALL' && selectedStatus !== '' ? 1 : 0) +
    (selectedPriority !== 'ALL' && selectedPriority !== '' ? 1 : 0) +
    (selectedCategory !== 'ALL' && selectedCategory !== '' ? 1 : 0);

  const categoryConfigs: FilterCategoryConfig[] = useMemo(() => [
    {
      id: 'status',
      label: 'Ticket Status',
      icon: Layers,
      type: 'radio',
      options: statusOptions,
      selectedValues: selectedStatus,
      selectedCount: selectedStatus !== 'ALL' && selectedStatus !== '' ? 1 : 0,
      onOptionSelect: (val) => setSelectedStatus(val),
    },
    {
      id: 'priority',
      label: 'Priority Level',
      icon: AlertTriangle,
      type: 'radio',
      options: PRIORITY_OPTIONS,
      selectedValues: selectedPriority,
      selectedCount: selectedPriority !== 'ALL' && selectedPriority !== '' ? 1 : 0,
      onOptionSelect: (val) => setSelectedPriority(val),
    },
    {
      id: 'category',
      label: 'Work Category',
      icon: Tag,
      type: 'radio',
      options: categoryOptions,
      selectedValues: selectedCategory,
      selectedCount: selectedCategory !== 'ALL' && selectedCategory !== '' ? 1 : 0,
      onOptionSelect: (val) => setSelectedCategory(val),
    },
  ], [selectedStatus, selectedPriority, selectedCategory, statusOptions, categoryOptions]);

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title={t('filter_complaints', 'Filter Complaints')}
      categories={categoryConfigs}
      onApply={handleApply}
      onClearAll={handleReset}
      totalActiveCount={totalActiveCount}
    />
  );
};

export default ComplaintFilterDrawer;
