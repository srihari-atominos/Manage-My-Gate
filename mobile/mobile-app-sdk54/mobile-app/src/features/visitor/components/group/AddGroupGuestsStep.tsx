import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Phone, UserPlus } from 'lucide-react-native';

export interface GroupGuestItem {
  id: string;
  name: string;
  phone: string;
}

export interface AddGroupGuestsStepProps {
  guests: GroupGuestItem[];
  onAddGuest: (guest: GroupGuestItem) => void;
}

export const AddGroupGuestsStep: React.FC<AddGroupGuestsStepProps> = ({
  guests,
  onAddGuest,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!name.trim()) {
      setError('Guest name is required');
      return;
    }
    
    if (phone && phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        setError('Contact number must be exactly 10 digits');
        return;
      }
    }
    
    setError('');
    onAddGuest({
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      phone: phone.trim(),
    });
    setName('');
    setPhone('');
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Add Group Guests ({guests.length} Added)
        </Text>
        <Text variant="muted" className="text-xs">
          Enter names and phone numbers of guests attending your event.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-4">
        <Input
          label="Guest Full Name"
          placeholder="e.g. Ananya Roy"
          leftIcon={<User size={18} className="text-muted-foreground" />}
          value={name}
          onChangeText={setName}
          error={error}
        />

        <Input
          label="Phone Number (Optional)"
          placeholder="9876543210"
          keyboardType="phone-pad"
          maxLength={10}
          leftIcon={<Phone size={18} className="text-muted-foreground" />}
          value={phone}
          onChangeText={setPhone}
        />

        <Button
          variant="secondary"
          onPress={handleAdd}
          className="h-11 rounded-xl flex-row items-center justify-center gap-2 border border-border"
        >
          <UserPlus size={16} className="text-foreground" />
          <Text className="font-bold text-foreground">Add Guest to List</Text>
        </Button>
      </View>
    </ScrollView>
  );
};
