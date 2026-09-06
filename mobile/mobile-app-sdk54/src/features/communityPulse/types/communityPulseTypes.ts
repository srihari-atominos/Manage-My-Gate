export type PulseCategory = 'general' | 'up_for' | 'looking_for';

export interface PulseItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userVilla?: string;
  text: string;
  contextText?: string;
  emoji?: string;
  category: PulseCategory;
  createdAt: string; // ISO date string
  expiresAt: string; // ISO date string
  responsesCount?: number;
}

export type CommunityMoodOption = 'great' | 'relaxed' | 'energetic' | 'quiet' | 'excited';

export interface MoodResult {
  option: CommunityMoodOption;
  label: string;
  emoji: string;
  percentage: number;
  count: number;
}

export interface DailyQuestionOption {
  id: string;
  label: string;
  percentage: number;
  count: number;
}

export interface DailyQuestion {
  id: string;
  question: string;
  totalVotes: number;
  userAnswerId?: string;
  options: DailyQuestionOption[];
}

export interface CommunityInterest {
  id: string;
  name: string;
  emoji: string;
  category?: string;
}

export interface CommunityPulseState {
  activePulses: PulseItem[];
  userActivePulse: PulseItem | null;
  communityMood: {
    userVote: CommunityMoodOption | null;
    totalResponses: number;
    results: MoodResult[];
  };
  dailyQuestion: DailyQuestion | null;
  userInterests: string[]; // List of interest IDs
  loading: boolean;
  error: string | null;
}
