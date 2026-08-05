import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AmenityLedgersScreen() {
  return (
    <FeatureDetailScreen
      title="Amenity Ledgers & Accounts"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:ledgers"
      iconName="Receipt"
      iconColor="#10b981"
      description="Track revenue generated from amenity bookings, security deposits, refund processing, and financial ledgers."
    />
  );
}
