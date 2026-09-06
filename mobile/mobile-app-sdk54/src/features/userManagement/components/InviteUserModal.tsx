import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, Mail } from 'lucide-react-native';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Button } from '@/components/common/Button';
import apiClient from '../../../services/apiClient';
import { InviteUserData } from '../services/userService';

interface InviteUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSendInvite: (inviteData: InviteUserData) => Promise<any>;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  visible,
  onClose,
  onSendInvite,
}) => {
  const [email, setEmail] = useState('');
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [selectedVillaId, setSelectedVillaId] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [villas, setVillas] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingVillas, setLoadingVillas] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setErrorMsg('');
      setLoadingRoles(true);
      apiClient
        .get('/roles?limit=100')
        .then((res: any) => {
          const fetched = res.data?.data || res.data || [];
          setRoles(Array.isArray(fetched) ? fetched : []);
        })
        .catch((err) => console.error('Failed to fetch roles:', err))
        .finally(() => setLoadingRoles(false));

      setLoadingVillas(true);
      apiClient
        .get('/villas?limit=1000')
        .then((res: any) => {
          const fetched = res.data?.data || res.data || [];
          setVillas(Array.isArray(fetched) ? fetched : []);
        })
        .catch((err) => console.error('Failed to fetch villas:', err))
        .finally(() => setLoadingVillas(false));
    }
  }, [visible]);

  const selectedRoleObj = roles.find((r) => r.name === selectedRoleName);
  const isTenantRole = selectedRoleObj ? !!selectedRoleObj.isTenantRole : false;

  const handleSubmit = async () => {
    if (!email.trim() || !selectedRoleName) return;
    setErrorMsg('');
    setSubmitting(true);

    try {
      let residentType = 'None';
      if (isTenantRole && selectedRoleName) {
        const lower = selectedRoleName.toLowerCase();
        if (lower.includes('owner')) residentType = 'Owner';
        else if (lower.includes('tenant')) residentType = 'Tenant';
        else if (lower.includes('family')) residentType = 'Family';
        else residentType = 'Guest';
      }

      await onSendInvite({
        email: email.trim(),
        villaId: isTenantRole ? selectedVillaId || null : null,
        residentType,
        roleName: selectedRoleName || null,
      });

      setEmail('');
      setSelectedRoleName('');
      setSelectedVillaId('');
      onClose();
    } catch (err: any) {
      setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const roleOptions = roles.map((r) => ({
    label: `${r.name} ${r.isTenantRole ? '(Unit/Tenant)' : '(Global)'}`,
    value: r.name,
  }));

  const villaOptions = villas.map((v) => ({
    label: `Unit ${v.unitNumber || v.villaNumber} ${v.blockOrBuilding ? `(${v.blockOrBuilding})` : ''}`,
    value: v._id || v.id,
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[85%]">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-border mb-4">
            <View className="flex-row items-center">
              <Mail size={20} color="#6366f1" className="me-2" />
              <Text className="text-lg font-bold text-foreground text-start">
                Invite Community User
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-muted">
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                <Text className="text-xs text-destructive font-semibold text-start">{errorMsg}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-foreground text-start mb-1">
                Email Address *
              </Text>
              <TextInput
                placeholder="resident@community.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Role Select */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-foreground text-start mb-1">
                Select Role *
              </Text>
              {loadingRoles ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <DropdownSelect
                  options={roleOptions}
                  value={selectedRoleName}
                  onValueChange={setSelectedRoleName}
                  placeholder="-- Select User Role --"
                />
              )}
            </View>

            {/* Villa Select for Unit Roles */}
            {isTenantRole ? (
              <View className="mb-4">
                <Text className="text-xs font-bold text-foreground text-start mb-1">
                  Select Villa / Unit *
                </Text>
                {loadingVillas ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <DropdownSelect
                    options={villaOptions}
                    value={selectedVillaId}
                    onValueChange={setSelectedVillaId}
                    placeholder="-- Choose Villa Unit --"
                  />
                )}
              </View>
            ) : null}

            <Text className="text-xs text-muted-foreground text-start mb-4">
              An invitation code and link will be generated for credential setup.
            </Text>
          </ScrollView>

          {/* Modal Footer */}
          <View className="flex-row items-center justify-end gap-3 pt-3 border-t border-border mt-2">
            <Button variant="outline" onPress={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="default"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!email.trim() || !selectedRoleName || (isTenantRole && !selectedVillaId) || submitting}
            >
              Send Invitation
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default InviteUserModal;
