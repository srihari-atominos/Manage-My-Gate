import { Users, Timer, Sparkles, DoorOpen, Wrench } from 'lucide-react-native';
import { AmenityArchetype, AmenityPricingType } from '../types/amenityDomain.types';

export interface ArchetypeCatalogOption {
  archetype: AmenityArchetype;
  label: string;
  badge?: string;
  icon: any;
  hint: string;
  examples: string;
  defaultPricingType: AmenityPricingType;
}

export const ARCHETYPE_CATALOG_OPTIONS: ArchetypeCatalogOption[] = [
  {
    archetype: 'SHARED_CAPACITY',
    label: 'Shared Capacity',
    badge: 'Headcount',
    icon: Users,
    hint: 'Concurrent headcount capacity & quota per resident.',
    examples: 'Swimming Pool, Gym, Club Lounge, Rooftop Deck',
    defaultPricingType: 'FREE',
  },
  {
    archetype: 'EXCLUSIVE_HOURLY',
    label: 'Exclusive Hourly',
    badge: 'Slots & Buffer',
    icon: Timer,
    hint: 'Court exclusivity with discrete time slots & turnaround buffers.',
    examples: 'Tennis Court, Badminton, Squash Court, Snooker Table',
    defaultPricingType: 'HOURLY',
  },
  {
    archetype: 'EVENT_SPACE',
    label: 'Event Space',
    badge: 'Admin Approval',
    icon: Sparkles,
    hint: 'Daily or session reservations, security deposits & approval workflow.',
    examples: 'Banquet Hall, Party Lawn, Amphitheater, Clubhouse Hall',
    defaultPricingType: 'DAILY',
  },
  {
    archetype: 'ROOM_RESOURCE',
    label: 'Room Resource',
    badge: 'Multi-Room',
    icon: DoorOpen,
    hint: 'Discrete sub-rooms with dedicated equipment and AV specifications.',
    examples: 'Meeting Room, Co-working Pods, Music Studio, Boardroom',
    defaultPricingType: 'HOURLY',
  },
  {
    archetype: 'INVENTORY_TOOLS',
    label: 'Inventory & Tools',
    badge: 'Stock Checkout',
    icon: Wrench,
    hint: 'Physical asset checkout, loan duration & return inspection verification.',
    examples: 'Community Toolkits, Lawn Mowers, Projectors, Ladders',
    defaultPricingType: 'FREE',
  },
];

export const SECONDARY_CATEGORIES = [
  { label: 'Sports & Courts', value: 'Sports' },
  { label: 'Fitness & Health', value: 'Fitness' },
  { label: 'Event & Banquets', value: 'Event Space' },
  { label: 'Clubhouse & Lounge', value: 'Clubhouse' },
  { label: 'Pool & Aquatic', value: 'Pool & Spa' },
  { label: 'Co-Working & Office', value: 'Workspace' },
  { label: 'Wellness & Leisure', value: 'Wellness' },
  { label: 'General Facilities', value: 'General' },
];

export const DEFAULT_ARCHETYPE_CATEGORIES: Record<AmenityArchetype, string> = {
  SHARED_CAPACITY: 'Pool & Spa',
  EXCLUSIVE_HOURLY: 'Sports',
  EVENT_SPACE: 'Event Space',
  ROOM_RESOURCE: 'Workspace',
  INVENTORY_TOOLS: 'General',
};

export const PRICING_CHIP_OPTIONS: { value: AmenityPricingType; label: string }[] = [
  { value: 'FREE', label: 'Free Access' },
  { value: 'HOURLY', label: 'Hourly Rate' },
  { value: 'DAILY', label: 'Daily Rate' },
  { value: 'FIXED_EVENT', label: 'Fixed Event Fee' },
];

export const STATUS_OPTIONS = [
  { label: 'Active (Open for Booking)', value: 'active' },
  { label: 'Draft (Work in Progress / Unpublished)', value: 'draft' },
  { label: 'Inactive (Temporarily Closed)', value: 'inactive' },
];

export const DAYS_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SCHEDULE_PRESETS = [
  { id: 'allDay', label: '24/7 All Day', opensAt: '00:00', closesAt: '23:59' },
  { id: 'daytime', label: '06:00 - 22:00 (Daytime)', opensAt: '06:00', closesAt: '22:00' },
  { id: 'business', label: '09:00 - 18:00 (Business)', opensAt: '09:00', closesAt: '18:00' },
];

