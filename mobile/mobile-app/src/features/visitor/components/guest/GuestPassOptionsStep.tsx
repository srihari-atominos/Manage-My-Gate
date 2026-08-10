import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Car, ShieldAlert, ShieldCheck, Check, CreditCard } from 'lucide-react-native';

export interface GuestPassOptionsData {
  entryMode: 'SINGLE' | 'MULTIPLE';
  vehicleNo: string;
  gateInstructions: string;
  isIdProofPass?: boolean;
  idProofType?: string;
  idProofNumber?: string;
}

export interface GuestPassOptionsStepProps {
  data: GuestPassOptionsData;
  onChange: (data: GuestPassOptionsData) => void;
}

const ID_PROOF_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Driving License',
  'Voter ID',
  'Indian Passport',
];

export const validateGuestIdProofNumber = (type: string, number: string): string | null => {
  if (!number || !number.trim()) return 'ID Proof number is required.';
  const clean = number.trim();
  switch (type) {
    case 'Aadhaar Card':
      if (!/^\d{12}$/.test(clean)) return 'Aadhaar number must be 12 numeric digits.';
      break;
    case 'PAN Card':
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(clean)) return 'Invalid PAN Card format (e.g. ABCDE1234F).';
      break;
    case 'Driving License':
      if (clean.length < 10) return 'Invalid Driving License number.';
      break;
    case 'Voter ID':
      if (!/^[A-Z]{3}\d{7}$/i.test(clean)) return 'Invalid Voter ID format (e.g. XYZ1234567).';
      break;
    case 'Indian Passport':
      if (!/^[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]$/.test(clean)) return 'Invalid Passport format.';
      break;
    default:
      break;
  }
  return null;
};

export const GuestPassOptionsStep: React.FC<GuestPassOptionsStepProps> = ({
  data,
  onChange,
}) => {
  const isIdProofPass = !!data.isIdProofPass;
  const currentIdType = data.idProofType || 'Aadhaar Card';

  const idValidationError = isIdProofPass && data.idProofNumber
    ? validateGuestIdProofNumber(currentIdType, data.idProofNumber)
    : undefined;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Pass Entry Options
        </Text>
        <Text variant="muted" className="text-xs">
          Configure entry frequency, vehicle details, and special gate security instructions.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-4">
        {/* Entry Mode Toggle */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Entry Mode</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => onChange({ ...data, entryMode: 'SINGLE' })}
              activeOpacity={0.8}
              className={`flex-1 p-3 rounded-xl border items-center gap-1 ${
                data.entryMode === 'SINGLE'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-background border-border'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  data.entryMode === 'SINGLE' ? 'text-primary' : 'text-foreground'
                }`}
              >
                Single Entry
              </Text>
              <Text variant="muted" className="text-[10px] text-center">
                Pass expires after 1 entry
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onChange({ ...data, entryMode: 'MULTIPLE' })}
              activeOpacity={0.8}
              className={`flex-1 p-3 rounded-xl border items-center gap-1 ${
                data.entryMode === 'MULTIPLE'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-background border-border'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  data.entryMode === 'MULTIPLE' ? 'text-primary' : 'text-foreground'
                }`}
              >
                Multiple Entries
              </Text>
              <Text variant="muted" className="text-[10px] text-center">
                Valid for duration window
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle Number */}
        <Input
          label="Visitor Vehicle Number (Optional)"
          placeholder="e.g. KA-01-AB-1234"
          leftIcon={<Car size={18} className="text-muted-foreground" />}
          value={data.vehicleNo}
          onChangeText={(val) => onChange({ ...data, vehicleNo: val.toUpperCase() })}
        />

        {/* Special Gate Instructions */}
        <Input
          label="Special Security Instructions (Optional)"
          placeholder="e.g. Please direct vehicle to Visitor Parking Slot 14"
          leftIcon={<ShieldAlert size={18} className="text-muted-foreground" />}
          value={data.gateInstructions}
          onChangeText={(val) => onChange({ ...data, gateInstructions: val })}
        />
      </View>

      {/* Invite by ID Proof Card Toggle */}
      <TouchableOpacity
        onPress={() => onChange({ ...data, isIdProofPass: !isIdProofPass })}
        activeOpacity={0.8}
        className={`p-4 rounded-2xl border flex-row items-center justify-between ${
          isIdProofPass ? 'bg-primary/10 border-primary' : 'bg-card border-border'
        }`}
      >
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
            <ShieldCheck size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">Invite by ID Proof Pass</Text>
            <Text variant="muted" className="text-xs">
              Visitor presents government ID at gate barrier instead of QR code.
            </Text>
          </View>
        </View>

        <View
          className={`w-5 h-5 rounded-full border items-center justify-center ${
            isIdProofPass ? 'border-primary bg-primary' : 'border-muted-foreground/40'
          }`}
        >
          {isIdProofPass ? <Check size={12} color="#fff" /> : null}
        </View>
      </TouchableOpacity>

      {isIdProofPass && (
        <View className="bg-card border border-primary/30 rounded-2xl p-4 gap-3">
          <Text className="text-xs font-bold text-primary">Select Government ID Proof Type</Text>
          <View className="flex-row flex-wrap gap-2">
            {ID_PROOF_TYPES.map((type) => {
              const isSelected = currentIdType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => onChange({ ...data, idProofType: type })}
                  activeOpacity={0.7}
                  className={`px-3 py-2 rounded-xl border ${
                    isSelected ? 'bg-primary border-primary' : 'bg-background border-border'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label={`${currentIdType} Number`}
            placeholder={
              currentIdType === 'Aadhaar Card'
                ? 'e.g. 123456789012'
                : currentIdType === 'PAN Card'
                ? 'e.g. ABCDE1234F'
                : 'e.g. XYZ1234567'
            }
            leftIcon={<CreditCard size={18} className="text-muted-foreground" />}
            value={data.idProofNumber || ''}
            onChangeText={(val) => onChange({ ...data, idProofNumber: val })}
            error={idValidationError || undefined}
          />
        </View>
      )}
    </ScrollView>
  );
};
