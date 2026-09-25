import React, { useMemo } from 'react';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { Layers, Building2 } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';

interface VillaFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  availableStatuses: string[];
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  availableBlocks?: string[];
  selectedBlock?: string;
  onSelectBlock?: (block: string) => void;
  onClearAll: () => void;
}

export const VillaFilterSheet: React.FC<VillaFilterSheetProps> = ({
  visible,
  onClose,
  availableStatuses,
  selectedStatus,
  onSelectStatus,
  availableBlocks = [],
  selectedBlock = '',
  onSelectBlock,
  onClearAll,
}) => {
  const { t } = useTranslation();

  const totalActiveCount = (selectedStatus ? 1 : 0) + (selectedBlock ? 1 : 0);

  const categoryConfigs: FilterCategoryConfig[] = useMemo(() => {
    const categories: FilterCategoryConfig[] = [
      {
        id: 'status',
        label: t('unit_status', 'Unit Status'),
        icon: Layers,
        type: 'radio',
        options: [
          { id: '', label: t('all_statuses', 'All Statuses') },
          ...availableStatuses.map((st) => ({
            id: st,
            label: t(st, st),
          })),
        ],
        selectedValues: selectedStatus,
        selectedCount: selectedStatus ? 1 : 0,
        onOptionSelect: (val) => {
          onSelectStatus(val);
        },
      },
    ];

    if (availableBlocks.length > 0 && onSelectBlock) {
      categories.push({
        id: 'block',
        label: t('block_building', 'Block / Building'),
        icon: Building2,
        type: 'radio',
        options: [
          { id: '', label: t('all_blocks', 'All Blocks') },
          ...availableBlocks.map((blk) => ({
            id: blk,
            label: `${t('block', 'Block')} ${blk}`,
          })),
        ],
        selectedValues: selectedBlock,
        selectedCount: selectedBlock ? 1 : 0,
        onOptionSelect: (val) => {
          onSelectBlock(val);
        },
      });
    }

    return categories;
  }, [availableStatuses, selectedStatus, onSelectStatus, availableBlocks, selectedBlock, onSelectBlock, t]);

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title={t('filter_units', 'Filter Units')}
      categories={categoryConfigs}
      onApply={onClose}
      onClearAll={() => {
        onClearAll();
        onClose();
      }}
      totalActiveCount={totalActiveCount}
    />
  );
};

export default VillaFilterSheet;
