import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function DiscoverAmenitiesScreen() {
  return (
    <FeatureDetailScreen
      title="Discover Amenities"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:discover"
      iconName="Search"
      iconColor="#3b82f6"
      description="Browse available community facilities, clubhouse amenities, swimming pools, tennis courts, and party halls."
    />
  );
}
