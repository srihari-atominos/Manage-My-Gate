import React from 'react';
import { View, ScrollView } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { DatePicker } from '@/components/common/DatePicker';
import { QuantitySelector } from '@/components/common/QuantitySelector';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { DetailSection } from '@/components/ui/DetailSection';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useResidentBooking } from '../../../../src/features/amenities/hooks/useResidentBooking';
import { TimeSlotSelector } from '../../../../src/features/amenities/components/TimeSlotSelector';
import { BookingCheckoutModal } from '../../../../src/features/amenities/components/BookingCheckoutModal';
import { WalletTopUpModal } from '../../../../src/features/amenities/components/WalletTopUpModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

export default function AmenitySlotWizardScreen() {
  const {
    currentAmenity,
    slots,
    selectedDate,
    selectedSlot,
    guestsCount,
    paymentMethod,
    isCheckoutOpen,
    isTopUpOpen,
    balance,
    toppingUp,
    totalFee,
    isBalanceSufficient,
    loading,
    creatingBooking,
    error,
    isOCCError,
    occErrorMessage,
    isSuccessModalOpen,
    handleCloseSuccessModal,
    handleViewPass,
    handleDateChange,
    handleSlotSelect,
    setGuestsCount,
    setPaymentMethod,
    handleOpenCheckout,
    handleCloseCheckout,
    handleConfirmBooking,
    handleRetryOCC,
    handleOpenTopUp,
    handleCloseTopUp,
    handleTopUpSubmit,
  } = useResidentBooking();

  return (
    <ScreenShell
      title={currentAmenity?.name || 'Reserve Facility'}
      subtitle={currentAmenity?.category || 'Amenity Slot Wizard'}
      iconName="Calendar"
      loading={loading && !currentAmenity}
      error={error && !isOCCError ? error : null}
    >
      <ScrollView className="flex-1 px-4 pt-2" contentContainerClassName="pb-10">
        {/* OCC Conflict Alert Banner */}
        {isOCCError ? (
          <View className="mb-4 bg-amber-500/10 border border-amber-500/40 p-4 rounded-2xl">
            <Text className="text-amber-800 dark:text-amber-200 font-bold text-sm mb-1">
              Slot Concurrency Conflict
            </Text>
            <Text className="text-amber-700 dark:text-amber-300 text-xs mb-3">
              {occErrorMessage || 'Another resident just booked this time slot. Please re-select an available slot.'}
            </Text>
            <Button variant="default" onPress={handleRetryOCC} className="bg-amber-600 self-start">
              <Text className="text-white text-xs font-semibold">Refresh & Re-select</Text>
            </Button>
          </View>
        ) : null}

        {/* Facility Info Card */}
        {currentAmenity ? (
          <View className="bg-card p-4 rounded-2xl border border-border mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text variant="large" className="font-bold text-foreground">
                {currentAmenity.name}
              </Text>
              <StatusBadge
                label={currentAmenity.status || 'ACTIVE'}
                variant={currentAmenity.status === 'MAINTENANCE' ? 'warning' : 'success'}
              />
            </View>
            {currentAmenity.description ? (
              <Text variant="muted" className="text-xs text-muted-foreground mb-3">
                {currentAmenity.description}
              </Text>
            ) : null}

            <View className="flex-row items-center justify-between pt-2 border-t border-border/40">
              <Text variant="muted" className="text-xs">
                Location: {currentAmenity.location || 'Community Clubhouse'}
              </Text>
              <Text variant="muted" className="text-xs font-semibold text-foreground">
                Rate: {currentAmenity.bookingFee ? `$${currentAmenity.bookingFee}/slot` : 'Free'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Date Selection */}
        <View className="mb-4">
          <DatePicker
            label="Booking Date"
            value={new Date(selectedDate)}
            onChange={(d) => {
              const offset = d.getTimezoneOffset();
              const localDate = new Date(d.getTime() - (offset * 60 * 1000));
              handleDateChange(localDate.toISOString().split('T')[0]);
            }}
          />
        </View>

        {/* Daily Booking Info or Time Slot Selector */}
        {currentAmenity?.pricing?.pricingType === 'daily' ? (
          <View className="bg-card p-4 rounded-2xl border border-border mb-4 mt-2">
            <Text className="font-semibold text-sm text-foreground mb-3">Daily Booking Details</Text>
            <View className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 mb-2 flex-row items-center">
              <Text className="text-emerald-700 dark:text-emerald-300 font-medium text-xs flex-1">
                Operating Hours: {currentAmenity.bookingRules?.openTime || '00:00'} - {currentAmenity.bookingRules?.closeTime || '23:59'}
              </Text>
              <StatusBadge label="Full Day" variant="success" />
            </View>
            <View className="flex-row items-center justify-between">
              <Text variant="muted" className="text-xs">Capacity Included:</Text>
              <Text className="text-sm font-semibold">{currentAmenity.capacity || 1} Persons</Text>
            </View>
          </View>
        ) : (
          <TimeSlotSelector
            slots={slots}
            selectedSlot={selectedSlot}
            onSlotSelect={handleSlotSelect}
            loading={loading}
          />
        )}

        {/* Guests Count Selector */}
        {currentAmenity?.pricing?.pricingType !== 'daily' ? (
          <View className="bg-card p-4 rounded-2xl border border-border my-3 flex-row items-center justify-between">
            <View>
              <Text className="font-semibold text-sm text-foreground">Guests Count</Text>
              <Text variant="muted" className="text-xs text-muted-foreground mt-0.5">
                Number of attendees for this slot
              </Text>
            </View>
            <QuantitySelector
              value={guestsCount}
              min={1}
              max={currentAmenity?.capacity || 10}
              onChange={setGuestsCount}
            />
          </View>
        ) : null}

      </ScrollView>

      {/* Proceed to Checkout CTA - Sticky Bottom */}
      <View className="px-4 py-3 bg-card border-t border-border mt-auto">
        <Button
          variant="default"
          disabled={(currentAmenity?.pricing?.pricingType !== 'daily' && !selectedSlot) || loading}
          onPress={handleOpenCheckout}
          className="bg-primary min-h-[56px] justify-center"
        >
          <Text className="text-white font-bold text-base">
            {currentAmenity?.pricing?.pricingType === 'daily' || selectedSlot
              ? `Proceed to Checkout ($${totalFee.toFixed(2)})`
              : 'Select a Time Slot'}
          </Text>
        </Button>
      </View>

      {/* Checkout Review Bottom Sheet Modal */}
      <BookingCheckoutModal
        visible={isCheckoutOpen}
        onClose={handleCloseCheckout}
        onConfirm={handleConfirmBooking}
        amenity={currentAmenity}
        slot={selectedSlot}
        date={selectedDate}
        guestsCount={guestsCount}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        walletBalance={balance}
        totalFee={totalFee}
        isBalanceSufficient={isBalanceSufficient}
        loading={creatingBooking}
        error={error && !isOCCError ? error : null}
        onTopUp={handleOpenTopUp}
      />

      {/* Wallet Top-Up Modal */}
      <WalletTopUpModal
        visible={isTopUpOpen}
        onClose={handleCloseTopUp}
        onSubmit={handleTopUpSubmit}
        loading={toppingUp}
      />

      {/* Success Confirmation Modal */}
      <ConfirmationModal
        visible={isSuccessModalOpen}
        title="Reservation Confirmed!"
        message="Your amenity reservation has been placed successfully. You can view your active reservations and passes in My Bookings."
        confirmLabel="Go to My Bookings"
        cancelLabel="Close"
        variant="info"
        onConfirm={handleViewPass}
        onCancel={handleCloseSuccessModal}
      />
    </ScreenShell>
  );
}
