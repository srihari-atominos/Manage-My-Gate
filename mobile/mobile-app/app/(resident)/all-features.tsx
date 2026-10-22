import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, TextInput, BackHandler, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenShell } from '@/components/ui/ScreenShell';
import {
  X,
  Search,
  ChevronRight,
  RotateCcw,
  Layers,
} from 'lucide-react-native';
import { SectionHeader } from '@/components/common/SectionHeader';
import ActionTile from '@/components/dashboard/ActionTile';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { useQuickActions } from '@/src/features/dashboard/useQuickActions';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ALL_AVAILABLE_FEATURES } from '@/src/features/dashboard/dashboardCatalog';
import { isFeatureAllowedForUser, checkIsAdmin } from '@/src/utils/rbac';
import { useTranslation } from '@/src/utils/i18n';
import { useBottomNavScroll } from '@/components/navigation/BottomNavScrollContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { useColorScheme } from 'nativewind';
import { EmptyState } from '@/components/feedback/EmptyState';

const VISITOR_HEADER_IMAGE = require('../../assets/images/visitor-management/visitor-management-header.png');
const ADMINISTRATION_SECURITY_HEADER_IMAGE = require('../../assets/images/administration-security/administration-security-header.png');
const STAFF_MANAGEMENT_HEADER_IMAGE = require('../../assets/images/staff-management/staff-management-header.png');
const COMMUNITY_DIRECTORY_HEADER_IMAGE = require('../../assets/images/community-directory/community-directory-header.png');
const AMENITIES_BOOKING_HEADER_IMAGE = require('../../assets/images/amenities-booking/amenities-booking-header.png');
const COMPLAINTS_HELPDESK_HEADER_IMAGE = require('../../assets/images/complaints-helpdesk/complaints-helpdesk-header.png');
const NOTICE_BOARD_POLLS_HEADER_IMAGE = require('../../assets/images/notice-board-polls/notice-board-polls-header.png');
const DIGITAL_WALLET_HEADER_IMAGE = require('../../assets/images/digital-wallet/digital-wallet-header.png');
const FINANCIAL_BILLING_HEADER_IMAGE = require('../../assets/images/financial-billing/financial-billing-header.png');

const CATEGORY_HEADER_IMAGES: Record<string, number> = {
  visitor_management: VISITOR_HEADER_IMAGE,
  administration_security: ADMINISTRATION_SECURITY_HEADER_IMAGE,
  staff_management: STAFF_MANAGEMENT_HEADER_IMAGE,
  community_directory: COMMUNITY_DIRECTORY_HEADER_IMAGE,
  amenities_facilities: AMENITIES_BOOKING_HEADER_IMAGE,
  complaints_helpdesk: COMPLAINTS_HELPDESK_HEADER_IMAGE,
  notice_board_polls: NOTICE_BOARD_POLLS_HEADER_IMAGE,
  digital_wallet: DIGITAL_WALLET_HEADER_IMAGE,
  financial_billing: FINANCIAL_BILLING_HEADER_IMAGE,
};


const FEATURES_BY_ID = new Map((ALL_AVAILABLE_FEATURES as any[]).map((f) => [f.id, f]));

