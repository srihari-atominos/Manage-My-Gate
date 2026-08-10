import React from 'react';
import { View } from 'react-native';
import { PaginatedList, ListCard } from '@/components/ui';
import { Button } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { Calculator, Play } from 'lucide-react-native';

interface AssessmentTemplateListProps {
  templates: any[];
  pagination?: { currentPage: number; totalPages: number; totalRecords: number; limit: number };
  loading?: boolean;
  onRefresh?: () => void;
  onTriggerBatch: (template: any) => void;
}

export const AssessmentTemplateList: React.FC<AssessmentTemplateListProps> = ({
  templates = [],
  pagination = { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 },
  loading = false,
  onRefresh = () => {},
  onTriggerBatch,
}) => {
  const currencySymbol = '₹';

  const renderItem = (item: any) => {
    return (
      <ListCard
        title={item.title || item.name || 'Assessment Schedule'}
        subtitle={`Period: ${item.frequency || 'Monthly'} • Base Rate: ${currencySymbol}${item.rate || item.baseAmount || 0}`}
        leftIcon="Calculator"
        leftIconBgColor="#dcfce7"
        leftIconColor="#16a34a"
        status={{
          label: item.status || 'ACTIVE',
          variant: item.status === 'INACTIVE' ? 'neutral' : 'success',
        }}
        rightContent={
          <Button
            variant="default"
            size="sm"
            onPress={() => onTriggerBatch(item)}
          >
            <Play size={14} className="me-1" />
            Generate Bills
          </Button>
        }
      />
    );
  };

  return (
    <PaginatedList
      data={templates}
      renderItem={(item: any) => renderItem(item)}
      pagination={pagination}
      onLoadMore={() => {}}
      onRefresh={onRefresh}
      loading={loading}
      emptyIcon="Calculator"
      emptyTitle="No Assessment Templates"
      emptySubtitle="No recurring maintenance levy schedules configured for this community."
    />
  );
};

export default AssessmentTemplateList;
