import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Filter, Check, RotateCcw } from 'lucide-react-native';
import { Button } from '@/components/common/Button';

interface UserFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  availableRoles: string[];
  selectedRoles: string[];
  onToggleRole: (role: string) => void;
  onClearRoles: () => void;
  statusOptions: string[];
  selectedStatuses: string[];
  onToggleStatus: (status: string) => void;
}

export const UserFilterSheet: React.FC<UserFilterSheetProps> = ({
  visible,
  onClose,
  availableRoles,
  selectedRoles,
  onToggleRole,
  onClearRoles,
  statusOptions,
  selectedStatuses,
  onToggleStatus,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-border mb-4">
            <View className="flex-row items-center">
              <Filter size={20} color="#6366f1" className="me-2" />
              <Text className="text-base font-bold text-foreground text-start">
                Filter Users
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-muted">
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status Filters */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-foreground text-start mb-2">
                Account Status:
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {statusOptions.map((status) => {
                  const isSelected = selectedStatuses.includes(status);
                  return (
                    <TouchableOpacity
                      key={status}
                      onPress={() => onToggleStatus(status)}
                      className={`flex-row items-center px-3 py-2 rounded-xl border ${
                        isSelected
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/40 border-border'
                      }`}
                    >
                      {isSelected ? <Check size={12} color="#6366f1" className="me-1" /> : null}
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Role Filters */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-foreground text-start">
                  User Roles:
                </Text>

                {selectedRoles.length > 0 ? (
                  <TouchableOpacity onPress={onClearRoles} className="flex-row items-center">
                    <RotateCcw size={11} color="#6366f1" className="me-1" />
                    <Text className="text-xs text-primary font-semibold">Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View className="flex-row flex-wrap gap-2">
                {availableRoles.map((role) => {
                  const isSelected = selectedRoles.includes(role);
                  return (
                    <TouchableOpacity
                      key={role}
                      onPress={() => onToggleRole(role)}
                      className={`flex-row items-center px-3 py-2 rounded-xl border ${
                        isSelected
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/40 border-border'
                      }`}
                    >
                      {isSelected ? <Check size={12} color="#6366f1" className="me-1" /> : null}
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View className="pt-3 border-t border-border">
            <Button variant="default" onPress={onClose}>
              Apply Filters
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UserFilterSheet;
