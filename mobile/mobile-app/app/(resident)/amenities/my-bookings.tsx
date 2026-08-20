import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ListCard } from '@/components/ui/ListCard';
import { Chip } from '@/components/common/Chip';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { AppDispatch, RootState } from '../../../src/store/store';
import {
  fetchMyBookingsThunk,
  cancelBookingThunk,
  AmenityBooking,
} from '../../../src/features/amenities/store/amenityBookingSlice';
import { PassQRModal } from '../../../src/features/amenities/components/PassQRModal';
import { CancelBookingModal } from '../../../src/features/amenities/components/CancelBookingModal';

export default function MyBookingsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [selectedPassForQR, setSelectedPassForQR] = useState<AmenityBooking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AmenityBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { myBookings, loading, error, pagination } = useSelector(
    (state: RootState) => state.amenityBookings
  );

  const filterTabs = ['All', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchMyBookingsThunk({}));
    }, [dispatch])
  );

  const filteredBookings = useMemo(() => {
    if (selectedFilter === 'All') return myBookings;
    // Compare status case‑insensitively because backend may return mixed‑case values
    return myBookings.filter((b) => (b.status || '').toUpperCase() === selectedFilter);
  }, [myBookings, selectedFilter]);

  const handleRefresh = () => {
    dispatch(fetchMyBookingsThunk({}));
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    await dispatch(cancelBookingThunk({ bookingId: cancelTarget._id, reason }));
    setCancelTarget(null);
    setIsCancelling(false);
    dispatch(fetchMyBookingsThunk({}));
  };

  const getEntryStatus = (item: AmenityBooking): { label: string, variant: StatusVariant } => {
    const s = (item?.status || '').toLowerCase();
    const q = (item?.qrStatus || '').toLowerCase();
    
    if (q === 'expired') return { label: 'Expired', variant: 'danger' };
    switch (s) {
      case 'checked_in':
      case 'checked-in':
        return { label: 'Entered', variant: 'info' };
      case 'completed':
        return { label: 'Completed', variant: 'neutral' };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'danger' };
      default:
        return { label: 'Not Entered', variant: 'warning' };
    }
  };

  const getPaymentStatus = (item: AmenityBooking): { label: string, variant: StatusVariant } => {
    const s = (item.paymentStatus || '').toLowerCase();
    const bs = item.status.toLowerCase();

    if (['success', 'completed', 'paid'].includes(s)) return { label: 'Paid', variant: 'success' };
    if (s === 'failed') return { label: 'Failed', variant: 'danger' };
    if (s === 'refunded') return { label: 'Refunded', variant: 'info' };
    if (s === 'partial_refund') return { label: 'Partial Refund', variant: 'info' };

    if (bs === 'confirmed') return { label: 'Paid', variant: 'success' };
    if (bs === 'cancelled') return { label: 'Refunded', variant: 'info' };

    return { label: 'Paid', variant: 'success' };
  };

  const getQrStatus = (item: AmenityBooking): { label: string, variant: StatusVariant } => {
    const s = (item?.status || '').toLowerCase();
    const q = (item?.qrStatus || '').toLowerCase();
    
    if (s === 'cancelled') return { label: 'Revoked', variant: 'danger' };
    switch (q) {
      case 'active':
        return { label: 'Active', variant: 'success' };
      case 'expired':
        return { label: 'Expired', variant: 'danger' };
      case 'revoked':
        return { label: 'Revoked', variant: 'danger' };
      default:
        return { label: item.qrStatus || 'N/A', variant: 'neutral' };
    }
  };

  const renderBookingItem = (item: AmenityBooking) => {
    const amenityObj = typeof item.amenityId === 'object' && item.amenityId ? item.amenityId : null;
    const amenityName = amenityObj?.name || item.amenityName || 'Amenity Pass';
    const coverImage = amenityObj?.images?.[0];
    const isCancelable = item.status === 'CONFIRMED' || item.status === 'PENDING';
    const bookingIdDisplay = item.bookingId || (item._id ? String(item._id).substring(0, 8).toUpperCase() : 'PASS');
    
    const entryStatus = getEntryStatus(item);
    const paymentStatus = getPaymentStatus(item);
    const qrStatus = getQrStatus(item);

    const formatTime = (isoString?: string) => {
      if (!isoString) return '-';
      try {
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return '-';
      }
    };

    return (
      <View className="mb-3 bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <ListCard
          title={amenityName}
          subtitle={`${item.date} • ${item.startTime} - ${item.endTime}`}
          leftImage={coverImage}
          leftIcon={!coverImage ? 'CalendarCheck' : undefined}
          onPress={() => setSelectedPassForQR(item)}
          className="border-0 rounded-none bg-transparent"
          status={{
            label: item.status,
            variant:
              item.status === 'CONFIRMED'
                ? 'success'
                : item.status === 'CHECKED_IN'
                ? 'info'
                : item.status === 'CANCELLED'
                ? 'danger'
                : 'neutral',
          }}
          secondaryBadge={paymentStatus}
        />
        
        {/* Compact Details Grid */}
        <View className="px-3.5 py-2.5 bg-muted/20 border-t border-border/50 flex-col gap-2">
          <View className="flex-row justify-between items-center">
            <Text variant="muted" className="text-xs font-medium">Booking ID: <Text className="font-bold text-foreground text-xs">{bookingIdDisplay}</Text></Text>
            <Text variant="muted" className="text-xs font-medium">Guests: <Text className="font-semibold text-foreground text-xs">{item.numberOfPersons || 1} Person(s)</Text></Text>
          </View>
          <View className="flex-row justify-between items-center pt-1.5 border-t border-border/20">
            <View className="flex-row items-center gap-1.5">
              <Text variant="muted" className="text-xs">Entry:</Text>
              <StatusBadge label={entryStatus.label} variant={entryStatus.variant} size="sm" />
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text variant="muted" className="text-xs">Pass QR:</Text>
              <StatusBadge label={qrStatus.label} variant={qrStatus.variant} size="sm" />
            </View>
          </View>
        </View>

        {isCancelable && (
          <View className="flex-row justify-between items-center px-3.5 py-2 border-t border-border/40 bg-card">
            <Button
              variant="ghost"
              onPress={() => setSelectedPassForQR(item)}
              className="py-1 px-2.5 h-8"
            >
              <Text className="text-primary text-xs font-semibold">View Pass QR</Text>
            </Button>
            <Button
              variant="destructive"
              onPress={() => setCancelTarget(item)}
              className="py-1 px-3 h-8"
            >
              <Text className="text-white text-xs font-semibold">
                Cancel Booking
              </Text>
            </Button>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenShell
      title="My Amenity Bookings"
      subtitle="View, manage & access your digital reservation passes"
      iconName="CalendarCheck"
      loading={loading && myBookings.length === 0}
      error={error}
      onRetry={handleRefresh}
    >
      <View className="flex-1 px-4 pt-2">
        {/* Status Filter Chips */}
        <View className="mb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {filterTabs.map((tab) => (
              <View key={tab} className="me-2">
                <Chip
                  label={tab}
                  selected={selectedFilter === tab}
                  onPress={() => setSelectedFilter(tab)}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Paginated List of Bookings */}
        <PaginatedList
          data={filteredBookings}
          renderItem={renderBookingItem}
          pagination={pagination}
          onLoadMore={() => {
            if (pagination.currentPage < pagination.totalPages) {
              dispatch(fetchMyBookingsThunk({ page: pagination.currentPage + 1 }));
            }
          }}
          onRefresh={handleRefresh}
          loading={loading}
          emptyIcon="CalendarX"
          emptyTitle="No Bookings Found"
          emptySubtitle="You have no reservations matching this filter."
          contentContainerClassName="pb-6"
        />
      </View>

      {/* Digital Pass QR Viewer Modal */}
      <PassQRModal
        visible={!!selectedPassForQR}
        onClose={() => setSelectedPassForQR(null)}
        booking={selectedPassForQR}
      />

      {/* Cancel Confirmation Modal */}
      <CancelBookingModal
        visible={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        booking={cancelTarget}
        loading={isCancelling}
      />
    </ScreenShell>
  );
}

