import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, ScrollView } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownSelectProps {
  label?: string;
  options: DropdownOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  inline?: boolean;
  accordion?: boolean;
}

export const DropdownSelect = ({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  error,
  className,
  inline = false,
  accordion = false,
}: DropdownSelectProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handlePress = () => {
    if (inline || accordion) {
      setIsOpen(!isOpen);
    } else {
      setModalVisible(true);
    }
  };

  return (
    <View 
      className={cn('w-full', !accordion && 'relative', className)}
      style={(inline || accordion) && isOpen && !accordion ? { zIndex: 1000 } : undefined}
    >
      {Boolean(label) && (
        <Text className="mb-1.5 text-sm font-medium text-foreground">
          {label}
        </Text>
      )}
      
      <Pressable
        className={cn(
          'flex-row items-center justify-between rounded-xl border border-border bg-card px-3 py-3.5',
          Boolean(error) && 'border-destructive'
        )}
        onPress={handlePress}
      >
        <Text
          className={cn(
            'text-base',
            selectedOption ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={20} className="text-muted-foreground" />
      </Pressable>

      {Boolean(error) && (
        <Text className="mt-1.5 text-xs text-destructive">
          {error}
        </Text>
      )}

      {/* Inline/Accordion Dropdown List overlay */}
      {(inline || accordion) && isOpen && (
        <View 
          className={cn(
            'bg-card border border-border rounded-xl shadow-lg mt-1 overflow-hidden',
            accordion ? 'relative' : 'absolute left-0 right-0 z-[1000]'
          )}
          style={{ 
            top: accordion ? undefined : '100%', 
            maxHeight: accordion ? 300 : 200, 
            elevation: accordion ? 0 : 5,
          }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.map((item) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  key={item.value}
                  className={cn(
                    'flex-row items-center justify-between px-4 py-3 border-b border-border/40 last:border-b-0',
                    isSelected && 'bg-primary/10'
                  )}
                  onPress={() => {
                    onValueChange(item.value);
                    setIsOpen(false);
                  }}
                >
                  <Text
                    className={cn(
                      'text-sm',
                      isSelected
                        ? 'font-bold text-primary'
                        : 'text-foreground'
                    )}
                  >
                    {item.label}
                  </Text>
                  {isSelected && <Check size={16} className="text-primary" />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Full Sheet Modal Dropdown for standard (non-inline) usage */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable 
            className="absolute top-0 bottom-0 left-0 right-0" 
            onPress={() => setModalVisible(false)} 
          />
          <View className="max-h-[70%] rounded-t-3xl bg-card p-4 border-t border-border shadow-lg">
            <Text className="mb-4 text-center text-lg font-bold text-foreground">
              {label || 'Select'}
            </Text>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    className={cn(
                      'flex-row items-center justify-between rounded-xl px-4 py-4 mb-1',
                      isSelected && 'bg-primary/10'
                    )}
                    onPress={() => {
                      onValueChange(item.value);
                      setModalVisible(false);
                    }}
                  >
                    <Text
                      className={cn(
                        'text-base',
                        isSelected
                          ? 'font-bold text-primary'
                          : 'text-foreground'
                      )}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Check size={20} className="text-primary" />}
                  </Pressable>
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DropdownSelect;
