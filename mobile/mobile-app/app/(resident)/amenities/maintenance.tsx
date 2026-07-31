import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AmenityMaintenanceScreen() {
  return (
    <FeatureDetailScreen
      title="Maintenance Schedule"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:maintenance"
      iconName="Wrench"
      iconColor="#f59e0b"
      description="Schedule facility maintenance downtime, repair windows, equipment servicing, and automatic slot blockouts."
    />
  );
}
