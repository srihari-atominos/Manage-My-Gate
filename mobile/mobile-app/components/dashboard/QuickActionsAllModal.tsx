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
import { FeatureCategory, FeatureItem } from '@/src/features/dashboard/dashboardService';
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
  featureCatalog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { featureCatalog: reduxFeatureCatalog } = useQuickActions();
  const { user } = useAuth();

  const categories = featureCatalog || reduxFeatureCatalog;

  const handleTileClick = (id: string) => {
    if (onSelectFeature) {
      onSelectFeature(id);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-background rounded-t-3xl border-t border-border px-4 pt-4 pb-8 max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-border">
            <Text className="text-lg font-extrabold text-foreground">
              All Features & Services
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="p-1 rounded-full bg-muted/50"
            >
              <X size={20} className="text-foreground" color="#888" />
            </TouchableOpacity>
          </View>

          {/* Body Scrollable */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 16, gap: 20 }}
          >
            {/* SEARCH INPUT BAR */}
            <View className="flex-row items-center bg-card border border-border rounded-xl px-3 py-2">
              <Search size={18} color="#888" className="mr-2" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search feature or service..."
                placeholderTextColor="#888"
                className="flex-1 text-sm text-foreground py-0"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} className="p-0.5">
                  <X size={16} color="#888" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* DYNAMIC CATEGORY SECTIONS FROM BACKEND */}
            {categories && categories.length > 0 ? (
              categories.map((category: FeatureCategory) => {
                const userPermissions: string[] = user?.permissions || [];
                const userRoleName = user?.role || (user as any)?.activeRole || (Array.isArray((user as any)?.roles) ? (typeof (user as any).roles[0] === 'string' ? (user as any).roles[0] : (user as any).roles[0]?.name) : '');
                const isSuperAdmin = Boolean(
                  userPermissions.includes('platform:super_admin') ||
                  userRoleName === 'Platform Super Admin' ||
                  userRoleName === 'SuperAdmin' ||
                  userRoleName === 'Community Admin' ||
                  user?.isPlatform === true
                );

                const filteredItems = category.items.filter((item: FeatureItem) => {
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
                  ? filteredItems.find((f: FeatureItem) => f.route === category.actionButton?.route)?.id || filteredItems[0].id
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
                      {filteredItems.map((item: FeatureItem) => (
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default QuickActionsAllModal;
