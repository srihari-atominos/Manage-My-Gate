import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Villa } from '../store/villaSlice';
import { VillaPayload } from '../services/villaService';
import { parseBackendError, validateRequired, validateNumber } from '@/src/utils/validation';

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

  // Field-level error states
  const [unitError, setUnitError] = useState<string | undefined>(undefined);
  const [floorError, setFloorError] = useState<string | undefined>(undefined);
  const [areaError, setAreaError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);

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
    setUnitError(undefined);
    setFloorError(undefined);
    setAreaError(undefined);
    setGeneralError(null);
  }, [editingVilla, visible]);

  const handleUnitChange = (text: string) => {
    setUnitNumber(text);
    if (unitError) setUnitError(undefined);
    if (generalError) setGeneralError(null);
  };

  const handleFloorChange = (text: string) => {
    setFloor(text);
    if (floorError) setFloorError(undefined);
  };

  const handleAreaChange = (text: string) => {
    setFloorAreaSqFt(text);
    if (areaError) setAreaError(undefined);
  };

  const handleSubmit = async () => {
    setUnitError(undefined);
    setFloorError(undefined);
    setAreaError(undefined);
    setGeneralError(null);

    // Validate unit number
    if (!unitNumber.trim()) {
      setUnitError('Unit Number is required.');
      return;
    }

    // Validate floor if provided
    if (floor.trim()) {
      const floorRes = validateNumber(floor, { integerOnly: true, min: -5, max: 200, fieldLabel: 'Floor' });
      if (!floorRes.isValid) {
        setFloorError(floorRes.message);
        return;
      }
    }

    // Validate area if provided
    if (floorAreaSqFt.trim()) {
      const areaRes = validateNumber(floorAreaSqFt, { min: 1, max: 100000, fieldLabel: 'Floor Area' });
      if (!areaRes.isValid) {
        setAreaError(areaRes.message);
        return;
      }
    }

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
      const parsed = parseBackendError(err, 'Failed to save unit. Please try again.');
      if (parsed.isDuplicate || parsed.field === 'unitNumber') {
        setUnitError(`Villa / Unit "${unitNumber.trim()}" already exists in this community.`);
      } else {
        setGeneralError(parsed.userMessage);
      }
    }
  };

  const isEditing = Boolean(editingVilla);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={isEditing ? 'Edit Unit Details' : 'Create New Unit'}>
      <View className="space-y-3.5 py-2">
        {generalError && (
          <View className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl mb-2">
            <Text className="text-xs font-semibold text-destructive">{generalError}</Text>
          </View>
        )}

        <TextInput
          label="Unit Number"
          required
          placeholder="e.g. 101 or Villa-A"
          value={unitNumber}
          onChangeText={handleUnitChange}
          error={unitError}
          autoCapitalize="characters"
        />

        <TextInput
          label="Block / Building"
          placeholder="e.g. Block A"
          value={blockOrBuilding}
          onChangeText={setBlockOrBuilding}
          autoCapitalize="words"
        />

        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <TextInput
              label="Floor Level"
              placeholder="e.g. 1"
              keyboardType="numeric"
              value={floor}
              onChangeText={handleFloorChange}
              error={floorError}
            />
          </View>
          <View className="flex-1">
            <TextInput
              label="Area (sq.ft)"
              placeholder="e.g. 1500"
              keyboardType="numeric"
              value={floorAreaSqFt}
              onChangeText={handleAreaChange}
              error={areaError}
            />
          </View>
        </View>

        <DropdownSelect
          label="Unit Type"
          required
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
          required
          options={[
            { label: 'Vacant', value: 'Vacant' },
            { label: 'Occupied', value: 'Occupied' },
            { label: 'Under Maintenance', value: 'Under Maintenance' },
          ]}
          value={status}
          onValueChange={(val: any) => setStatus(val)}
        />

        <View className="pt-3">
          <Button
            variant="default"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            className="w-full"
          >
            {isEditing ? 'Save Changes' : 'Create Unit'}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};