const CATEGORY_META: Record<string, { icon: string; subKey: string; subtitle: string; color: string; bgColor: string; darkBgColor: string }> = {
  visitor_management: { icon: 'ShieldCheck', subKey: 'cat_visitor_sub', subtitle: 'Security & Gate Access', color: '#2563EB', bgColor: 'bg-blue-50', darkBgColor: 'bg-blue-950/40' },
  amenities_facilities: { icon: 'Sparkles', subKey: 'cat_amenities_sub', subtitle: 'Facilities & Reservations', color: '#16A34A', bgColor: 'bg-emerald-50', darkBgColor: 'bg-emerald-950/40' },
  complaints_helpdesk: { icon: 'ListTodo', subKey: 'cat_complaints_sub', subtitle: 'Issues & SLA Helpdesk', color: '#7C3AED', bgColor: 'bg-purple-50', darkBgColor: 'bg-purple-950/40' },
  notice_board_polls: { icon: 'Megaphone', subKey: 'cat_notice_sub', subtitle: 'Broadcasts & Resident Polls', color: '#DB2777', bgColor: 'bg-pink-50', darkBgColor: 'bg-pink-950/40' },
  digital_wallet: { icon: 'WalletCards', subKey: 'cat_wallet_sub', subtitle: 'Prepaid Balance & Ledger', color: '#10B981', bgColor: 'bg-emerald-50', darkBgColor: 'bg-emerald-950/40' },
  financial_billing: { icon: 'CreditCard', subKey: 'cat_billing_sub', subtitle: 'Dues, Invoices & Accounts', color: '#0D9488', bgColor: 'bg-teal-50', darkBgColor: 'bg-teal-950/40' },
  staff_management: { icon: 'Users', subKey: 'cat_staff_sub', subtitle: 'Registry, Duty & Household Passes', color: '#2563EB', bgColor: 'bg-blue-50', darkBgColor: 'bg-blue-950/40' },
  administration_security: { icon: 'UserRoundCog', subKey: 'cat_admin_sub', subtitle: 'Staff, RBAC & Settings', color: '#D97706', bgColor: 'bg-amber-50', darkBgColor: 'bg-amber-950/40' },
  community_directory: { icon: 'Building2', subKey: '', subtitle: 'Module Features', color: '#2563EB', bgColor: 'bg-blue-50', darkBgColor: 'bg-blue-950/40' },
};

const DEFAULT_CATEGORY_META = {
  icon: 'Layers',
  subKey: '',
  subtitle: 'Module Features',
  color: '#FF6A00',
  bgColor: 'bg-primary/10',
  darkBgColor: 'bg-primary/20',
};

