import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Home, Check, X, Building2 } from 'lucide-react-native';

import { useDispatch } from 'react-redux';
import { switchWorkspaceContextThunk } from '../../src/features/auth/store/authSlice';

import { useAuth } from '../../src/features/auth/hooks/useAuth';

interface VillaUnit {
  id: string;
  unitNumber: string;
  block?: string;
  residencyType?: string;
}

interface VillaSwitchModalProps {
  visible: boolean;
  onClose: () => void;
  activeVilla: string;
  onSelectVilla: (villaNumber: string) => void;
  communityName?: string;
}

// Purely dynamic user units interface
export const VillaSwitchModal: React.FC<VillaSwitchModalProps> = ({
  visible,
  onClose,
  activeVilla,
  onSelectVilla,
  communityName = '',
}) => {
  const { user } = useAuth();
  const dispatch = useDispatch<any>();

  const userUnits: VillaUnit[] = React.useMemo(() => {
    const userAny = user as any;
    if (userAny?.accessibleUnits && Array.isArray(userAny.accessibleUnits) && userAny.accessibleUnits.length > 0) {
      return userAny.accessibleUnits.map((u: any, idx: number) => ({
        id: u.villaId || String(idx + 1),
        unitNumber: u.villaNumber || `Villa ${idx + 1}`,
        block: u.block || '',
        residencyType: u.residentType || 'Resident',
      }));
    }
    if (userAny?.villaNumber || userAny?.activeVillaNumber) {
      const vNum = userAny?.villaNumber || userAny?.activeVillaNumber;
      return [{ id: userAny?.villaId || '1', unitNumber: vNum, block: '', residencyType: userAny?.residencyType || 'Owner' }];
    }
    return [];
  }, [user]);

  const handleSelect = (unit: VillaUnit) => {
    dispatch(switchWorkspaceContextThunk({ targetVillaId: unit.id }));
    onSelectVilla(unit.unitNumber);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-card border border-border rounded-3xl w-full max-w-sm p-6 shadow-xl gap-4">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-2 border-b border-border">
            <View className="flex-row items-center gap-2">
              <View className="bg-primary/10 p-2 rounded-xl">
                <Home size={20} color="#03A9F4" />
              </View>
              <Text className="text-lg font-bold text-foreground">Switch Villa Unit</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
              <X size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-muted-foreground">
            Select a property unit context in <Text className="font-bold text-foreground">{communityName}</Text>:
          </Text>

          {/* Villa Units List */}
          <ScrollView className="max-h-60">
            <View className="gap-2.5">
              {userUnits.length > 0 ? (
                userUnits.map((unit) => {
                  const isSelected = unit.unitNumber === activeVilla;
                  return (
                    <TouchableOpacity
                      key={unit.id}
                      onPress={() => handleSelect(unit)}
                      activeOpacity={0.8}
                      className={`flex-row items-center justify-between p-3.5 rounded-2xl border ${
                        isSelected
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`p-2.5 rounded-xl ${
                            isSelected ? 'bg-primary/20' : 'bg-muted'
                          }`}
                        >
                          <Building2
                            size={18}
                            color={isSelected ? '#03A9F4' : '#777'}
                          />
                        </View>
                        <View>
                          <Text
                            className={`text-sm font-bold ${
                              isSelected ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {unit.unitNumber}
                          </Text>
                          <Text className="text-[10px] text-muted-foreground">
                            {unit.block ? `${unit.block} • ` : ''}{unit.residencyType}
                          </Text>
                        </View>
                      </View>

                      {isSelected && <Check size={18} color="#03A9F4" />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="bg-muted/30 border border-dashed border-border rounded-2xl p-5 items-center justify-center gap-1.5 my-2">
                  <Home size={24} color="#a1a1aa" />
                  <Text className="text-xs font-bold text-foreground text-center">No Unit Assigned</Text>
                  <Text className="text-[10px] text-muted-foreground text-center">
                    Your profile is not assigned to a property unit in this workspace.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <Button onPress={onClose} className="mt-2 h-11 bg-muted border border-border">
            <Text className="font-bold text-foreground text-sm">Cancel</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default VillaSwitchModal;
