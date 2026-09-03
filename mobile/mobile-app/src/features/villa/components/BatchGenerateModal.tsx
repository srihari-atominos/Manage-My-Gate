import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { BatchGenerateParams } from '../services/villaService';

interface BatchGenerateModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: BatchGenerateParams) => Promise<void>;
  loading?: boolean;
}

export const BatchGenerateModal: React.FC<BatchGenerateModalProps> = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [startNumber, setStartNumber] = useState('1');
  const [endNumber, setEndNumber] = useState('54');
  const [blockOrBuilding, setBlockOrBuilding] = useState('Block A');
  const [floor, setFloor] = useState('1');
  const [type, setType] = useState('Apartment');
  const [status, setStatus] = useState<'Vacant' | 'Occupied' | 'Under Maintenance'>('Vacant');
  const [floorAreaSqFt, setFloorAreaSqFt] = useState('1500');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBatchSubmit = async () => {
    const startNum = Number(startNumber);
    const endNum = Number(endNumber);

    if (!startNum || startNum < 1) {
      setErrorMsg('Start number must be at least 1');
      return;
    }
    if (!endNum || endNum < startNum) {
      setErrorMsg('End number must be greater than or equal to start number');
      return;
    }
    if (endNum - startNum > 200) {
      setErrorMsg('Cannot batch generate more than 200 units at once');
      return;
    }

    setErrorMsg(null);
    try {
      await onSubmit({
        prefix: '',
        startNumber: startNum,
        endNumber: endNum,
        config: {
          blockOrBuilding: blockOrBuilding.trim() || 'Block A',
          floor: floor.trim() || undefined,
          type: type || 'Apartment',
          status: status || 'Vacant',
          floorAreaSqFt: floorAreaSqFt ? Number(floorAreaSqFt) : undefined,
        },
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to batch generate units');
    }
  };

  const totalCalculated = Math.max(0, (Number(endNumber) || 0) - (Number(startNumber) || 0) + 1);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Batch Generate Community Units">
      <View className="space-y-3 py-2">
        <Text variant="muted" className="text-xs">
          Automatically create multiple units across a range (e.g. 01 to 54) with block and unit type metadata.
        </Text>

        {errorMsg && (
          <Text className="text-xs font-semibold text-destructive">{errorMsg}</Text>
        )}

        <View className="flex-row gap-2">
          <View className="flex-1">
            <TextInput
              label="Start Range *"
              placeholder="1"
              keyboardType="numeric"
              value={startNumber}
              onChangeText={setStartNumber}
            />
          </View>
          <View className="flex-1">
            <TextInput
              label="End Range *"
              placeholder="54"
              keyboardType="numeric"
              value={endNumber}
              onChangeText={setEndNumber}
            />
          </View>
        </View>

        <TextInput
          label="Block / Building"
          placeholder="e.g. Block A"
          value={blockOrBuilding}
          onChangeText={setBlockOrBuilding}
        />

        <View className="flex-row gap-2">
          <View className="flex-1">
            <TextInput
              label="Floor Level"
              placeholder="e.g. 1"
              keyboardType="numeric"
              value={floor}
              onChangeText={setFloor}
            />
          </View>
          <View className="flex-1">
            <TextInput
              label="Floor Area (sq.ft)"
              placeholder="e.g. 1500"
              keyboardType="numeric"
              value={floorAreaSqFt}
              onChangeText={setFloorAreaSqFt}
            />
          </View>
        </View>

        <DropdownSelect
          label="Unit Type"
          options={[
            { label: 'Apartment', value: 'Apartment' },
            { label: 'Villa', value: 'Villa' },
            { label: 'Studio', value: 'Studio' },
            { label: 'Penthouse', value: 'Penthouse' },
            { label: '1 BHK', value: 'BHK1' },
            { label: '2 BHK', value: 'BHK2' },
            { label: '3 BHK', value: 'BHK3' },
            { label: '4 BHK', value: 'BHK4' },
            { label: 'Duplex', value: 'Duplex' },
          ]}
          value={type}
          onValueChange={(val: string) => setType(val)}
        />

        <DropdownSelect
          label="Unit Status"
          options={[
            { label: 'Vacant', value: 'Vacant' },
            { label: 'Occupied', value: 'Occupied' },
            { label: 'Under Maintenance', value: 'Under Maintenance' },
          ]}
          value={status}
          onValueChange={(val: string) => setStatus(val as any)}
        />

        <View className="bg-primary/10 p-3 rounded-xl border border-primary/20 items-center my-1">
          <Text className="text-sm font-bold text-primary">
            Will generate {totalCalculated} units ({startNumber.padStart(2, '0')} to {endNumber.padStart(2, '0')})
          </Text>
        </View>

        <View className="pt-2">
          <Button variant="default" onPress={handleBatchSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : `Generate ${totalCalculated} Units`}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default BatchGenerateModal;
