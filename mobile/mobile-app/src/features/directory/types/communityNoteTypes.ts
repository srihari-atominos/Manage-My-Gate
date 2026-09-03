export type NoteCategory =
  | 'ACTIVITY'
  | 'LOOKING_FOR'
  | 'AVAILABLE'
  | 'SOCIAL'
  | 'HELP'
  | 'INTRODUCTION'
  | 'GENERAL';

export interface CommunityNote {
  _id: string;
  id?: string;
  userId: string;
  orgId: string;
  text: string;
  category: NoteCategory;
  emoji: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  userName?: string;
  userUnit?: string;
  avatarUrl?: string | null;
  phone?: string;
  role?: string;
  intercomNumber?: string;
  interests?: string[];
  memberData?: {
    id: string;
    userId: string;
    name: string;
    unitNumber: string;
    role: string;
    phone?: string;
    intercomNumber?: string;
    interests?: string[];
  };
}

export interface CreateNotePayload {
  text: string;
  category?: NoteCategory;
  emoji?: string;
}

export interface PresetNoteOption {
  id: string;
  category: NoteCategory;
  emoji: string;
  label: string;
  defaultText: string;
}

export const PRESET_NOTE_OPTIONS: PresetNoteOption[] = [
  {
    id: 'preset-badminton',
    category: 'ACTIVITY',
    emoji: '🏸',
    label: 'Badminton',
    defaultText: 'Anyone up for badminton tonight?',
  },
  {
    id: 'preset-coffee',
    category: 'SOCIAL',
    emoji: '☕',
    label: 'Coffee',
    defaultText: 'Coffee at the clubhouse?',
  },
  {
    id: 'preset-walk',
    category: 'ACTIVITY',
    emoji: '🚶',
    label: 'Evening Walk',
    defaultText: 'Going for an evening walk.',
  },
  {
    id: 'preset-hello',
    category: 'INTRODUCTION',
    emoji: '👋',
    label: 'Say Hello',
    defaultText: 'New to the community!',
  },
  {
    id: 'preset-help',
    category: 'LOOKING_FOR',
    emoji: '🔧',
    label: 'Looking for Help',
    defaultText: 'Looking for a reliable plumber.',
  },
  {
    id: 'preset-movie',
    category: 'SOCIAL',
    emoji: '🎬',
    label: 'Movie Night',
    defaultText: 'Movie night anyone?',
  },
  {
    id: 'preset-relaxing',
    category: 'AVAILABLE',
    emoji: '🏠',
    label: 'Relaxing',
    defaultText: 'Just relaxing today.',
  },
];

export const getLocalizedPresetNotes = (t: (key: string, fallback?: string) => string): PresetNoteOption[] => [
  {
    id: 'preset-badminton',
    category: 'ACTIVITY',
    emoji: '🏸',
    label: t('preset_badminton_label', 'Badminton'),
    defaultText: t('preset_badminton_text', 'Anyone up for badminton tonight?'),
  },
  {
    id: 'preset-coffee',
    category: 'SOCIAL',
    emoji: '☕',
    label: t('preset_coffee_label', 'Coffee'),
    defaultText: t('preset_coffee_text', 'Coffee at the clubhouse?'),
  },
  {
    id: 'preset-walk',
    category: 'ACTIVITY',
    emoji: '🚶',
    label: t('preset_walk_label', 'Evening Walk'),
    defaultText: t('preset_walk_text', 'Going for an evening walk.'),
  },
  {
    id: 'preset-hello',
    category: 'INTRODUCTION',
    emoji: '👋',
    label: t('preset_hello_label', 'Say Hello'),
    defaultText: t('preset_hello_text', 'New to the community!'),
  },
  {
    id: 'preset-help',
    category: 'LOOKING_FOR',
    emoji: '🔧',
    label: t('preset_help_label', 'Looking for Help'),
    defaultText: t('preset_help_text', 'Looking for a reliable plumber.'),
  },
  {
    id: 'preset-movie',
    category: 'SOCIAL',
    emoji: '🎬',
    label: t('preset_movie_label', 'Movie Night'),
    defaultText: t('preset_movie_text', 'Movie night anyone?'),
  },
  {
    id: 'preset-relaxing',
    category: 'AVAILABLE',
    emoji: '🏠',
    label: t('preset_relaxing_label', 'Relaxing'),
    defaultText: t('preset_relaxing_text', 'Just relaxing today.'),
  },
];
