import React, { useMemo } from 'react';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { Layers, Shield } from 'lucide-react-native';

interface UserFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  availableRoles: string[];
  selectedRoles: string[];
  onToggleRole: (role: string) => void;
  onClearRoles: () => void;
  statusOptions: string[];
  selectedStatuses: string[];
  onToggleStatus: (status: string) => void;
}

export const UserFilterSheet: React.FC<UserFilterSheetProps> = ({
  visible,
  onClose,
  availableRoles,
  selectedRoles,
  onToggleRole,
  onClearRoles,
  statusOptions,
  selectedStatuses,
  onToggleStatus,
}) => {
  const handleClearAll = () => {
    onClearRoles();
    selectedStatuses.forEach((st) => onToggleStatus(st));
  };

  const totalActiveCount = selectedRoles.length + selectedStatuses.length;

  const categoryConfigs: FilterCategoryConfig[] = useMemo(() => [
    {
      id: 'status',
      label: 'Account Status',
      icon: Layers,
      type: 'checkbox',
      options: statusOptions.map((st) => ({ id: st, label: st })),
      selectedValues: selectedStatuses,
      selectedCount: selectedStatuses.length,
      onOptionToggle: onToggleStatus,
    },
    {
      id: 'roles',
      label: 'User Roles',
      icon: Shield,
      type: 'checkbox',
      options: availableRoles.map((role) => ({ id: role, label: role })),
      selectedValues: selectedRoles,
      selectedCount: selectedRoles.length,
      onOptionToggle: onToggleRole,
    },
  ], [statusOptions, selectedStatuses, availableRoles, selectedRoles, onToggleStatus, onToggleRole]);

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title="Filter Users"
      categories={categoryConfigs}
      onApply={onClose}
      onClearAll={handleClearAll}
      totalActiveCount={totalActiveCount}
    />
  );
};

export default UserFilterSheet;
