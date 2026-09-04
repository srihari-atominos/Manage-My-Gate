import React from 'react';
import { View, ScrollView } from 'react-native';
import { Chip } from '@/components/common/Chip';
import { FileText, Building2, Users, Layers } from 'lucide-react-native';

export type LedgerGroupingMode = 'flat' | 'unit' | 'resident' | 'cycle';

interface LedgerGroupingToggleProps {
  mode: LedgerGroupingMode;
  onModeChange: (newMode: LedgerGroupingMode) => void;
}

const MODES: { id: LedgerGroupingMode; label: string; icon: any }[] = [
  { id: 'flat', label: 'Flat Invoices', icon: FileText },
  { id: 'unit', label: 'By Unit / Villa', icon: Building2 },
  { id: 'resident', label: 'By Resident', icon: Users },
  { id: 'cycle', label: 'By Billing Cycle', icon: Layers },
];

export const LedgerGroupingToggle: React.FC<LedgerGroupingToggleProps> = ({
  mode,
  onModeChange,
}) => {
  return (
    <View className="px-4 py-2.5 border-b border-border/60 bg-card/40">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {MODES.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            icon={item.icon}
            selected={mode === item.id}
            onPress={() => onModeChange(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default LedgerGroupingToggle;
