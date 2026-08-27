export interface OperatingHours {
  open: string; // e.g. "06:00"
  close: string; // e.g. "22:00"
}

export type AmenityCategory =
  | 'All'
  | 'Gym'
  | 'Pool'
  | 'Tennis'
  | 'Spa'
  | 'Clubhouse'
  | 'Squash'
  | 'BBQ Pit';

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  description: string;
  imageUrls: string[];
  capacity: number;
  operatingHours: OperatingHours;
  pricePerHour: number;
  isAvailableNow: boolean;
  rating?: number;
  reviewCount?: number;
  location?: string;
  rules?: string[];
  features?: string[];
}
