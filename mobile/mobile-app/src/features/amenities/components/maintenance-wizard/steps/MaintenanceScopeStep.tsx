import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Amenity } from '../../../store/amenitySlice';
import { Wrench, Sparkles, ShieldAlert, CheckCircle, Hammer, Building2 } from 'lucide-react-native';

export interface MaintenanceScopeStepProps {
  amenities: Amenity[];
  selectedAmenityId: string;
  onSelectAmenity: (id: string) => void;
  maintenanceType: string;
  onSelectType: (type: string) => void;
  title: string;
  onChangeTitle: (val: string) => void;
  assignedStaff: string;
  onChangeStaff: (val: string) => void;
  description: string;
  onChangeDescription: (val: string) => void;
  error?: string | null;
  isEditing?: boolean;
}

const MAINTENANCE_TYPES = [
  { value: 'CLEANING', label: 'Cleaning & Sanitization', icon: Sparkles, color: '#3b82f6' },
  { value: 'INSPECTION', label: 'Safety & Audit', icon: CheckCircle, color: '#10b981' },
  { value: 'REPAIR', label: 'Repair & Fix', icon: Hammer, color: '#f59e0b' },
  { value: 'UPKEEP', label: 'Routine Upkeep', icon: Wrench, color: '#8b5cf6' },
  { value: 'EMERGENCY', label: 'Emergency', icon: ShieldAlert, color: '#ef4444' },
];

export const MaintenanceScopeStep: React.FC<MaintenanceScopeStepProps> = ({
  amenities,
  selectedAmenityId,
  onSelectAmenity,
  maintenanceType,
  onSelectType,
  title,
  onChangeTitle,
  assignedStaff,
  onChangeStaff,
  description,
  onChangeDescription,
  error,
  isEditing = false,
}) => {
  const selectedAmenity = amenities.find((a) => String(a._id) === String(selectedAmenityId));

  const amenityOptions = amenities.map((a) => ({
    label: a.name,
    value: a._id,
  }));

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-6" keyboardShouldPersistTaps="handled">
      {/* Facility Selection */}
      <View className="gap-1.5">
        <Text className="text-xs font-bold text-foreground">
          Target Facility *
        </Text>
        {isEditing || selectedAmenity ? (
          <View className="p-3 bg-muted/40 border border-border/80 rounded-2xl flex-row items-center gap-2.5">
            <Building2 size={18} className="text-primary" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">
                {selectedAmenity?.name || 'Community Facility'}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {selectedAmenity?.location || 'Community Facilities'}
              </Text>
            </View>
          </View>
        ) : (
          <DropdownSelect
            options={amenityOptions}
            value={selectedAmenityId}
            onValueChange={onSelectAmenity}
            placeholder="Select a community facility..."
          />
        )}
      </View>

      {/* Maintenance Type Chips */}
      <View className="gap-2">
        <Text className="text-xs font-bold text-foreground">
          Maintenance Type *
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {MAINTENANCE_TYPES.map((typeItem) => {
            const isSelected = (maintenanceType || 'CLEANING').toUpperCase() === typeItem.value;
            const IconComponent = typeItem.icon;
            return (
              <TouchableOpacity
                key={typeItem.value}
                onPress={() => onSelectType(typeItem.value)}
                activeOpacity={0.7}
                className={`px-3 py-2 rounded-xl border flex-row items-center gap-2 ${
                  isSelected
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border/80'
                }`}
              >
                <IconComponent size={14} color={isSelected ? '#2563eb' : '#64748b'} />
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? 'text-primary font-bold' : 'text-foreground'
                  }`}
                >
                  {typeItem.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Task Title */}
      <View className="gap-1">
        <TextInput
          label="Maintenance Title *"
          placeholder="e.g. Routine Cleaning & Servicing"
          value={title}
          onChangeText={onChangeTitle}
        />
        {error ? (
          <Text className="text-xs text-destructive font-medium px-1">
            {error}
          </Text>
        ) : null}
      </View>

      {/* Assigned Staff */}
      <TextInput
        label="Assigned Staff / Vendor"
        placeholder="e.g. Facilities Team, AC Contractor"
        value={assignedStaff}
        onChangeText={onChangeStaff}
      />

      {/* Description / Work Details */}
      <TextInput
        label="Work Notes & Description"
        placeholder="Describe the maintenance tasks, safety precautions, or equipment needed..."
        value={description}
        onChangeText={onChangeDescription}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80 }}
      />
    </ScrollView>
  );
};

export default MaintenanceScopeStep;
