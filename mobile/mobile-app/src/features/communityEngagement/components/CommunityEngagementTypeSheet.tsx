import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Bell, BarChart3, Check } from 'lucide-react-native';
import { EngagementContentType } from '../types/communityEngagement.types';
import { cn } from '@/lib/utils';

export interface ContentTypeCatalogOption {
  type: EngagementContentType;
  label: string;
  badge: string;
  hint: string;
  examples: string;
  icon: any;
}

export const CONTENT_TYPE_OPTIONS: ContentTypeCatalogOption[] = [
  {
    type: 'NOTICE',
    label: 'Official Notice',
    badge: 'Broadcast & Alerts',
    hint: 'Broadcast community news, maintenance notices, bylaw rules, or critical emergency alerts.',
    examples: 'Water Shutdown, AGM Meeting, Lift Maintenance, Fire Drill',
    icon: Bell,
  },
  {
    type: 'POLL',
    label: 'Community Poll',
    badge: 'Voting & Feedback',
    hint: 'Conduct democratic resident votes, unit-level ballots, or feedback surveys with automated tallies.',
    examples: 'Gym Equipment Choice, Festival Dates, Pet Policy Amendment',
    icon: BarChart3,
  },
];

export interface CommunityEngagementTypeSheetProps {
  visible: boolean;
  selectedType?: EngagementContentType;
  onClose: () => void;
  onSelectType: (type: EngagementContentType) => void;
}

export const CommunityEngagementTypeSheet: React.FC<CommunityEngagementTypeSheetProps> = ({
  visible,
  selectedType = 'NOTICE',
  onClose,
  onSelectType,
}) => {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Create Community Content">
      <ScrollView className="max-h-[520px] px-1 py-1" showsVerticalScrollIndicator={false}>
        <View className="gap-3 pb-6">
          <Text variant="muted" className="text-xs px-1">
            Choose what type of community engagement you want to create for residents and staff.
          </Text>

          {CONTENT_TYPE_OPTIONS.map((option) => {
            const IconComp = option.icon;
            const isSelected = selectedType === option.type;

            return (
              <TouchableOpacity
                key={option.type}
                onPress={() => {
                  onSelectType(option.type);
                  onClose();
                }}
                activeOpacity={0.7}
                className={cn(
                  'flex-row items-center bg-card border rounded-2xl p-4 gap-3.5 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border active:bg-muted/40'
                )}
                accessibilityRole="button"
                accessibilityLabel={`Select content type ${option.label}`}
              >
                <View
                  className={cn(
                    'w-12 h-12 rounded-xl items-center justify-center',
                    isSelected ? 'bg-primary' : 'bg-primary/10'
                  )}
                >
                  <IconComp
                    size={24}
                    className={isSelected ? 'text-primary-foreground' : 'text-primary'}
                  />
                </View>

                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-bold text-foreground">
                      {option.label}
                    </Text>
                    <View className="bg-secondary px-2 py-0.5 rounded-full border border-border">
                      <Text className="text-[10px] font-semibold text-secondary-foreground">
                        {option.badge}
                      </Text>
                    </View>
                  </View>

                  <Text variant="muted" className="text-xs leading-4">
                    {option.hint}
                  </Text>

                  <Text className="text-[11px] text-primary/80 font-medium">
                    e.g. {option.examples}
                  </Text>
                </View>

                {isSelected ? (
                  <View className="w-6 h-6 rounded-full bg-primary items-center justify-center ms-1">
                    <Check size={14} className="text-primary-foreground" />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default CommunityEngagementTypeSheet;
