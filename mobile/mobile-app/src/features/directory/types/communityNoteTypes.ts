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
