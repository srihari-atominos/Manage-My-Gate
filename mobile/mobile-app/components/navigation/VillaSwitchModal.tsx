import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Home, Check, X, Building2 } from 'lucide-react-native';

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

// Sample units list for multi-unit owners/residents
const MOCK_USER_UNITS: VillaUnit[] = [
  { id: '1', unitNumber: 'Villa 12', block: 'Block A', residencyType: 'Owner' },
  { id: '2', unitNumber: 'Villa 15', block: 'Block B', residencyType: 'Owner' },
  { id: '3', unitNumber: 'Villa 24', block: 'Block C', residencyType: 'Tenant' },
];

export const VillaSwitchModal: React.FC<VillaSwitchModalProps> = ({
  visible,
  onClose,
  activeVilla,
  onSelectVilla,
  communityName = 'Green Meadows',
}) => {
  const handleSelect = (unitNumber: string) => {
    onSelectVilla(unitNumber);
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
              {MOCK_USER_UNITS.map((unit) => {
                const isSelected = unit.unitNumber === activeVilla;
                return (
                  <TouchableOpacity
                    key={unit.id}
                    onPress={() => handleSelect(unit.unitNumber)}
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
                          {unit.block} • {unit.residencyType}
                        </Text>
                      </View>
                    </View>

                    {isSelected && <Check size={18} color="#03A9F4" />}
                  </TouchableOpacity>
                );
              })}
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
