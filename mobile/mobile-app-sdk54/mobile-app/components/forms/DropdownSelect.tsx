import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, ScrollView, Platform, Alert } from 'react-native';
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
  const isInline = inline || accordion;

  const selectedOption = options.find((opt) => opt.value === value);

  const handlePress = () => {
    if (inline) {
      setIsOpen(!isOpen);
    } else {
      setModalVisible(true);
    }
  };

  return (
    <View 
      className={cn('w-full relative', className)}
      style={inline && isOpen ? { zIndex: 1000 } : undefined}
    >
      {Boolean(label) && (
        <Text className="mb-1.5 text-sm font-medium text-foreground">
          {label}
        </Text>
      )}
      
      <Pressable
        className={cn(
          'flex-row items-center justify-between rounded-2xl border border-border/80 bg-card px-3.5 py-3 shadow-xs active:bg-secondary/50',
          Boolean(error) && 'border-destructive bg-destructive/5'
        )}
        onPress={handlePress}
      >
        <Text
          className={cn(
            'text-[15px] font-sans',
            selectedOption ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={18} className="text-muted-foreground" />
      </Pressable>

      {Boolean(error) && (
        <Text className="mt-1 text-xs text-destructive font-medium ms-1">
          {error}
        </Text>
      )}

      {/* Inline Dropdown List overlay */}
      {isInline && isOpen && (
        <View 
          className="absolute left-0 right-0 z-[1000] bg-card border border-border rounded-xl shadow-lg mt-1 overflow-hidden"
          style={{ 
            top: '100%', 
            maxHeight: 200, 
            elevation: 5,
          }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.length === 0 ? (
              <View className="px-4 py-4 items-center justify-center">
                <Text className="text-sm text-muted-foreground italic">No options available</Text>
              </View>
            ) : (
              options.map((item) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    key={item.value}
                    className={cn(
                      'flex-row items-center justify-between px-4 py-3 border-b border-border/50 last:border-b-0',
                      isSelected && 'bg-primary/10'
                    )}
                    onPress={() => {
                      onValueChange(item.value);
                      setIsOpen(false);
                    }}
                  >
                    <Text
                      className={cn(
                        'text-sm font-sans',
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
              })
            )}
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
        <View className="flex-1 justify-end bg-black/60">
          <Pressable 
            className="absolute top-0 bottom-0 left-0 right-0" 
            onPress={() => setModalVisible(false)} 
          />
          <View className="max-h-[70%] rounded-t-3xl bg-card border-t border-border p-4 shadow-xl">
            <Text className="mb-4 text-center text-lg font-bold font-sans text-foreground">
              {label || 'Select'}
            </Text>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              ListEmptyComponent={() => (
                <View className="py-6 items-center justify-center">
                  <Text className="text-base text-muted-foreground italic">No options available</Text>
                </View>
              )}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    className={cn(
                      'flex-row items-center justify-between rounded-xl px-4 py-3.5 mb-1',
                      isSelected && 'bg-primary/10'
                    )}
                    onPress={() => {
                      onValueChange(item.value);
                      setModalVisible(false);
                    }}
                  >
                    <Text
                      className={cn(
                        'text-base font-sans',
                        isSelected
                          ? 'font-bold text-primary'
                          : 'text-foreground'
                      )}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Check size={18} className="text-primary" />}
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
