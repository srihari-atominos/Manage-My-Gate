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
import { ALL_AVAILABLE_FEATURES } from '@/src/features/dashboard/dashboardCatalog';

import { isFeatureAllowedForUser, checkIsAdmin } from '@/src/utils/rbac';
import { useTranslation } from '@/src/utils/i18n';

export default function AllFeaturesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const { t, tCategoryName, tFeatureName, tFeatureSubtitle } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(params.category || null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
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
      return true;
    }
    router.replace('/(resident)/dashboard' as any);
    return true;
  }, [selectedCategoryKey, searchQuery, router]);

  // Hardware / Gesture Back Button Listener
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => subscription.remove();
    }, [handleBackPress])
  );

  const handleTileClick = (tileId: string) => {
    if (tileId === 'visitor_resident_passes') {
      router.navigate('/(resident)/visitor' as any);
      return;
    }
    if (tileId === 'billing_dashboard') {
      router.navigate('/(resident)/billing' as any);
      return;
    }
    if (tileId === 'billing_action_center') {
      router.navigate('/(resident)/admin/billing/ledger' as any);
      return;
    }
    if (tileId === 'billing_assessment_manager') {
      router.navigate('/(resident)/admin/billing/assessments' as any);
      return;
    }
    let feature = allFeaturesList.find((item) => item.id === tileId);
    if (!feature) {
      feature = (ALL_AVAILABLE_FEATURES as any[]).find((item) => item.id === tileId);
    }
    
    if (feature && feature.route) {
      const targetRoute = feature.route.endsWith('/resident-passes') ? '/(resident)/visitor' : feature.route;
      router.push(targetRoute as any);
    }
  };

  const toggleCategoryExpand = (catKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  const handleSaveCustomisation = async (selectedIds: string[]) => {
    await saveQuickActions(selectedIds);
  };

  const isAdminRole = checkIsAdmin(user);

  const filteredAvailableFeatures = React.useMemo(() => {
    if (!isAdminRole) return allFeaturesList;
    return allFeaturesList.filter(
      (item) => item.id !== 'visitor_resident_passes' && item.id !== 'visitor_passes'
    );
  }, [allFeaturesList, isAdminRole]);
  const activeCategory = featureCatalog?.find(cat => cat.categoryKey === selectedCategoryKey);

  return (
    <ScreenShell
      title={t('all_features', 'All Features & Services')}
      subtitle={t('explore_quick_actions', 'Explore community quick actions and services')}
      iconName="LayoutGrid"
      showBackButton={true}
      onBackPress={handleBackPress}
      headerRight={
        <TouchableOpacity
          onPress={() => setCustomiseOpen(true)}
          activeOpacity={0.8}
          className="flex-row items-center gap-1 bg-primary/10 border border-primary/30 px-2.5 py-1.5 rounded-full"
        >
          <SlidersHorizontal size={13} className="text-muted-foreground" />
          <Text className="text-xs font-bold text-foreground font-sans">{t('customise', 'Customise')}</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
        <View className="gap-4 pb-12 max-w-md mx-auto w-full">
          {/* Search All Features Bar */}
          <View className="flex-row items-center bg-card border border-border rounded-2xl px-3.5 py-3 shadow-xs">
            <Search size={18} color="#172B70" className="mr-2.5 shrink-0" />
            <TextInput
              placeholder={t('search', 'Search all features...')}
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-[13px] font-sans text-foreground py-0"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} className="p-0.5">
                <X size={15} className="text-muted-foreground" />
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
                    {t('all_categories', 'All Categories')}
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
                        {tCategoryName(cat.categoryKey, cat.categoryName)}
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
                    {tCategoryName(activeCategory.categoryKey, activeCategory.categoryName)}
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
                <Text className="text-xs font-bold text-foreground">{t('show_all', 'Show All')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* DYNAMIC CATEGORY SECTIONS FROM BACKEND */}
          {featureCatalog && featureCatalog.length > 0 ? (
            featureCatalog
              .filter((cat) => !selectedCategoryKey || cat.categoryKey === selectedCategoryKey)
              .map((category) => {
                const filteredItems = category.items.filter((item) => {
                  if (
                    searchQuery &&
                    !item.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ) {
                    return false;
                  }

                  // Hide resident personal passes for Admin roles
                  if (
                    isAdminRole &&
                    (item.id === 'visitor_resident_passes' || item.id === 'visitor_passes')
                  ) {
                    return false;
                  }

                  return isFeatureAllowedForUser(item, user);
                });

                if (filteredItems.length === 0) return null;

                const isExpanded = Boolean(expandedCategories[category.categoryKey]) || Boolean(searchQuery);
                const hasMore = filteredItems.length > 6;
                const displayedItems = isExpanded ? filteredItems : filteredItems.slice(0, 6);

                return (
                  <View key={category.categoryKey} className="gap-3">
                    <View className="flex-row items-center justify-between pt-1">
                      <Text className="text-[13.5px] font-bold font-sans text-primary uppercase tracking-wider">
                        {tCategoryName(category.categoryKey, category.categoryName)}
                      </Text>

                      {hasMore && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => toggleCategoryExpand(category.categoryKey)}
                          className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 shadow-xs"
                        >
                          <Text className="text-xs font-bold text-primary font-sans">
                            {isExpanded ? 'Show less' : `View all (${filteredItems.length})`}
                          </Text>
                          <ChevronRight
                            size={13}
                            color="#245FA8"
                            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View className="flex-row flex-wrap gap-y-2.5 -mx-1">
                      {displayedItems.map((item) => {
                        const meta = ALL_AVAILABLE_FEATURES.find((f) => f.id === item.id);
                        const iconName = meta?.iconName || item.iconName;
                        const colorIcon = meta?.colorIcon || item.colorIcon || '#245FA8';
                        const colorBg = meta?.colorBg || item.colorBg || 'bg-secondary';
                        const iconShapeClass = meta?.iconShapeClass;

                        return (
                          <ActionTile
                            key={item.id}
                            containerClassName="w-1/3 px-1"
                            iconBgColor={colorBg}
                            iconShapeClass={iconShapeClass}
                            icon={<FeatureIcon iconName={iconName} color={colorIcon} size={22} />}
                            label={tFeatureName(item.id, meta?.name || item.name)}
                            subtitle={tFeatureSubtitle(item.id, meta?.subtitle || item.subtitle)}
                            metaValue={tFeatureSubtitle(item.id, meta?.subtitle || item.subtitle)}
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
        availableFeatures={filteredAvailableFeatures}
        onSave={handleSaveCustomisation}
      />
    </ScreenShell>
  );
}