export const DURATION_PRESETS = [30, 45, 60, 90, 120];
export const BUFFER_PRESETS = [0, 10, 15, 30];
export const QUOTA_PRESETS = [1, 2, 4, 6];
export const ADVANCE_DAYS_PRESETS = [3, 7, 14, 30];

export const EVENT_NOTICE_PRESETS = [
  { id: '24', label: '24 Hours' },
  { id: '48', label: '48 Hours' },
  { id: '72', label: '72 Hours (3 Days)' },
  { id: '168', label: '1 Week Notice' },
];

export const ROOM_AMENITY_CHIPS = [
  { id: 'projector', label: 'Smart Projector / Display' },
  { id: 'wifi', label: 'High-Speed Wi-Fi' },
  { id: 'whiteboard', label: 'Glass Whiteboard' },
  { id: 'videoconf', label: 'Video Conferencing Hardware' },
  { id: 'ac', label: 'Central Air Conditioning' },
  { id: 'sound', label: 'Surround Sound System' },
];

export const LOAN_DURATION_PRESETS = [
  { id: '2', label: '2 Hours' },
  { id: '4', label: '4 Hours' },
  { id: '24', label: '24 Hours (1 Day)' },
  { id: '72', label: '3 Days' },
  { id: '168', label: '1 Week' },
];

export interface CreationStepMeta {
  key: string;
  title: string;
  subtitle?: string;
}

export const CREATION_STEP_DEFINITIONS: Record<AmenityArchetype, CreationStepMeta[]> = {
  SHARED_CAPACITY: [
    { key: 'info', title: 'Basic Information', subtitle: 'Facility identity and location' },
    { key: 'schedule', title: 'Operating Schedule', subtitle: 'Open hours and active days' },
    { key: 'capacity-rules', title: 'Headcount & Quotas', subtitle: 'Capacity pool & resident guest limits' },
    { key: 'pricing', title: 'Pricing & Policies', subtitle: 'Fee structures and cancellation rules' },
    { key: 'review', title: 'Review & Publish', subtitle: 'Verify specifications before launch' },
  ],
  EXCLUSIVE_HOURLY: [
    { key: 'info', title: 'Basic Information', subtitle: 'Facility identity and location' },
    { key: 'schedule', title: 'Operating Schedule', subtitle: 'Open hours and active days' },
    { key: 'court-slots', title: 'Slot & Buffer Setup', subtitle: 'Slot durations, buffers, and windows' },
    { key: 'pricing', title: 'Pricing & Policies', subtitle: 'Hourly fees and cancellation rules' },
    { key: 'review', title: 'Review & Publish', subtitle: 'Verify specifications before launch' },
  ],
  EVENT_SPACE: [
    { key: 'info', title: 'Basic Information', subtitle: 'Facility identity and location' },
    { key: 'schedule', title: 'Operating Schedule', subtitle: 'Open hours and active days' },
    { key: 'event-rules', title: 'Event Space & Approvals', subtitle: 'Admin approval and security deposits' },
    { key: 'pricing', title: 'Pricing & Deposit Policy', subtitle: 'Daily session fees and deposit rules' },
    { key: 'review', title: 'Review & Publish', subtitle: 'Verify specifications before launch' },
  ],
  ROOM_RESOURCE: [
    { key: 'info', title: 'Basic Information', subtitle: 'Facility identity and location' },
    { key: 'schedule', title: 'Operating Schedule', subtitle: 'Open hours and active days' },
    { key: 'room-setup', title: 'Sub-Rooms & Amenities', subtitle: 'Individual room units and AV equipment' },
    { key: 'pricing', title: 'Pricing & Policies', subtitle: 'Hourly room fees and policies' },
    { key: 'review', title: 'Review & Publish', subtitle: 'Verify specifications before launch' },
  ],
  INVENTORY_TOOLS: [
    { key: 'info', title: 'Basic Information', subtitle: 'Facility identity and location' },
    { key: 'schedule', title: 'Operating Schedule', subtitle: 'Open hours and active days' },
    { key: 'inventory-stock', title: 'Stock & Loan Windows', subtitle: 'Asset quantity and loan limits' },
    { key: 'pricing', title: 'Deposit & Return Policy', subtitle: 'Replacement deposits and inspection' },
    { key: 'review', title: 'Review & Publish', subtitle: 'Verify specifications before launch' },
  ],
};
