import { VisitorPass } from '../store/visitorPassSlice';

export type PassTypeKey = 'GUEST' | 'GROUP' | 'CAB' | 'DELIVERY' | 'SERVICE';

export interface ExtendedVisitorPass extends VisitorPass {
  passType: PassTypeKey;
  vehicleNo?: string;
  provider?: string;
  guestCount?: number;
  guestList?: Array<{ name: string; phone: string }>;
  deliveryInstructions?: string;
  orderId?: string;
  packageCount?: number;
  deliveryAction?: string;
  serviceNotes?: string;
  allowedWeekdays?: string[];
  timeWindow?: { startTime: string; endTime: string };
  entryGate?: string;
  approvedBy?: string;
  photoUrl?: string;
  rawPass?: any;
}

export interface WalkInApprovalItem {
  id: string;
  visitorName: string;
  phone: string;
  purpose: string;
  passType: PassTypeKey;
  gateName: string;
  waitingDurationMinutes: number;
  requestTimestamp: string;
  vehicleNo?: string;
  photoUrl?: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rawLog?: any;
}

export const MOCK_CAB_PROVIDERS = [
  { id: 'uber', label: 'Uber', icon: 'Car' },
  { id: 'ola', label: 'Ola', icon: 'Car' },
  { id: 'rapido', label: 'Rapido', icon: 'Bike' },
  { id: 'namma_yatri', label: 'Namma Yatri', icon: 'Car' },
  { id: 'other', label: 'Other Taxi', icon: 'Car' },
];

export const MOCK_DELIVERY_PARTNERS = [
  { id: 'amazon', label: 'Amazon', color: '#ff9900' },
  { id: 'flipkart', label: 'Flipkart', color: '#2874f0' },
  { id: 'swiggy', label: 'Swiggy Instamart', color: '#fc8019' },
  { id: 'zomato', label: 'Zomato / Blinkit', color: '#cb202d' },
  { id: 'dunzo', label: 'Dunzo', color: '#00d290' },
  { id: 'bluedart', label: 'BlueDart / Courier', color: '#003399' },
  { id: 'other', label: 'Other Express', color: '#6b7280' },
];

export const MOCK_SERVICE_TYPES = [
  { id: 'maid', label: 'House Maid / Help', icon: 'Sparkles' },
  { id: 'driver', label: 'Personal Driver', icon: 'Car' },
  { id: 'electrician', label: 'Electrician', icon: 'Zap' },
  { id: 'plumber', label: 'Plumber', icon: 'Wrench' },
  { id: 'cook', label: 'Chef / Cook', icon: 'Utensils' },
  { id: 'gardener', label: 'Gardener', icon: 'Flower2' },
  { id: 'carpenter', label: 'Carpenter', icon: 'Hammer' },
  { id: 'laundry', label: 'Laundry / Dry Clean', icon: 'Shirt' },
  { id: 'other', label: 'General Service', icon: 'Briefcase' },
];

export const MOCK_WEEKDAYS = [
  { id: 'MON', label: 'Mon', fullLabel: 'Monday' },
  { id: 'TUE', label: 'Tue', fullLabel: 'Tuesday' },
  { id: 'WED', label: 'Wed', fullLabel: 'Wednesday' },
  { id: 'THU', label: 'Thu', fullLabel: 'Thursday' },
  { id: 'FRI', label: 'Fri', fullLabel: 'Friday' },
  { id: 'SAT', label: 'Sat', fullLabel: 'Saturday' },
  { id: 'SUN', label: 'Sun', fullLabel: 'Sunday' },
];

