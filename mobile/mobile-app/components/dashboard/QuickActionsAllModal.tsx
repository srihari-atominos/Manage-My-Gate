import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  X,
  Search,
  AlertCircle,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react-native';
import ActionTile from './ActionTile';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { FeatureCategory } from '@/src/features/dashboard/dashboardService';
import { useQuickActions } from '@/src/features/dashboard/useQuickActions';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

interface QuickActionsAllModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectFeature?: (featureId: string) => void;
  onOpenCustomise?: () => void;
  featureCatalog?: FeatureCategory[];
}

export const QuickActionsAllModal: React.FC<QuickActionsAllModalProps> = ({
  visible,
  onClose,
  onSelectFeature,
  onOpenCustomise,
  featureCatalog: propFeatureCatalog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { featureCatalog: reduxFeatureCatalog } = useQuickActions();

  const categories = (propFeatureCatalog && propFeatureCatalog.length > 0)
    ? propFeatureCatalog
    : reduxFeatureCatalog;

  const handleTileClick = (featureId: string) => {
    if (onSelectFeature) onSelectFeature(featureId);
    onClose();
  };

  const handleCustomiseClick = () => {
    onClose();
    if (onOpenCustomise) onOpenCustomise();
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        {/* Header Bar */}
        <View className="bg-card border-b border-border px-4 py-3.5 flex-row items-center justify-between shadow-xs">
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
            <X size={22} color="#444" />
          </TouchableOpacity>

          <Text className="text-base font-extrabold text-foreground">Quick Actions</Text>

          <TouchableOpacity
            onPress={handleCustomiseClick}
            activeOpacity={0.8}
            className="flex-row items-center gap-1 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-full"
          >
            <SlidersHorizontal size={13} color="#03A9F4" />
            <Text className="text-xs font-bold text-primary">Customise</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-3">
          <View className="gap-5 pb-12 max-w-md mx-auto w-full">
            {/* Search All Features Bar */}
            <View className="flex-row items-center bg-muted/50 border border-border rounded-2xl px-3.5 py-2.5 shadow-xs">
              <Search size={18} color="#888" className="mr-2" />
              <TextInput
                placeholder="Search all features"
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 text-xs text-foreground py-0"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} className="p-0.5">
                  <X size={16} color="#888" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* DYNAMIC CATEGORY SECTIONS FROM BACKEND */}
            {categories && categories.length > 0 ? (
              categories.map((category) => {
                const userPermissions: string[] = user?.permissions || [];
                const userRoleName = user?.role || (user as any)?.activeRole || (Array.isArray((user as any)?.roles) ? (typeof (user as any).roles[0] === 'string' ? (user as any).roles[0] : (user as any).roles[0]?.name) : '');
                const isSuperAdmin = Boolean(
                  userPermissions.includes('platform:super_admin') ||
                  userRoleName === 'Platform Super Admin' ||
                  userRoleName === 'SuperAdmin' ||
                  userRoleName === 'Community Admin' ||
                  user?.isPlatform === true
                );

                const filteredItems = category.items.filter((item) => {
                  // Search query filter
                  if (
                    searchQuery &&
                    !item.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ) {
                    return false;
                  }

                  // RBAC permission check
                  if (item.permission && !isSuperAdmin) {
                    return userPermissions.includes(item.permission);
                  }

                  return true;
                });

                if (filteredItems.length === 0) return null;

                const primaryRouteId = category.actionButton?.route
                  ? filteredItems.find(f => f.route === category.actionButton?.route)?.id || filteredItems[0].id
                  : filteredItems[0].id;

                return (
                  <View key={category.categoryKey} className="gap-3">
                    {/* Section Header */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-extrabold text-foreground">
                        {category.categoryName}
                      </Text>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleTileClick(primaryRouteId)}
                        className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20"
                      >
                        <Text className="text-xs font-bold text-primary">
                          View all
                        </Text>
                        <ChevronRight size={13} color="#03A9F4" />
                      </TouchableOpacity>
                    </View>

                    {/* 4-Column Action Grid */}
                    <View className="flex-row flex-wrap gap-y-3.5 -mx-1">
                      {filteredItems.map((item) => (
                        <ActionTile
                          key={item.id}
                          icon={<FeatureIcon iconName={item.iconName} color={item.colorIcon || '#555'} />}
                          label={item.name}
                          onPress={() => handleTileClick(item.id)}
                        />
                      ))}
                    </View>
                  </View>
                );
              })
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default QuickActionsAllModal;
