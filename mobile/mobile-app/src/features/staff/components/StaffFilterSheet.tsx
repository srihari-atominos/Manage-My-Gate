import React from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/common/Chip';
import { Text } from '@/components/ui/text';
import { DEPARTMENTS, STAFF_TYPES, STAFF_STATUSES } from '../hooks/useStaffManagement';

interface StaffFilterSheetProps {
  visible: boolean;
  selectedDepartment: string;
  selectedType: string;
  selectedStatus: string;
  onSelectDepartment: (dept: string) => void;
  onSelectType: (type: string) => void;
  onSelectStatus: (status: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export const StaffFilterSheet: React.FC<StaffFilterSheetProps> = ({
  visible,
  selectedDepartment,
  selectedType,
  selectedStatus,
  onSelectDepartment,
  onSelectType,
  onSelectStatus,
  onReset,
  onClose,
}) => {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filter Staff Registry">
      <View className="px-1 py-1">
        {/* Department Section */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-foreground mb-2.5">Department</Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="All Departments"
              selected={selectedDepartment === 'ALL'}
              onPress={() => onSelectDepartment('ALL')}
            />
            {DEPARTMENTS.map((dept) => (
              <Chip
                key={dept}
                label={dept}
                selected={selectedDepartment === dept}
                onPress={() => onSelectDepartment(dept)}
              />
            ))}
          </View>
        </View>

        {/* Staff Type Section */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-foreground mb-2.5">Staff Type</Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="All Types"
              selected={selectedType === 'ALL'}
              onPress={() => onSelectType('ALL')}
            />
            {STAFF_TYPES.map((type) => (
              <Chip
                key={type}
                label={type}
                selected={selectedType === type}
                onPress={() => onSelectType(type)}
              />
            ))}
          </View>
        </View>

        {/* Status Section */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-foreground mb-2.5">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="All Statuses"
              selected={selectedStatus === 'ALL'}
              onPress={() => onSelectStatus('ALL')}
            />
            {STAFF_STATUSES.map((status) => (
              <Chip
                key={status}
                label={status}
                selected={selectedStatus === status}
                onPress={() => onSelectStatus(status)}
              />
            ))}
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row gap-3 pt-2 border-t border-border/60">
          <Button variant="outline" className="flex-1" onPress={onReset}>
            Reset Filters
          </Button>
          <Button variant="default" className="flex-1" onPress={onClose}>
            Apply Filters
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default StaffFilterSheet;
