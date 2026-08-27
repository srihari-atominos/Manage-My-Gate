import React, { useState, useEffect, useMemo } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { Sparkles, X, Check } from 'lucide-react-native';
import CustomiseDeckZone from './CustomiseDeckZone';
import CustomiseAvailableZone from './CustomiseAvailableZone';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import {
  ALL_AVAILABLE_FEATURES,
  REAL_APP_FEATURES,
  DEFAULT_5_QUICK_ACTIONS,
  AppFeatureItem,
} from '@/src/features/dashboard/dashboardCatalog';

export { ALL_AVAILABLE_FEATURES, REAL_APP_FEATURES, AppFeatureItem };

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const VALID_CATALOG_IDS = new Set(ALL_AVAILABLE_FEATURES.map((f) => f.id));

interface CustomiseSheetModalProps {
  visible: boolean;
  onClose: () => void;
  activeFeatureIds?: string[];
  onToggleFeature?: (featureId: string) => void;
  onSave?: (selectedIds: string[]) => void;
}

export const CustomiseSheetModal: React.FC<CustomiseSheetModalProps> = ({
  visible,
  onClose,
  activeFeatureIds = DEFAULT_5_QUICK_ACTIONS,
  onToggleFeature,
  onSave,
}) => {
  const { user } = useAuth();
  const userPermissions: string[] = user?.permissions || [];
  const userRoleName =
    user?.role ||
    (user as any)?.activeRole ||
    (Array.isArray((user as any)?.roles)
      ? typeof (user as any).roles[0] === 'string'
        ? (user as any).roles[0]
        : (user as any).roles[0]?.name
      : '');
  const isSuperAdmin = Boolean(
    userPermissions.includes('platform:super_admin') ||
    userRoleName === 'Platform Super Admin' ||
    userRoleName === 'SuperAdmin' ||
    userRoleName === 'Community Admin' ||
    user?.isPlatform === true
  );

  const availableFeaturesForUser = useMemo(() => {
    return ALL_AVAILABLE_FEATURES.filter((item: any) => {
      if (item.permission && !isSuperAdmin) {
        return userPermissions.includes(item.permission);
      }
      return true;
    });
  }, [userPermissions, isSuperAdmin]);

  // Sanitize incoming IDs to ensure only valid current catalog items are retained (max 5)
  const sanitizedActiveIds = useMemo(() => {
    if (!activeFeatureIds || activeFeatureIds.length === 0) {
      return DEFAULT_5_QUICK_ACTIONS;
    }
    const valid = activeFeatureIds.filter((id) => VALID_CATALOG_IDS.has(id)).slice(0, 5);
    return valid.length > 0 ? valid : DEFAULT_5_QUICK_ACTIONS;
  }, [activeFeatureIds]);

  const [selectedIds, setSelectedIds] = useState<string[]>(sanitizedActiveIds);

  // Sync selectedIds state whenever activeFeatureIds or visible state changes
  useEffect(() => {
    if (visible) {
      setSelectedIds(sanitizedActiveIds);
    }
  }, [visible, sanitizedActiveIds]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else if (selectedIds.length < 5) {
      setSelectedIds((prev) => [...prev, id]);
    }
    if (onToggleFeature) onToggleFeature(id);
  };

  const handleSave = () => {
    if (onSave) onSave(selectedIds.slice(0, 5));
    onClose();
  };

  // Active selected items (up to 5)
  const activeItems = useMemo(() => {
    return ALL_AVAILABLE_FEATURES.filter((f) => selectedIds.includes(f.id)).slice(0, 5);
  }, [selectedIds]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        {/* Backdrop dismiss touchable */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet Container with guaranteed height */}
        <View
          style={{ height: Math.round(SCREEN_HEIGHT * 0.85) }}
          className="bg-card border-t border-border rounded-t-3xl shadow-2xl overflow-hidden flex-col"
        >
          {/* Top Pill Handle */}
          <View className="items-center pt-2.5 pb-1 bg-card">
            <View className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
          </View>

          {/* Header Bar */}
          <View className="flex-row justify-between items-center px-5 py-3 border-b border-border bg-card">
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="py-1 px-2 rounded-lg active:bg-secondary">
              <Text className="text-sm font-semibold text-muted-foreground">Cancel</Text>
            </TouchableOpacity>

            <Text className="text-base font-extrabold text-foreground">Customise Dashboard</Text>

            <TouchableOpacity onPress={handleSave} activeOpacity={0.8} className="bg-primary px-4 py-1.5 rounded-full">
              <Text className="text-xs font-bold text-primary-foreground">Save</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content Body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Selection Zone (The Deck - 5 Slots) */}
            <CustomiseDeckZone
              activeItems={activeItems}
              maxCapacity={5}
              onRemoveItem={toggleSelect}
            />

            {/* Divider Sub-header */}
            <View className="px-5 py-3 bg-muted/30 border-b border-border flex-row items-center justify-between">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Available Actions ({selectedIds.length}/5 Selected)
              </Text>
              <Sparkles size={14} color="#0284c7" />
            </View>

            {/* Available Features (The Collection - Grouped by Web Domain) */}
            <CustomiseAvailableZone
              features={availableFeaturesForUser}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default CustomiseSheetModal;
