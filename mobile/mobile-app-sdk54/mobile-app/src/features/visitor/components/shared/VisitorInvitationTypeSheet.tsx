import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { User, Users, Car, Package, Wrench, ChevronRight } from 'lucide-react-native';
import { PassTypeKey } from '../../mocks/visitorMocks';

export interface InvitationOption {
  type: PassTypeKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  badge?: string;
}

export const INVITATION_OPTIONS: InvitationOption[] = [
  {
    type: 'GUEST',
    title: 'Guest Pass',
    description: 'Pre-approve individual friends, family, or personal visitors',
    icon: User,
  },
  {
    type: 'GROUP',
    title: 'Group Visit',
    description: 'Host events, parties, or bulk visitors with a single pass',
    icon: Users,
    badge: 'Multi-Guest',
  },
  {
    type: 'CAB',
    title: 'Cab / Auto',
    description: 'Pre-approve Uber, Ola, or taxi vehicles for auto gate barrier opening',
    icon: Car,
  },
  {
    type: 'DELIVERY',
    title: 'Delivery',
    description: 'Quick entry pass for Swiggy, Zomato, Amazon, courier agents',
    icon: Package,
  },
  {
    type: 'SERVICE',
    title: 'Service / Staff',
    description: 'Long-term entry pass for maid, driver, electrician, daily staff',
    icon: Wrench,
    badge: 'Recurring',
  },
];

interface VisitorInvitationTypeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: PassTypeKey) => void;
}

export const VisitorInvitationTypeSheet: React.FC<VisitorInvitationTypeSheetProps> = ({
  visible,
  onClose,
  onSelectType,
}) => {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Select Invitation Type">
      <ScrollView className="max-h-[520px] px-1 py-2">
        <View className="gap-3 pb-6">
          <Text variant="muted" className="text-xs px-1">
            Choose the type of visitor pass to generate the appropriate multi-step entry approval.
          </Text>

          {INVITATION_OPTIONS.map((option) => {
            const IconComp = option.icon;
            return (
              <TouchableOpacity
                key={option.type}
                onPress={() => {
                  onSelectType(option.type);
                  onClose();
                }}
                activeOpacity={0.7}
                className="flex-row items-center bg-card border border-border rounded-2xl p-3.5 gap-3.5 active:bg-muted/40"
              >
                <View className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center">
                  <IconComp size={22} className="text-primary" />
                </View>

                <View className="flex-1 gap-0.5">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-bold text-foreground">
                      {option.title}
                    </Text>
                    {option.badge ? (
                      <View className="bg-secondary px-2 py-0.5 rounded-full border border-border">
                        <Text className="text-[10px] font-semibold text-secondary-foreground">
                          {option.badge}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="muted" className="text-xs leading-4">
                    {option.description}
                  </Text>
                </View>

                <ChevronRight size={18} className="text-muted-foreground" />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};
