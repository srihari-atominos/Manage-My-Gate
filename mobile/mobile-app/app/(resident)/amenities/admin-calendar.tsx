import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AdminCalendarScreen() {
  return (
    <FeatureDetailScreen
      title="Admin Booking Calendar"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:admin_calander"
      iconName="CalendarDays"
      iconColor="#03A9F4"
      description="Central master calendar view of all resident facility bookings, slot overlaps, and blackout periods."
    />
  );
}
