import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AmenityScannerScreen() {
  return (
    <FeatureDetailScreen
      title="Security Gate Scanner"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:scanner"
      iconName="QrCode"
      iconColor="#a855f7"
      description="Facility security scanner for validating booking QR passes at clubhouse, pool, and gym entrance turnstiles."
    />
  );
}
