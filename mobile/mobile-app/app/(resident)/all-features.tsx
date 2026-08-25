import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, TextInput, BackHandler } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenShell } from '@/components/ui/ScreenShell';
import {
  X,
  Search,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Layers,
} from 'lucide-react-native';
import ActionTile from '@/components/dashboard/ActionTile';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { useQuickActions } from '@/src/features/dashboard/useQuickActions';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import CustomiseSheetModal from '@/components/dashboard/CustomiseSheetModal';

export default function AllFeaturesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(params.category || null);
  
  const { user } = useAuth();
  const { featureCatalog, allFeaturesList, activeQuickActions, saveQuickActions } = useQuickActions();

  // Smart Back Button Handler: Clears category filter first, then search query, then navigates back to Home/Dashboard
  const handleBackPress = useCallback(() => {
    if (selectedCategoryKey !== null) {
      setSelectedCategoryKey(null);
      return true;
    }
    if (searchQuery) {
      setSearchQuery('');
      return true;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(resident)/dashboard' as any);
    }
    return true;
  }, [selectedCategoryKey, searchQuery, router]);

  // Hardware / Gesture Back Button Listener
  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        if (selectedCategoryKey !== null) {
          setSelectedCategoryKey(null);
          return true;
        }
        if (searchQuery) {
          setSearchQuery('');
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => subscription.remove();
    }, [selectedCategoryKey, searchQuery])
  );

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

  const handleSaveCustomisation = async (selectedIds: string[]) => {
    await saveQuickActions(selectedIds);
  };

  // RBAC Permission Check Helper
  const userPermissions: string[] = user?.permissions || [];
  const userRoleName = user?.role || (user as any)?.activeRole || (Array.isArray((user as any)?.roles) ? (typeof (user as any).roles[0] === 'string' ? (user as any).roles[0] : (user as any).roles[0]?.name) : '');
  const isSuperAdmin = Boolean(
    userPermissions.includes('platform:super_admin') ||
    userRoleName === 'Platform Super Admin' ||
    userRoleName === 'SuperAdmin' ||
    userRoleName === 'Community Admin' ||
    user?.isPlatform === true
  );

  const activeCategory = featureCatalog?.find(cat => cat.categoryKey === selectedCategoryKey);

  return (
    <ScreenShell
      title="All Features"
      subtitle="Explore community quick actions and services"
      iconName="LayoutGrid"
      showBackButton={true}
      onBackPress={handleBackPress}
      headerRight={
        <TouchableOpacity
          onPress={() => setCustomiseOpen(true)}
          activeOpacity={0.8}
          className="flex-row items-center gap-1 bg-primary/10 border border-primary/30 px-2.5 py-1.5 rounded-full"
        >
          <SlidersHorizontal size={13} color="#03A9F4" />
          <Text className="text-xs font-bold text-primary">Customise</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView className="flex-1 px-4 pt-3">
        <View className="gap-4 pb-12 max-w-md mx-auto w-full">
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

          {/* Module Category Filter Chips Bar */}
          {featureCatalog && featureCatalog.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1 py-1">
              <View className="flex-row items-center gap-2 px-1">
                <TouchableOpacity
                  onPress={() => setSelectedCategoryKey(null)}
                  activeOpacity={0.7}
                  className={`px-3 py-1.5 rounded-full border ${
                    selectedCategoryKey === null
                      ? 'bg-primary border-primary'
                      : 'bg-card border-border'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selectedCategoryKey === null ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    All Categories
                  </Text>
                </TouchableOpacity>

                {featureCatalog.map((cat) => {
                  const isActive = selectedCategoryKey === cat.categoryKey;
                  return (
                    <TouchableOpacity
                      key={cat.categoryKey}
                      onPress={() => setSelectedCategoryKey(isActive ? null : cat.categoryKey)}
                      activeOpacity={0.7}
                      className={`px-3 py-1.5 rounded-full border ${
                        isActive
                          ? 'bg-primary border-primary'
                          : 'bg-card border-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isActive ? 'text-white' : 'text-muted-foreground'
                        }`}
                      >
                        {cat.categoryName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : null}

          {/* Active Category Banner Header */}
          {selectedCategoryKey && activeCategory ? (
            <View className="flex-row items-center justify-between bg-primary/10 border border-primary/20 p-3.5 rounded-2xl shadow-xs">
              <View className="flex-row items-center gap-2.5 flex-1 me-2">
                <View className="p-2 rounded-xl bg-primary/20">
                  <Layers size={18} className="text-primary" color="#03A9F4" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-foreground">
                    {activeCategory.categoryName}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Showing all {activeCategory.items?.length || 0} features in this module
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedCategoryKey(null)}
                activeOpacity={0.7}
                className="flex-row items-center gap-1 bg-card border border-border px-2.5 py-1.5 rounded-xl shadow-xs"
              >
                <RotateCcw size={12} className="text-foreground" />
                <Text className="text-xs font-bold text-foreground">Show All</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* DYNAMIC CATEGORY SECTIONS FROM BACKEND */}
          {featureCatalog && featureCatalog.length > 0 ? (
            featureCatalog
              .filter((cat) => !selectedCategoryKey || cat.categoryKey === selectedCategoryKey)
              .map((category) => {
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

                const isCategorySelected = selectedCategoryKey === category.categoryKey;

                return (
                  <View key={category.categoryKey} className="gap-3">
                    {/* Section Header */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-extrabold text-foreground">
                        {category.categoryName}
                      </Text>

                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() =>
                          setSelectedCategoryKey(isCategorySelected ? null : category.categoryKey)
                        }
                        className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20"
                      >
                        <Text className="text-xs font-bold text-primary">
                          {isCategorySelected ? 'Show All' : 'View all'}
                        </Text>
                        <ChevronRight size={13} className="text-primary" />
                      </Button>
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

      {/* Customise Dashboard Slide-Up Sheet Modal */}
      <CustomiseSheetModal
        visible={customiseOpen}
        onClose={() => setCustomiseOpen(false)}
        activeFeatureIds={activeQuickActions}
        onSave={handleSaveCustomisation}
      />
    </ScreenShell>
  );
}