export const MOCK_VISITOR_PASSES: ExtendedVisitorPass[] = [
  {
    _id: 'pass-101',
    visitorName: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    purpose: 'Family Weekend Visit',
    passType: 'GUEST',
    status: 'ACTIVE',
    code: '849201',
    validFrom: new Date(Date.now() - 3600000).toISOString(),
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    entryGate: 'Main Gate 1',
  },
  {
    _id: 'pass-102',
    visitorName: 'Swiggy Delivery Executive',
    phone: '+91 91234 56789',
    purpose: 'Food Parcel Delivery',
    passType: 'DELIVERY',
    provider: 'Swiggy',
    status: 'ACTIVE',
    code: '521940',
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7200000).toISOString(),
    deliveryInstructions: 'Leave package with security at Gate 2',
  },
  {
    _id: 'pass-103',
    visitorName: 'Ola Cab (KA-01-MJ-4920)',
    phone: '+91 99887 76655',
    purpose: 'Airport Pickup Taxi',
    passType: 'CAB',
    provider: 'Ola',
    vehicleNo: 'KA-01-MJ-4920',
    status: 'PENDING',
    code: '109348',
    validFrom: new Date(Date.now() + 1800000).toISOString(),
    validUntil: new Date(Date.now() + 5400000).toISOString(),
  },
  {
    _id: 'pass-104',
    visitorName: 'Birthday Celebration Guests',
    phone: '+91 94433 22110',
    purpose: 'Evening House Party',
    passType: 'GROUP',
    guestCount: 6,
    guestList: [
      { name: 'Amit Sharma', phone: '+91 98111 22233' },
      { name: 'Priya Sharma', phone: '+91 98111 22234' },
      { name: 'Vikram Singh', phone: '+91 98111 22235' },
    ],
    status: 'PENDING',
    code: '992014',
    validFrom: new Date(Date.now() + 43200000).toISOString(),
    validUntil: new Date(Date.now() + 129600000).toISOString(),
  },
  {
    _id: 'pass-105',
    visitorName: 'Sunita Devi (House Maid)',
    phone: '+91 97766 55443',
    purpose: 'Daily Housekeeping Service',
    passType: 'SERVICE',
    provider: 'Maid',
    allowedWeekdays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    timeWindow: { startTime: '08:00 AM', endTime: '01:00 PM' },
    status: 'ACTIVE',
    code: '772910',
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: '2026-12-31T23:59:59.000Z',
  },
  {
    _id: 'pass-106',
    visitorName: 'Anil Mehta (Plumber)',
    phone: '+91 93344 55667',
    purpose: 'Bathroom Pipe Leak Repair',
    passType: 'SERVICE',
    provider: 'Plumber',
    status: 'EXPIRED',
    code: '330192',
    validFrom: new Date(Date.now() - 172800000).toISOString(),
    validUntil: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: 'pass-107',
    visitorName: 'Unknown Commercial Vehicle',
    phone: '+91 90000 11111',
    purpose: 'Unannounced Entry Attempt',
    passType: 'GUEST',
    status: 'REVOKED',
    code: '001923',
    validFrom: new Date(Date.now() - 259200000).toISOString(),
    validUntil: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const MOCK_WALK_IN_APPROVALS: WalkInApprovalItem[] = [
  {
    id: 'walkin-1',
    visitorName: 'Suresh Patel',
    phone: '+91 98989 12345',
    purpose: 'Visiting Villa #A-402 for AC Service',
    passType: 'SERVICE',
    gateName: 'North Entry Gate 3',
    waitingDurationMinutes: 4,
    requestTimestamp: new Date(Date.now() - 240000).toISOString(),
    vehicleNo: 'KA-03-HA-8819',
    notes: 'Technician carrying tool bag waiting with security guard.',
    status: 'PENDING',
  },
  {
    id: 'walkin-2',
    visitorName: 'Blinkit Delivery Agent',
    phone: '+91 97112 33445',
    purpose: 'Grocery Order Delivery #ORD-8829',
    passType: 'DELIVERY',
    gateName: 'Main Gate 1',
    waitingDurationMinutes: 2,
    requestTimestamp: new Date(Date.now() - 120000).toISOString(),
    vehicleNo: 'KA-01-EQ-1002',
    notes: 'Agent at gate barrier.',
    status: 'PENDING',
  },
  {
    id: 'walkin-3',
    visitorName: 'Kavita Verma',
    phone: '+91 96543 21098',
    purpose: 'Personal Guest Walk-in',
    passType: 'GUEST',
    gateName: 'Visitor Gate 2',
    waitingDurationMinutes: 8,
    requestTimestamp: new Date(Date.now() - 480000).toISOString(),
    status: 'PENDING',
  },
];
