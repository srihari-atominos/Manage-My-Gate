import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AmenitySettingsScreen() {
  return (
    <FeatureDetailScreen
      title="Amenity Settings"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:settings"
      iconName="SlidersHorizontal"
      iconColor="#f43f5e"
      description="Configure advance booking windows, auto-cancellation timers, refund percentage rules, and guest limit policies."
    />
  );
}
