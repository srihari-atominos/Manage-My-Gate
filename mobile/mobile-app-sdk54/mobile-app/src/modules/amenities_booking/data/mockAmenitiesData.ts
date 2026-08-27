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

export const MOCK_AMENITIES: Amenity[] = [
  {
    id: 'amenity-1',
    name: 'Olympus Fitness Center',
    category: 'Gym',
    description:
      'State-of-the-art cardiovascular and strength training equipment with dedicated functional zones and personal trainer availability.',
    imageUrls: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=800&q=80',
    ],
    capacity: 25,
    operatingHours: { open: '06:00', close: '22:00' },
    pricePerHour: 15,
    isAvailableNow: true,
    rating: 4.9,
    reviewCount: 128,
    location: 'Building A - Ground Floor',
    rules: [
      'Gym shoes and proper workout attire required',
      'Wipe down equipment after use',
      'Maximum 2-hour continuous session limit',
    ],
    features: ['Air Conditioned', 'Free WiFi', 'Locker Room', 'Shower Facilities', 'Towel Service'],
  },
  {
    id: 'amenity-2',
    name: 'Azure Infinity Pool',
    category: 'Pool',
    description:
      'Temperature-controlled outdoor infinity pool with panoramic skyline views, sun loungers, and poolside refreshment cabanas.',
    imageUrls: [
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=800&q=80',
    ],
    capacity: 20,
    operatingHours: { open: '07:00', close: '20:00' },
    pricePerHour: 25,
    isAvailableNow: true,
    rating: 4.8,
    reviewCount: 95,
    location: 'Rooftop Terrace - Level 12',
    rules: [
      'Appropriate swimwear mandatory',
      'Children must be supervised by an adult at all times',
      'No glass containers around the pool deck',
    ],
    features: ['Heated Pool', 'Sun Beds', 'Life Guard on Duty', 'Changing Rooms'],
  },
  {
    id: 'amenity-3',
    name: 'Grand Championship Tennis Court',
    category: 'Tennis',
    description:
      'Professional acrylic hardcourt with LED floodlighting for evening play. Equipment rental available on site.',
    imageUrls: [
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
    ],
    capacity: 4,
    operatingHours: { open: '06:00', close: '21:00' },
    pricePerHour: 30,
    isAvailableNow: false,
    rating: 4.7,
    reviewCount: 64,
    location: 'East Wing Sports Complex',
    rules: [
      'Non-marking tennis shoes required',
      'Cancel at least 4 hours before reserved time',
    ],
    features: ['LED Floodlights', 'Racket Rental', 'Water Station', 'Seating Pavilion'],
  },
  {
    id: 'amenity-4',
    name: 'Serenity Wellness Spa & Sauna',
    category: 'Spa',
    description:
      'Tranquil steam sauna, hydrotherapy hot tub, and private massage suites for ultimate relaxation and rejuvenation.',
    imageUrls: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80',
    ],
    capacity: 8,
    operatingHours: { open: '09:00', close: '21:00' },
    pricePerHour: 45,
    isAvailableNow: true,
    rating: 4.95,
    reviewCount: 82,
    location: 'Building B - 2nd Floor',
    rules: ['Quiet zone - maintain low voice volume', 'Shower before entering steam room'],
    features: ['Finnish Sauna', 'Steam Bath', 'Jacuzzi', 'Aromatherapy Room', 'Robes & Slippers'],
  },
  {
    id: 'amenity-5',
    name: 'Royal Resident Clubhouse & Lounge',
    category: 'Clubhouse',
    description:
      'Elegant multi-purpose hall equipped with HD projector, surround sound speakers, billiards table, and catering kitchenette.',
    imageUrls: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    ],
    capacity: 50,
    operatingHours: { open: '08:00', close: '23:00' },
    pricePerHour: 60,
    isAvailableNow: true,
    rating: 4.85,
    reviewCount: 41,
    location: 'Central Community Center',
    rules: [
      'Event security deposit required',
      'Music must turn down to ambient level after 22:00',
    ],
    features: ['HD Projector', 'Billiards Table', 'Kitchenette', 'High-Speed WiFi', 'Bar Counter'],
  },
  {
    id: 'amenity-6',
    name: 'Sunset Garden BBQ Pavilion',
    category: 'BBQ Pit',
    description:
      'Private outdoor barbecue station featuring dual stainless steel gas grills, granite countertops, and shaded dining gazebo.',
    imageUrls: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    ],
    capacity: 12,
    operatingHours: { open: '11:00', close: '22:00' },
    pricePerHour: 20,
    isAvailableNow: true,
    rating: 4.6,
    reviewCount: 38,
    location: 'South Garden Courtyard',
    rules: ['Clean grill tools after use', 'Dispose of food waste in designated bins'],
    features: ['Dual Gas Grills', 'Shaded Gazebo', 'Prep Sink', 'Outdoor Seating'],
  },
];

// Helper to generate dynamic mock booking slots for a given date
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

  return times.map((t, index) => {
    // Deterministic status pattern based on index & date for testing
    const charCodeSum = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const isBooked = (index + charCodeSum) % 4 === 0;
    const isMaintenance = index === 5 && amenityId === 'amenity-3';

    let status: 'available' | 'booked' | 'maintenance' = 'available';
    if (isMaintenance) status = 'maintenance';
    else if (isBooked) status = 'booked';

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
