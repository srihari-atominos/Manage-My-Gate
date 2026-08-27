import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import {
  X,
  Search,
  ChevronRight,
  SlidersHorizontal,
  ChevronLeft,
} from 'lucide-react-native';
import ActionTile from '@/components/dashboard/ActionTile';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { useQuickActions } from '@/src/features/dashboard/useQuickActions';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomiseSheetModal, { ALL_AVAILABLE_FEATURES } from '@/components/dashboard/CustomiseSheetModal';

export default function AllFeaturesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  const { user } = useAuth();
  const { featureCatalog, allFeaturesList, activeQuickActions, saveQuickActions } = useQuickActions();

  const handleTileClick = (tileId: string) => {
    if (tileId === 'visitor_resident_passes') {
      router.push('/(resident)/visitor' as any);
      return;
    }
    const feature = allFeaturesList.find((item) => item.id === tileId);
    if (feature && feature.route) {
      const targetRoute = feature.route.endsWith('/resident-passes') ? '/(resident)/visitor' : feature.route;
      router.push(targetRoute as any);
    }
  };

  const toggleCategoryExpand = (categoryKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const handleSaveCustomisation = async (selectedIds: string[]) => {
    await saveQuickActions(selectedIds);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header Bar */}
      <View className="bg-card border-b border-border/80 px-4 py-3.5 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="p-1 -ml-1 rounded-full active:bg-secondary">
          <ChevronLeft size={22} className="text-foreground" />
        </TouchableOpacity>

        <Text className="text-base font-extrabold text-foreground">Quick Actions</Text>

        <TouchableOpacity
          onPress={() => setCustomiseOpen(true)}
          activeOpacity={0.8}
          className="flex-row items-center gap-1 bg-primary/10 border border-primary/25 px-3 py-1.5 rounded-full"
        >
          <SlidersHorizontal size={13} className="text-primary" />
          <Text className="text-xs font-bold text-primary">Customise</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
        <View className="gap-5 pb-12 max-w-md mx-auto w-full">
          {/* Search All Features Bar */}
          <View className="flex-row items-center bg-card border border-border/80 rounded-2xl px-3.5 py-2.5">
            <Search size={17} className="text-muted-foreground mr-2" />
            <TextInput
              placeholder="Search all features"
              placeholderTextColor="#737c88"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-xs font-sans text-foreground py-0"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} className="p-0.5">
                <X size={15} className="text-muted-foreground" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* DYNAMIC CATEGORY SECTIONS FROM BACKEND */}
          {featureCatalog && featureCatalog.length > 0 ? (
            featureCatalog.map((category) => {
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

              const isExpanded = Boolean(expandedCategories[category.categoryKey]) || Boolean(searchQuery);
              const hasMore = filteredItems.length > 6;
              const displayedItems = isExpanded ? filteredItems : filteredItems.slice(0, 6);

              return (
                <View key={category.categoryKey} className="gap-3">
                  {/* Section Header with View all / Show less */}
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-extrabold text-foreground">
                      {category.categoryName}
                    </Text>

                    {hasMore && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => toggleCategoryExpand(category.categoryKey)}
                        className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20"
                      >
                        <Text className="text-xs font-bold text-primary">
                          {isExpanded ? 'Show less' : `View all (${filteredItems.length})`}
                        </Text>
                        <ChevronRight
                          size={13}
                          className="text-primary"
                          style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* 3-Column Bento Card Grid */}
                  <View className="flex-row flex-wrap gap-y-2.5 -mx-1">
                    {displayedItems.map((item) => {
                      const meta = ALL_AVAILABLE_FEATURES.find((f) => f.id === item.id);
                      const iconName = meta?.iconName || item.iconName;
                      const colorIcon = meta?.colorIcon || item.colorIcon || '#c5a059';
                      const colorBg = meta?.colorBg || item.colorBg || 'bg-secondary';

                      return (
                        <ActionTile
                          key={item.id}
                          containerClassName="w-1/3 px-1"
                          iconBgColor={colorBg}
                          icon={<FeatureIcon iconName={iconName} color={colorIcon} size={20} />}
                          label={meta?.name || item.name}
                          subtitle={meta?.subtitle || item.subtitle}
                          metaValue={meta?.subtitle || item.subtitle}
                          badge={item.badge}
                          badgeColor={item.badgeColor}
                          onPress={() => handleTileClick(item.id)}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })
          ) : null}
        </View>
      </ScrollView>

      {/* Customise Dashboard Slide-Up Sheet Modal */}
      <CustomiseSheetModal
        visible={customiseOpen}
        onClose={() => setCustomiseOpen(false)}
        activeFeatureIds={activeQuickActions}
        onSave={handleSaveCustomisation}
      />
    </SafeAreaView>
  );
}
