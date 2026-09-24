import React from 'react';
import { View, ScrollView } from 'react-native';
import { Chip } from '@/components/common/Chip';
import { Megaphone, BarChart3, Layers } from 'lucide-react-native';

export type EngagementPerspectiveMode = 'ALL' | 'NOTICES' | 'POLLS';

interface EngagementGroupingToggleProps {
  mode: EngagementPerspectiveMode;
  onModeChange: (newMode: EngagementPerspectiveMode) => void;
  noticeCount?: number;
  pollCount?: number;
}

const MODES: { id: EngagementPerspectiveMode; label: string; icon: any }[] = [
  { id: 'ALL', label: 'All Engagements', icon: Layers },
  { id: 'NOTICES', label: 'Notices Only', icon: Megaphone },
  { id: 'POLLS', label: 'Polls Only', icon: BarChart3 },
];

export const EngagementGroupingToggle: React.FC<EngagementGroupingToggleProps> = ({
  mode,
  onModeChange,
  noticeCount,
  pollCount,
}) => {
  return (
    <View className="px-4 py-2.5 border-b border-border/60 bg-card/40">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {MODES.map((item) => {
          let badgeLabel = item.label;
          if (item.id === 'NOTICES' && typeof noticeCount === 'number') {
            badgeLabel = `Notices (${noticeCount})`;
          } else if (item.id === 'POLLS' && typeof pollCount === 'number') {
            badgeLabel = `Polls (${pollCount})`;
          }

          return (
            <Chip
              key={item.id}
              label={badgeLabel}
              icon={item.icon}
              selected={mode === item.id}
              onPress={() => onModeChange(item.id)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

export default EngagementGroupingToggle;
