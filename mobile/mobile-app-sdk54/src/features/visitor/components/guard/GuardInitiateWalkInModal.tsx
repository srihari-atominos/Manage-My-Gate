import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { AdminVillaFilterSheet } from '../admin/AdminVillaFilterSheet';
import { ShieldAlert, X, Building2, User, Phone, Car, IdCard } from 'lucide-react-native';

interface GuardInitiateWalkInModalProps {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: {
    visitorName: string;
    phone: string;
    villaId?: string;
    villaName?: string;
    residentId?: string;
    residentName?: string;
    idProofNumber?: string;
    vehicleNumber?: string;
  }) => Promise<void>;
}

export const GuardInitiateWalkInModal: React.FC<GuardInitiateWalkInModalProps> = ({
  visible,
  loading = false,
  onClose,
  onSubmit,
}) => {
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [villaId, setVillaId] = useState<string | undefined>(undefined);
  const [villaName, setVillaName] = useState<string>('Select Target Villa & Resident *');
  const [residentId, setResidentId] = useState<string | undefined>(undefined);
  const [residentName, setResidentName] = useState<string | undefined>(undefined);
  const [villaSheetOpen, setVillaSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!visitorName.trim()) {
      setError('Please enter visitor name');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter visitor phone number');
      return;
    }
    if (!villaId && !residentId) {
      setError('Please select target villa and resident host');
      return;
    }

    setError(null);
    try {
      await onSubmit({
        visitorName,
        phone,
        villaId,
        villaName,
        residentId,
        residentName,
        idProofNumber,
        vehicleNumber,
      });
      setVisitorName('');
      setPhone('');
      setIdProofNumber('');
      setVehicleNumber('');
      setVillaId(undefined);
      setVillaName('Select Target Villa & Resident *');
      setResidentId(undefined);
      setResidentName(undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate walk-in request');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-background rounded-t-3xl p-4 pt-3 max-h-[85%] border-t border-border gap-3">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border pb-3">
            <View className="flex-row items-center gap-2">
              <ShieldAlert size={20} className="text-amber-600 dark:text-amber-400" />
              <Text className="text-base font-bold text-foreground">Initiate Gate Walk-In</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-muted">
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {error && (
            <View className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl">
              <Text className="text-xs text-destructive font-medium">{error}</Text>
            </View>
          )}

          <ScrollView className="flex-1" contentContainerClassName="gap-3 pb-4">
            {/* Target Villa & Resident Selection */}
            <View>
              <Text className="text-xs font-semibold text-muted-foreground mb-1">Target Resident Host & Villa *</Text>
              <TouchableOpacity
                onPress={() => setVillaSheetOpen(true)}
                className="bg-card border border-border rounded-xl p-3 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2 flex-1 mr-2">
                  <Building2 size={16} className="text-primary" />
                  <View className="flex-1">
                    <Text className={`text-sm font-semibold ${villaId ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {residentName ? residentName : villaName}
                    </Text>
                    {residentName && (
                      <Text className="text-[11px] text-primary font-medium">
                        Host User selected for gate push notification
                      </Text>
                    )}
                  </View>
                </View>
                <Text className="text-xs font-bold text-primary">Choose Host</Text>
              </TouchableOpacity>
            </View>

            {/* Visitor Name */}
            <View>
              <Text className="text-xs font-semibold text-muted-foreground mb-1">Visitor Full Name *</Text>
              <TextInput
                value={visitorName}
                onChangeText={setVisitorName}
                placeholder="e.g. Rahul Sharma"
                className="bg-card border border-border rounded-xl p-3 text-sm text-foreground"
              />
            </View>

            {/* Visitor Phone */}
            <View>
              <Text className="text-xs font-semibold text-muted-foreground mb-1">Phone Number *</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. +91 9876543210"
                keyboardType="phone-pad"
                className="bg-card border border-border rounded-xl p-3 text-sm text-foreground"
              />
            </View>

            {/* Vehicle Number */}
            <View>
              <Text className="text-xs font-semibold text-muted-foreground mb-1">Vehicle Plate Number (Optional)</Text>
              <TextInput
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                placeholder="e.g. KA 01 AB 1234"
                autoCapitalize="characters"
                className="bg-card border border-border rounded-xl p-3 text-sm text-foreground font-mono"
              />
            </View>

            {/* ID Proof Number */}
            <View>
              <Text className="text-xs font-semibold text-muted-foreground mb-1">Govt ID / Aadhaar Number (Optional)</Text>
              <TextInput
                value={idProofNumber}
                onChangeText={setIdProofNumber}
                placeholder="e.g. XXXX XXXX 1234"
                className="bg-card border border-border rounded-xl p-3 text-sm text-foreground"
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="flex-row gap-2 pt-2 border-t border-border">
            <Button variant="outline" className="flex-1" onPress={onClose} disabled={loading}>
              <Text className="text-xs font-semibold">Cancel</Text>
            </Button>
            <Button variant="default" className="flex-1 bg-amber-600" onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-xs font-semibold text-white">Send Resident Request</Text>
              )}
            </Button>
          </View>
        </View>
      </View>

      <AdminVillaFilterSheet
        visible={villaSheetOpen}
        selectedVillaId={villaId}
        selectedResidentId={residentId}
        onClose={() => setVillaSheetOpen(false)}
        onSelectVilla={(vId, vName, rId, rName) => {
          setVillaId(vId);
          setVillaName(vName || 'Select Target Villa *');
          setResidentId(rId);
          setResidentName(rName);
        }}
      />
    </Modal>
  );
};

export default GuardInitiateWalkInModal;
