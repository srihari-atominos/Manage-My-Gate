import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Villa } from '../store/villaSlice';
import { VillaPayload } from '../services/villaService';

interface VillaFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: VillaPayload) => Promise<void>;
  editingVilla?: Villa | null;
  loading?: boolean;
}

export const VillaFormModal: React.FC<VillaFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  editingVilla,
  loading = false,
}) => {
  const [unitNumber, setUnitNumber] = useState('');
  const [blockOrBuilding, setBlockOrBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [floorAreaSqFt, setFloorAreaSqFt] = useState('');
  const [type, setType] = useState('Apartment');
  const [status, setStatus] = useState<'Vacant' | 'Occupied' | 'Under Maintenance'>('Vacant');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingVilla) {
      setUnitNumber(editingVilla.unitNumber || '');
      setBlockOrBuilding(editingVilla.blockOrBuilding || '');
      setFloor(editingVilla.floor !== undefined ? String(editingVilla.floor) : '');
      const sqFt = editingVilla.floorAreaSqFt || editingVilla.squareFeetArea;
      setFloorAreaSqFt(sqFt ? String(sqFt) : '');
      setType(editingVilla.type || 'Apartment');
      setStatus(editingVilla.status || 'Vacant');
    } else {
      setUnitNumber('');
      setBlockOrBuilding('');
      setFloor('');
      setFloorAreaSqFt('');
      setType('Apartment');
      setStatus('Vacant');
    }
    setErrorMsg(null);
  }, [editingVilla, visible]);

  const handleSubmit = async () => {
    if (!unitNumber.trim()) {
      setErrorMsg('Unit Number is required');
      return;
    }
    setErrorMsg(null);
    try {
      await onSubmit({
        unitNumber: unitNumber.trim(),
        blockOrBuilding: blockOrBuilding.trim() || undefined,
        floor: floor ? String(floor) : undefined,
        floorAreaSqFt: floorAreaSqFt ? Number(floorAreaSqFt) : undefined,
        squareFeetArea: floorAreaSqFt ? Number(floorAreaSqFt) : undefined,
        type,
        status,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save unit');
    }
  };

  const isEditing = Boolean(editingVilla);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={isEditing ? 'Edit Unit Details' : 'Create New Unit'}>
      <View className="space-y-3 py-2">
        {errorMsg && (
          <Text className="text-xs font-semibold text-destructive">{errorMsg}</Text>
        )}

        <TextInput
          label="Unit Number *"
          placeholder="e.g. 101 or Villa-A"
          value={unitNumber}
          onChangeText={setUnitNumber}
        />

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
              label="Area (sq.ft)"
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

        <View className="pt-2">
          <Button variant="default" onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : isEditing ? 'Save Changes' : 'Create Unit'}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default VillaFormModal;
