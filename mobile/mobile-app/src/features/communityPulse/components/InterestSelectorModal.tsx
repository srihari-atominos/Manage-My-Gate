import React, { useState, useEffect } from 'react';
import { View, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { X, Check, Heart } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { CommunityInterest } from '../types/communityPulseTypes';

export interface InterestSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  masterInterests: CommunityInterest[];
  selectedInterests: string[];
  onSave: (selectedIds: string[]) => void;
}

export const InterestSelectorModal = ({
  visible,
  onClose,
  masterInterests,
  selectedInterests,
  onSave,
}: InterestSelectorModalProps) => {
  const [currentSelected, setCurrentSelected] = useState<string[]>([]);

  useEffect(() => {
    setCurrentSelected(selectedInterests || []);
  }, [selectedInterests, visible]);

  const toggleInterest = (id: string) => {
    if (currentSelected.includes(id)) {
      setCurrentSelected(currentSelected.filter((item) => item !== id));
    } else {
      if (currentSelected.length >= 5) {
        Alert.alert('Limit Reached', 'You can select up to 5 community interests.');
        return;
      }
      setCurrentSelected([...currentSelected, id]);
    }
  };

  const handleSave = () => {
    onSave(currentSelected);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="bg-card border-t border-border rounded-t-3xl p-5 gap-4 max-h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-2 border-b border-border">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/20 items-center justify-center">
                <Heart size={16} className="text-rose-500" />
              </View>
              <View>
                <Text className="text-base font-bold text-foreground">Select Community Interests</Text>
                <Text className="text-[11px] text-muted-foreground">Choose 3–5 interests ({currentSelected.length}/5 selected)</Text>
              </View>
            </View>

            <Pressable onPress={onClose} className="p-1.5 rounded-full active:bg-muted/60">
              <X size={20} className="text-foreground" />
            </Pressable>
          </View>

          {/* Chips Selection Grid */}
          <ScrollView className="max-h-[350px]" showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap gap-2 pt-1 pb-2">
              {masterInterests.map((item) => {
                const isSelected = currentSelected.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleInterest(item.id)}
                    className={`flex-row items-center gap-2 px-3.5 py-2.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-rose-500/15 border-rose-500 shadow-xs'
                        : 'bg-card border-border active:bg-muted/40 shadow-xs'
                    }`}
                  >
                    <Text className="text-base">{item.emoji}</Text>
                    <Text
                      className={`text-xs ${
                        isSelected ? 'font-bold text-rose-500' : 'font-medium text-foreground'
                      }`}
                    >
                      {item.name}
                    </Text>
                    {isSelected && <Check size={14} className="text-rose-500 ms-1" />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Save Action */}
          <Button onPress={handleSave} leftIcon={Check} className="h-12 bg-primary rounded-xl">
            Save Interests ({currentSelected.length})
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default InterestSelectorModal;
