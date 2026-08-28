import React from 'react';
import { SegmentedControl } from '@/components/common/SegmentedControl';

export interface DirectoryCategoryTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DirectoryCategoryTabs = ({
  activeTab,
  onTabChange,
}: DirectoryCategoryTabsProps) => {
  return (
    <SegmentedControl
      segments={[
        { key: 'all', label: 'All' },
        { key: 'resident', label: 'Residents' },
        { key: 'guard', label: 'Security' },
        { key: 'staff', label: 'Staff' },
      ]}
      activeSegment={activeTab}
      onChange={onTabChange}
    />
  );
};

export default DirectoryCategoryTabs;
