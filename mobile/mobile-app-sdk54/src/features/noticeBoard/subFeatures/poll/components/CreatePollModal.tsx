import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';

interface CreatePollModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (pollData: any) => Promise<void>;
}

export function CreatePollModal({ visible, onClose, onSubmit }: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  
  // Set default end date to 7 days from now
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 7);
  const [endDate, setEndDate] = useState(defaultEndDate.toISOString().slice(0, 16));
  
  const [visibility, setVisibility] = useState('Everyone');
  const [loading, setLoading] = useState(false);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOpts = [...options];
      newOpts.splice(index, 1);
      setOptions(newOpts);
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);
  };

  const resetForm = () => {
    setQuestion('');
    setDescription('');
    setVisibility('Everyone');
    setOptions(['', '']);
    
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + 7);
    setEndDate(newEndDate.toISOString().slice(0, 16));
  };

  const handleSubmit = async () => {
    if (question.trim().length < 5) {
      Alert.alert('Validation Error', 'Poll question must be at least 5 characters long.');
      return;
    }

    const filledOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    
    if (filledOptions.length < 2) {
      Alert.alert('Validation Error', 'Please provide at least 2 valid options.');
      return;
    }
    
    if (filledOptions.length > 5) {
      Alert.alert('Validation Error', 'You can only have up to 5 options.');
      return;
    }

    const uniqueOpts = new Set(filledOptions.map((o) => o.toLowerCase()));
    if (uniqueOpts.size !== filledOptions.length) {
      Alert.alert('Error', 'Options must be unique');
      return;
    }

    if (new Date(endDate) < new Date()) {
      Alert.alert('Error', 'End date must be in the future');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        question,
        description,
        visibility,
        options: filledOptions.map((text) => ({ text })),
        endDate,
      });
      resetForm();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Create New Poll">
      <View className="flex-1">
        <ScrollView className="bg-background pt-2 flex-1" contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View className="mb-4">
            <Text className="text-sm font-semibold mb-1 text-foreground">Poll Question *</Text>
            <TextInput
              placeholder="e.g., Should we install CCTV near the clubhouse?"
              value={question}
              onChangeText={setQuestion}
              maxLength={200}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold mb-1 text-foreground">Description (Optional)</Text>
            <TextInput
              placeholder="Provide more context..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={1000}
              className="h-24 py-2"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold mb-1 text-foreground">Visibility *</Text>
            <DropdownSelect
              value={visibility}
              onValueChange={(val: string | number) => setVisibility(val as string)}
              options={[
                { label: 'Everyone', value: 'Everyone' },
                { label: 'Community Admin Only', value: 'Community Admin Only' },
                { label: 'Residents Only', value: 'Residents Only' },
              ]}
              placeholder="Select Visibility"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold mb-2 text-foreground">Options (2 - 5) *</Text>
            <View className="gap-2">
              {options.map((opt, i) => (
                <View key={i} className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <TextInput
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChangeText={(text) => handleOptionChange(i, text)}
                    />
                  </View>
                  {options.length > 2 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveOption(i)}
                      className="p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                      hitSlop={8}
                    >
                      <Icon as={Trash2} size={18} className="text-destructive" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            
            {options.length < 5 && (
              <TouchableOpacity
                onPress={handleAddOption}
                className="flex-row items-center justify-center gap-2 mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 border-dashed"
              >
                <Icon as={Plus} size={16} className="text-primary" />
                <Text className="text-primary font-bold text-sm">Add Option</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="mb-6">
            <Text className="text-sm font-semibold mb-1 text-foreground">End Date & Time *</Text>
            <TextInput
              placeholder="YYYY-MM-DDTHH:mm"
              value={endDate}
              onChangeText={setEndDate}
            />
            <Text className="text-xs text-muted-foreground mt-1">Format: YYYY-MM-DDTHH:mm (24hr)</Text>
          </View>
        </ScrollView>

        <View className="flex-row gap-3 pt-4 border-t border-border mt-2 bg-background">
          <Button variant="outline" onPress={onClose} className="flex-1">
            <Text>Cancel</Text>
          </Button>
          <Button onPress={handleSubmit} disabled={loading} className="flex-1">
            <Text>{loading ? 'Creating...' : 'Create Poll'}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export default CreatePollModal;
