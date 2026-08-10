import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, TouchableWithoutFeedback } from 'react-native';
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
}

export const DropdownSelect = ({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  error,
  className,
}: DropdownSelectProps) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View className={cn('w-full', className)}>
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Text>
      )}
      
      <Pressable
        className={cn(
          'flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3.5 dark:border-slate-800 dark:bg-slate-900',
          error && 'border-red-500 dark:border-red-500'
        )}
        onPress={() => setModalVisible(true)}
      >
        <Text
          className={cn(
            'text-base',
            selectedOption ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={20} className="text-slate-400" />
      </Pressable>

      {error && (
        <Text className="mt-1.5 text-xs text-red-500">
          {error}
        </Text>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View className="flex-1 justify-end bg-black/40">
            <TouchableWithoutFeedback>
              <View className="max-h-[70%] rounded-t-3xl bg-white p-4 dark:bg-slate-900">
                <Text className="mb-4 text-center text-lg font-bold text-slate-900 dark:text-white">
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
                          'flex-row items-center justify-between rounded-xl px-4 py-4',
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
                              : 'text-slate-700 dark:text-slate-200'
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};
