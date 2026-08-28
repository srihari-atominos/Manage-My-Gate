export type BookingStatus = 'available' | 'booked' | 'selected' | 'maintenance';

export interface BookingSlot {
  id: string;
  amenityId: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:mm format, e.g. "09:00"
  endTime: string; // HH:mm format, e.g. "10:00"
  status: BookingStatus;
  price?: number;
}

export interface AmenityBookingRequest {
  amenityId: string;
  slotIds: string[];
  date: string;
  totalPrice: number;
  notes?: string;
}

export interface AmenityBookingConfirmation {
  bookingId: string;
  amenityName: string;
  date: string;
  slots: { startTime: string; endTime: string }[];
  totalPrice: number;
  status: 'CONFIRMED' | 'PENDING';
  qrCodeUrl?: string;
  createdAt: string;
}
