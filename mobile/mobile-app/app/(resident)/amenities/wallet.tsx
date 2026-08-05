import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function DigitalWalletScreen() {
  return (
    <FeatureDetailScreen
      title="Digital Wallet"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:wallet"
      iconName="Wallet"
      iconColor="#06b6d4"
      description="Preload credits into your community wallet for instant amenity slot bookings and automated refund processing."
    />
  );
}
