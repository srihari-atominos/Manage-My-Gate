import React from 'react';
import { View, Linking } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { Phone, MessageSquare } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export interface DirectoryMember {
  id: string;
  name: string;
  role: 'resident' | 'guard' | 'staff' | 'admin' | string;
  designation?: string;
  unitNumber?: string;
  phone?: string;
  intercomNumber?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

export interface DirectoryContactCardProps {
  member: DirectoryMember;
  onCall?: (phone: string) => void;
  onIntercom?: (intercom: string) => void;
  className?: string;
}

export const DirectoryContactCard = ({
  member,
  onCall,
  onIntercom,
  className,
}: DirectoryContactCardProps) => {
  const getRoleVariant = (role: string): StatusVariant => {
    switch (role?.toLowerCase()) {
      case 'guard':
      case 'security':
        return 'warning';
      case 'staff':
      case 'maintenance':
        return 'info';
      case 'admin':
        return 'critical';
      case 'resident':
      default:
        return 'success';
    }
  };

  const handlePhonePress = () => {
    if (onCall && member.phone) {
      onCall(member.phone);
    } else if (member.phone) {
      Linking.openURL(`tel:${member.phone}`);
    }
  };

  const handleIntercomPress = () => {
    if (onIntercom && member.intercomNumber) {
      onIntercom(member.intercomNumber);
    }
  };

  const subtitleText = member.unitNumber
    ? member.designation
      ? `${member.unitNumber} • ${member.designation}`
      : member.unitNumber
    : member.designation || '';

  return (
    <ListCard
      title={member.name}
      subtitle={subtitleText}
      leftAvatar={member.avatarUrl || undefined}
      leftAvatarFallback={!member.avatarUrl ? (member.name ? member.name.charAt(0).toUpperCase() : 'M') : undefined}
      status={{
        label: member.role.toUpperCase(),
        variant: getRoleVariant(member.role),
      }}
      showChevron={false}
      className={cn('mb-3', className)}
    >
      {(member.phone || member.intercomNumber) && (
        <View className="flex-row items-center gap-2 pt-2.5 border-t border-border/40 w-full">
          {member.phone ? (
            <Button
              variant="outline"
              size="sm"
              onPress={handlePhonePress}
              className="flex-1 h-9 rounded-xl border-border bg-muted/40 flex-row items-center justify-center gap-1.5"
            >
              <Phone size={14} className="text-foreground" />
              <Text className="text-xs font-semibold text-foreground">Call</Text>
            </Button>
          ) : null}

          {member.intercomNumber ? (
            <Button
              variant="secondary"
              size="sm"
              onPress={handleIntercomPress}
              className="flex-1 h-9 rounded-xl bg-primary/10 border border-primary/20 flex-row items-center justify-center gap-1.5"
            >
              <MessageSquare size={14} className="text-primary" />
              <Text className="text-xs font-semibold text-primary">Intercom #{member.intercomNumber}</Text>
            </Button>
          ) : null}
        </View>
      )}
    </ListCard>
  );
};

export default DirectoryContactCard;
