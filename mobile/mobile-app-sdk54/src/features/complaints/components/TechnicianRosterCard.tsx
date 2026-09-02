import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { TechnicianStaff } from '../hooks/useComplaintDispatch';
import { Star, Phone, UserCheck } from 'lucide-react-native';

export interface TechnicianRosterCardProps {
  tech: TechnicianStaff;
  onCall?: (phone: string) => void;
  onAssign?: (tech: TechnicianStaff) => void;
  className?: string;
}

export const TechnicianRosterCard: React.FC<TechnicianRosterCardProps> = ({
  tech,
  onCall,
  onAssign,
  className = '',
}) => {
  const isBusy = tech.status === 'Busy';
  const isOffDuty = tech.status === 'Off Duty';

  return (
    <ListCard
      title={tech.name}
      subtitle={`${tech.specialty} • ${tech.type}`}
      leftIcon="User"
      leftIconBgColor="bg-primary/10"
      status={{
        label: isOffDuty ? 'OFF DUTY' : isBusy ? `${tech.activeJobsCount} ACTIVE` : 'AVAILABLE',
        variant: isOffDuty ? 'neutral' : isBusy ? 'warning' : 'success',
      }}
      className={className}
    >
      {/* Bottom Row: Rating, Call CTA, Assign CTA */}
      <View className="flex-row items-center justify-between pt-1 border-t border-border/40 mt-1">
        <View className="flex-row items-center gap-1">
          <Star size={13} className="text-amber-500 fill-amber-500" />
          <Text className="text-xs font-bold text-foreground">{tech.rating} ★ Rating</Text>
        </View>

        <View className="flex-row items-center gap-2">
          {onCall && tech.phone && (
            <Button
              variant="outline"
              size="sm"
              onPress={() => onCall(tech.phone)}
              className="flex-row items-center gap-1.5 h-8 px-3 rounded-xl border-primary/30 bg-primary/5"
              accessibilityLabel={`Call ${tech.name}`}
            >
              <Phone size={12} className="text-primary" />
              <Text className="text-xs font-bold text-primary">Call</Text>
            </Button>
          )}

          {onAssign && !isOffDuty && (
            <Button
              variant="default"
              size="sm"
              onPress={() => onAssign(tech)}
              className="flex-row items-center gap-1.5 h-8 px-3 rounded-xl"
              accessibilityLabel={`Assign ${tech.name}`}
            >
              <UserCheck size={12} className="text-primary-foreground" />
              <Text className="text-xs font-bold text-primary-foreground">Assign</Text>
            </Button>
          )}
        </View>
      </View>
    </ListCard>
  );
};

export default TechnicianRosterCard;
