import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchBar } from '@/components/forms/SearchBar';
import { Chip } from '@/components/common/Chip';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import { useResidentDiscover } from '../../../src/features/amenities/hooks/useResidentDiscover';
import { ResidentAmenityDetailSheet } from '../../../src/features/amenities/components/ResidentAmenityDetailSheet';
import { Amenity } from '../../../src/features/amenities/store/amenitySlice';

export default function DiscoverAmenitiesScreen() {
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

  const renderHeader = () => (
    <View className="mb-3">
      {/* Search Bar */}
      <View className="mb-3">
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder="Search amenities, clubhouse, pool..."
        />
      </View>

      {/* Category Horizontal Filter Chips */}
      <View className="mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {categories.map((cat) => (
            <View key={cat} className="mr-2">
              <Chip
                label={cat}
                selected={selectedCategory === cat}
                onPress={() => handleCategorySelect(cat)}
              />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Discovery Quick Stats Bar */}
      {!loading && stats.totalCount > 0 ? (
        <View className="flex-row items-center gap-2 mb-3 bg-card p-2.5 rounded-2xl border border-border">
          <View className="bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            <Text className="text-xs font-bold text-primary">{stats.totalCount} Facilities</Text>
          </View>
          <View className="bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {stats.activeCount} Available
            </Text>
          </View>
          {stats.maintenanceCount > 0 ? (
            <View className="bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {stats.maintenanceCount} Maintenance
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderAmenityItem = (item: Amenity) => {
    const itemStatus = (item.status || 'active').toLowerCase();
    const currentStatus = (item.currentStatus || '').toLowerCase();
    const isMaintenance = itemStatus === 'maintenance' || currentStatus === 'under maintenance';
    const isInactive = itemStatus === 'inactive' || currentStatus === 'unavailable';
    const isAvailable = !isMaintenance && !isInactive && itemStatus === 'active';

    const pricingType = item.pricing?.pricingType || 'hourly';
    const baseRate = item.pricing?.baseRate ?? item.bookingFee ?? 0;
    const openTime = item.bookingRules?.openTime || item.openTime || '08:00';
    const closeTime = item.bookingRules?.closeTime || item.closeTime || '21:00';
    const category = item.category || item.type || 'General';
    const imageUrl = item.imageUrl || (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '');

    return (
      <View key={item._id} className="mb-3">
        <Pressable onPress={() => setSelectedAmenityPreview(item)}>
          {imageUrl ? (
            <View className="bg-card rounded-2xl border border-border overflow-hidden p-3.5 gap-2.5 shadow-sm">
              {/* Image Banner */}
              <View className="h-36 w-full rounded-xl overflow-hidden relative">
                <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute top-2 left-2 bg-black/60 px-2.5 py-1 rounded-full">
                  <Text className="text-white text-[10px] font-bold uppercase tracking-wider">{category}</Text>
                </View>
                <View className="absolute top-2 right-2 bg-primary px-2.5 py-1 rounded-full">
                  <Text className="text-white text-xs font-extrabold">
                    {baseRate ? `$${baseRate}/${pricingType === 'daily' ? 'day' : 'slot'}` : 'Free'}
                  </Text>
                </View>
              </View>

              {/* Title & Details */}
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="font-bold text-base text-foreground">{item.name}</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {item.location || 'Zone'} • Cap: {item.capacity || 20} • {openTime}-{closeTime}
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              <Button
                variant={isAvailable ? 'default' : 'outline'}
                disabled={!isAvailable}
                onPress={() => navigateToBooking(item._id)}
                className={`py-2.5 rounded-xl min-h-[48px] justify-center ${isAvailable ? 'bg-primary' : 'bg-muted/40 border-border'}`}
              >
                <Text className={`font-bold text-xs ${isAvailable ? 'text-white' : 'text-muted-foreground'}`}>
                  {isMaintenance ? 'Under Maintenance' : isInactive ? 'Facility Inactive' : 'Reserve Space'}
                </Text>
              </Button>
            </View>
          ) : (
            <ListCard
              title={item.name}
              subtitle={`${category} • ${item.location || 'Zone'} • Cap: ${item.capacity || 20} • ${openTime}-${closeTime}`}
              leftIcon={item.iconName || 'Building2'}
              leftIconBgColor="#dbeafe"
              leftIconColor="#2563eb"
              status={{
                label: isMaintenance ? 'Maintenance' : isInactive ? 'Inactive' : 'Available',
                variant: isMaintenance ? 'warning' : isInactive ? 'neutral' : 'success',
              }}
              secondaryBadge={
                baseRate
                  ? { label: `$${baseRate}/${pricingType === 'daily' ? 'day' : 'slot'}`, variant: 'info' }
                  : { label: 'Free', variant: 'neutral' }
              }
            />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <ScreenShell
      title="Discover Amenities"
      subtitle="Browse & reserve community facilities"
      iconName="Search"
      loading={false}
      error={error}
      onRetry={handleRetry}
    >
      <View className="flex-1 px-4 pt-2">
        {/* Catalog Paginated List */}
        <PaginatedList
          data={amenities}
          renderItem={renderAmenityItem}
          pagination={pagination}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Building2"
          emptyTitle="No Amenities Found"
          emptySubtitle="Try adjusting your search query or category filter."
          contentContainerClassName="pb-6"
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