export default function AllFeaturesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const { t, tCategoryName, tFeatureName, tFeatureSubtitle, translateText, language } = useTranslation();
  const { scrollHandlerProps } = useBottomNavScroll();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle Expo Router stringified params safely
  const initialCategory = params.category && params.category !== 'null' && params.category !== 'undefined' 
    ? params.category 
    : null;
    
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(initialCategory);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  const { user } = useAuth();
  const { featureCatalog, allFeaturesList } = useQuickActions();

  // Authoritative filtering: only categories with allowed items for this user are accessible
  const accessibleCategories = useMemo(() => {
    if (!featureCatalog || featureCatalog.length === 0) return [];
    return featureCatalog
      .map((cat) => {
        const allowedItems = (cat.items || []).filter((item) => {
          if (searchQuery) {
            const localizedName = tFeatureName(item.id, item.name);
            const q = searchQuery.toLowerCase();
            if (
              !item.name.toLowerCase().includes(q) &&
              !localizedName.toLowerCase().includes(q)
            ) {
              return false;
            }
          }
          return isFeatureAllowedForUser(item, user);
        });
        return { ...cat, items: allowedItems };
      })
      .filter((cat) => cat.items.length > 0);
  }, [featureCatalog, user, searchQuery, tFeatureName]);

  // Fast instant mount matching bottom nav tab contract
  const [isReady] = useState(true);

  // Sync selected category with accessible categories
  useEffect(() => {
    if (accessibleCategories.length > 0 && selectedCategoryKey !== null) {
      const categoryExists = accessibleCategories.some(cat => cat.categoryKey === selectedCategoryKey);
      if (!categoryExists) {
        setSelectedCategoryKey(null);
      }
    }
  }, [accessibleCategories, selectedCategoryKey]);

  // Standard Back Button Handler: Navigates back to previous page
  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return true;
    }
    router.replace('/(resident)/dashboard' as any);
    return true;
  }, [router]);

  // Hardware / Gesture Back Button Listener
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => subscription.remove();
    }, [handleBackPress])
  );

  const handleTileClick = useCallback((tileId: string) => {
    if (tileId === 'visitor_resident_passes') {
      router.navigate('/(resident)/visitor' as any);
      return;
    }
    if (tileId === 'visitor_gate_console') {
      router.navigate('/(resident)/visitor/gate-console' as any);
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
    if (tileId === 'financial_history') {
      router.navigate('/(resident)/billing/history' as any);
      return;
    }
    if (tileId === 'billing_wallet' || tileId === 'amenities_wallet') {
      router.navigate('/(resident)/billing/wallet' as any);
      return;
    }
    if (tileId === 'billing_my_invoices') {
      router.navigate('/(resident)/billing/my-dues' as any);
      return;
    }
    let feature = allFeaturesList.find((item) => item.id === tileId);
    if (!feature) {
      feature = FEATURES_BY_ID.get(tileId);
    }
    
    if (feature && feature.route) {
      const targetRoute = feature.route.endsWith('/resident-passes') ? '/(resident)/visitor' : feature.route;
      router.navigate(targetRoute as any);
    }
  }, [allFeaturesList, router]);

  const toggleCategoryExpand = (catKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  const isAdminRole = checkIsAdmin(user);
  const activeCategory = accessibleCategories?.find(cat => cat.categoryKey === selectedCategoryKey);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ScreenShell
      title={t('all_features', 'All Features')}
      subtitle={t('explore_quick_actions', 'Explore community quick actions and services')}
      iconName="LayoutGrid"
      scrollable={false}
      showBackButton={true}
      onBackPress={handleBackPress}
      loading={!isReady}
      disableInteractionDeferral
    >
      {isReady ? (
        <ScrollView
          className="flex-1 px-4 pt-3"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        {...scrollHandlerProps}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 95, 130) }}
      >
        <View className="gap-4 pb-8 max-w-md mx-auto w-full">
          {/* Search All Features Bar */}
          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t('search_all_features', 'Search all features...')}
            className="px-0 py-0"
          />

          {/* Filter Pills */}
          {accessibleCategories && accessibleCategories.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              className="mb-1 -mt-1"
              contentContainerStyle={{ paddingRight: 20 }}
            >
              <TouchableOpacity
                onPress={() => setSelectedCategoryKey(null)}
                className={`px-4 py-1.5 rounded-full mr-2.5 ${!selectedCategoryKey ? 'bg-primary shadow-xs border border-transparent' : 'bg-card border border-border/60'}`}
              >
                <Text className={`text-[12px] font-bold tracking-tight ${!selectedCategoryKey ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                  {t('all', 'All')}
                </Text>
              </TouchableOpacity>
              
              {accessibleCategories.map((cat) => {
                const isSelected = selectedCategoryKey === cat.categoryKey;
                let shortName = tCategoryName(cat.categoryKey, cat.categoryName);
                if (shortName.includes('&')) {
                   shortName = shortName.split('&')[0].trim();
                }
                return (
                  <TouchableOpacity
                    key={cat.categoryKey}
                    onPress={() => setSelectedCategoryKey(cat.categoryKey)}
                    className={`px-4 py-1.5 rounded-full mr-2.5 ${isSelected ? 'bg-primary shadow-xs border border-transparent' : 'bg-card border border-border/60'}`}
                  >
                    <Text className={`text-[12px] font-bold tracking-tight ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                      {shortName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* DYNAMIC CATEGORY SECTIONS FROM BACKEND */}
          {accessibleCategories && accessibleCategories.length > 0 ? (
            accessibleCategories
              .filter((cat) => !selectedCategoryKey || cat.categoryKey === selectedCategoryKey)
              .map((category) => {
                const filteredItems = category.items;

                if (filteredItems.length === 0) return null;

                const isExpanded = Boolean(expandedCategories[category.categoryKey]) || Boolean(searchQuery);
                const hasMore = filteredItems.length > 8;
                const displayedItems = isExpanded ? filteredItems : filteredItems.slice(0, 8);
                const currentMeta = CATEGORY_META[category.categoryKey] || DEFAULT_CATEGORY_META;

                const actionLabel = hasMore
                  ? isExpanded
                    ? t('show_less', 'Show less')
                    : t('view_all_count', `View all (${filteredItems.length})`, { count: filteredItems.length })
                  : undefined;

                return (
                  <View key={category.categoryKey} className="gap-2">
                    {CATEGORY_HEADER_IMAGES[category.categoryKey] ? (
                      <View className="flex-row items-center justify-between px-1 py-1.5">
                        <View className="flex-row items-center flex-1 min-w-0 me-2">
                          <Image
                            source={CATEGORY_HEADER_IMAGES[category.categoryKey]}
                            resizeMode="cover"
                            accessibilityLabel={category.categoryName}
                            style={{ width: 44, height: 44, borderRadius: 12 }}
                            className="me-2.5 h-11 w-11 shrink-0 rounded-xl"
                          />
                          <View className="flex-1 min-w-0 justify-center">
                            <Text className="text-[17px] sm:text-[18px] font-bold text-foreground tracking-tight">
                              {tCategoryName(category.categoryKey, category.categoryName)}
                            </Text>
                            <Text numberOfLines={1} className="text-[12px] sm:text-[13px] font-normal text-muted-foreground mt-0.5 tracking-normal">
                              {currentMeta.subKey ? t(currentMeta.subKey, currentMeta.subtitle) : translateText(currentMeta.subtitle)} · {filteredItems.length} {filteredItems.length === 1 ? 'feature' : 'features'}
                            </Text>
                          </View>
                        </View>
                        {actionLabel && hasMore ? (
                          <TouchableOpacity
                            onPress={() => toggleCategoryExpand(category.categoryKey)}
                            className="flex-row min-h-9 items-center gap-1.5 bg-card border border-border/80 px-3 py-1 rounded-full shrink-0 shadow-2xs"
                            accessibilityRole="button"
                            accessibilityLabel={actionLabel}
                          >
                            <Text className="text-[12px] font-bold text-foreground">{actionLabel}</Text>
                            <ChevronRight size={12} color={isDark ? '#FFFFFF' : '#111827'} strokeWidth={2.4} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : (
                      <SectionHeader
                        title={tCategoryName(category.categoryKey, category.categoryName)}
                        subtitle={currentMeta.subKey ? t(currentMeta.subKey, currentMeta.subtitle) : translateText(currentMeta.subtitle)}
                        count={filteredItems.length}
                        icon={currentMeta.icon}
                        iconColor={currentMeta.color}
                        iconBgColor={isDark ? currentMeta.darkBgColor : currentMeta.bgColor}
                        actionLabel={actionLabel}
                        isExpanded={isExpanded}
                        onAction={hasMore ? () => toggleCategoryExpand(category.categoryKey) : undefined}
                        className="px-0 py-0.5"
                      />
                    )}

                    <View className="flex-row flex-wrap justify-start gap-x-[2.4%] gap-y-3.5">
                      {displayedItems.map((item) => {
                        const meta = FEATURES_BY_ID.get(item.id);
                        const iconName = meta?.iconName || item.iconName;
                        const imageName = meta?.imageName || (item as any).imageName;
                        const colorIcon = meta?.colorIcon || item.colorIcon || '#245FA8';
                        const badge = meta?.badge || item.badge;
                        const badgeColor = meta?.badgeColor || item.badgeColor;

                        return (
                          <ActionTile
                            key={item.id}
                            compact={true}
                            containerClassName="w-[23.2%]"
                            iconIsImage={Boolean(imageName)}
                            icon={<FeatureIcon iconName={iconName} imageName={imageName} color={colorIcon} size={imageName ? 20 : 23} strokeWidth={1.9} />}
                            label={tFeatureName(item.id, meta?.name || item.name)}
                            subtitle={tFeatureSubtitle(item.id, meta?.subtitle || item.subtitle)}
                            metaValue={tFeatureSubtitle(item.id, meta?.subtitle || item.subtitle)}
                            badge={badge}
                            badgeColor={badgeColor}
                            onPress={() => handleTileClick(item.id)}
                          />
                        );
                      })}
                    </View>
                  </View>
                );
              })
          ) : (
            <EmptyState
              icon={Search}
              title={searchQuery ? t('no_matching_features', 'No features found') : t('no_accessible_features', 'No features available')}
              description={searchQuery ? t('try_adjusting_search', 'Try adjusting your search terms') : t('no_permissions_assigned', 'No features have been assigned to your role.')}
            />
          )}
        </View>
      </ScrollView>
      ) : null}
    </ScreenShell>
  );
}
