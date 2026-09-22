import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { CalendarCheck } from 'lucide-react-native';

import { useResidentDiscover } from '../../../src/features/amenities/hooks/useResidentDiscover';
import { ResidentAmenityDetailSheet } from '../../../src/features/amenities/components/ResidentAmenityDetailSheet';
import { AmenityCatalogCard } from '../../../src/features/amenities/components/AmenityCatalogCard';
import { Amenity } from '../../../src/features/amenities/store/amenitySlice';

import { useTranslation } from '@/src/utils/i18n';

export default function DiscoverAmenitiesScreen() {
  const router = useRouter();
  const { t, translateText, language } = useTranslation();
  const {
    amenities,
    categories,
    selectedCategory,
    searchQuery,
    pagination,
    stats,
    selectedAmenityPreview,
    setSelectedAmenityPreview,
    loading,
    error,
    handleCategorySelect,
    handleSearchChange,
    handleRefresh,
    handleLoadMore,
    handleRetry,
    navigateToBooking,
  } = useResidentDiscover();

  const categorySortOptions = React.useMemo(() => {
    return categories.map((cat) => ({
      label: cat.toLowerCase() === 'all' ? t('all', 'All') : translateText(cat),
      value: cat,
    }));
  }, [categories, language, t, translateText]);

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* Unified Search & Category Filter Bar */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('search_amenities_placeholder', 'Search amenities, clubhouse, pool...')}
        sortOptions={categorySortOptions}
        currentSort={selectedCategory}
        onSortChange={handleCategorySelect}
        className="px-0 py-0 border-0"
      />

      {/* Discovery Quick Stats Bar */}
      {!loading && stats.totalCount > 0 ? (
        <View className="flex-row items-center gap-2 bg-card p-2.5 rounded-2xl border border-border">
          <View className="bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/30">
            <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {stats.totalCount} {t('facilities', 'Facilities')}
            </Text>
          </View>
          <View className="bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {stats.activeCount} {t('available', 'Available')}
            </Text>
          </View>
          {stats.maintenanceCount > 0 ? (
            <View className="bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30">
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {stats.maintenanceCount} {t('maintenance', 'Maintenance')}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderAmenityItem = (item: Amenity) => (
    <AmenityCatalogCard
      key={`${item._id}-${language}`}
      amenity={item}
      onPress={setSelectedAmenityPreview}
      onBookClick={navigateToBooking}
    />
  );

  return (
    <ScreenShell
      title={t('discover_amenities', 'Discover Amenities')}
      subtitle={t('discover_amenities_subtitle', 'Browse & reserve community facilities')}
      iconName="Search"
      loading={false}
      error={error}
      onRetry={handleRetry}
      headerRight={
        <Button
          variant="outline"
          size="sm"
          onPress={() => router.push('/(resident)/amenities/my-bookings' as any)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          accessibilityRole="button"
          accessibilityLabel={t('my_bookings', 'My Bookings')}
        >
          <CalendarCheck size={14} className="text-foreground" />
          <Text className="text-xs font-semibold text-foreground">{t('my_bookings', 'My Bookings')}</Text>
        </Button>
      }
    >
      <View className="flex-1 bg-background">
        {/* Catalog Paginated List */}
        <PaginatedList
          data={amenities}
          renderItem={renderAmenityItem}
          extraData={language}
          keyExtractor={(item) => `${item._id}-${language}`}
          pagination={pagination}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Building2"
          emptyTitle={t('no_amenities_found', 'No Amenities Found')}
          emptySubtitle={t('adjust_search_filter', 'Try adjusting your search query or category filter.')}
          contentContainerClassName="px-4 pt-3 pb-28"
          contentContainerStyle={{ paddingBottom: 110 }}
        />
      </View>

      {/* Resident Amenity Specification & Booking Preview Sheet */}
      <ResidentAmenityDetailSheet
        visible={!!selectedAmenityPreview}
        onClose={() => setSelectedAmenityPreview(null)}
        amenity={selectedAmenityPreview}
        onBookClick={navigateToBooking}
      />
    </ScreenShell>
  );
}
