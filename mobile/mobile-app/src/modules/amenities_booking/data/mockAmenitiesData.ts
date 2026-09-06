import { Amenity } from '../models/amenity.model';
import { BookingSlot } from '../models/booking.model';

export const MOCK_CATEGORIES: string[] = [
  'All',
  'Gym',
  'Pool',
  'Tennis',
  'Spa',
  'Clubhouse',
  'Squash',
  'BBQ Pit',
];

export const MOCK_AMENITIES: Amenity[] = [];

// Helper to generate dynamic booking slots for a given date, omitting elapsed time slots
export function generateMockSlots(amenityId: string, dateStr: string): BookingSlot[] {
  const times = [
    { start: '07:00', end: '08:00' },
    { start: '08:00', end: '09:00' },
    { start: '09:00', end: '10:00' },
    { start: '10:00', end: '11:00' },
    { start: '11:00', end: '12:00' },
    { start: '13:00', end: '14:00' },
    { start: '14:00', end: '15:00' },
    { start: '15:00', end: '16:00' },
    { start: '16:00', end: '17:00' },
    { start: '17:00', end: '18:00' },
    { start: '18:00', end: '19:00' },
    { start: '19:00', end: '20:00' },
  ];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = dateStr === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return times
    .filter((t) => {
      if (!isToday) return true;
      const [startH = 0, startM = 0] = t.start.split(':').map(Number);
      return startH * 60 + startM >= currentMinutes;
    })
    .map((t, index) => {
      const charCodeSum = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const isBooked = (index + charCodeSum) % 4 === 0;

      let status: 'available' | 'booked' | 'maintenance' = 'available';
      if (isBooked) status = 'booked';

      return {
        id: `slot-${amenityId}-${dateStr}-${t.start}`,
        amenityId,
        date: dateStr,
        startTime: t.start,
        endTime: t.end,
        status,
      };
    });
}
