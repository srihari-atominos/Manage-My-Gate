import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { WalkInApprovalItem } from '../../mocks/visitorMocks';
import { ShieldAlert, Check, X } from 'lucide-react-native';

export interface WalkInApprovalCardProps {
  item: WalkInApprovalItem;
  onApprove: (item: WalkInApprovalItem) => void;
  onReject: (item: WalkInApprovalItem) => void;
  onPressDetails: (item: WalkInApprovalItem) => void;
}

export const WalkInApprovalCard: React.FC<WalkInApprovalCardProps> = ({
  item,
  onApprove,
  onReject,
  onPressDetails,
}) => {
  return (
    <ListCard
      title={item.visitorName}
      subtitle={`${item.phone} • ${item.purpose}${item.vehicleNo ? ` • ${item.vehicleNo}` : ''}`}
      description={`Gate: ${item.gateName}`}
      leftIcon={ShieldAlert}
      leftIconBgColor="bg-status-warning/15"
      leftIconColor="text-status-warning"
      status={{ label: item.passType, variant: 'info' }}
      secondaryBadge={{ label: `Waiting ${item.waitingDurationMinutes}m`, variant: 'warning' }}
      showChevron={false}
      onPress={() => onPressDetails(item)}
      className="mb-3"
    >
      {/* Quick Action Decision Buttons using Semantic Variants */}
      <View className="flex-row items-center gap-2.5 pt-2 border-t border-border mt-2">
        <Button
          variant="destructive"
          onPress={() => onReject(item)}
          className="flex-1 h-10 rounded-xl flex-row items-center justify-center gap-1.5"
          accessibilityRole="button"
          accessibilityLabel={`Deny entry for ${item.visitorName}`}
        >
          <Icon as={X} size={16} className="text-destructive-foreground me-1.5" />
          <Text className="text-xs font-bold text-destructive-foreground">Deny Entry</Text>
        </Button>

        <Button
          variant="default"
          onPress={() => onApprove(item)}
          className="flex-1 h-10 rounded-xl flex-row items-center justify-center gap-1.5"
          accessibilityRole="button"
          accessibilityLabel={`Approve entry for ${item.visitorName}`}
        >
          <Icon as={Check} size={16} className="text-primary-foreground me-1.5" />
          <Text className="text-xs font-bold text-primary-foreground">Approve Entry</Text>
        </Button>
      </View>
    </ListCard>
  );
};

export default WalkInApprovalCard;
