import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function MyBookingsScreen() {
  return (
    <FeatureDetailScreen
      title="My Amenity Bookings"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:my_booking"
      iconName="CalendarCheck"
      iconColor="#6366f1"
      description="Track active facility reservations, view booking QR passes, manage cancellations, and review booking history."
    />
  );
}
