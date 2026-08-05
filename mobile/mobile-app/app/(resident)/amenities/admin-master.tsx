import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AdminMasterScreen() {
  return (
    <FeatureDetailScreen
      title="Amenity Master Management"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:amenities"
      iconName="Building2"
      iconColor="#14b8a6"
      description="Configure community amenities, operating hours, slot capacities, hourly pricing, and booking restrictions."
    />
  );
}
