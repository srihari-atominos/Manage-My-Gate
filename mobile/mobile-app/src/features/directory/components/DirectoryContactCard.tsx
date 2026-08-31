import React from 'react';
import { View, Linking } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { DirectoryMember } from '../types/directoryTypes';
import { Phone, MessageSquare, Send, Mail } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export interface DirectoryContactCardProps {
  member: DirectoryMember;
  currentUserId?: string;
  onCall?: (phone: string) => void;
  onIntercom?: (intercom: string) => void;
  onQuickMessage?: (member: DirectoryMember) => void;
  onOpenConversation?: (member: DirectoryMember) => void;
  className?: string;
}

export const DirectoryContactCard = ({
  member,
  currentUserId,
  onCall,
  onIntercom,
  onQuickMessage,
  onOpenConversation,
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
      case 'management':
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

  const hasUnit = Boolean(member.unitNumber && member.unitNumber.trim());
  const subtitleText = hasUnit
    ? member.designation
      ? `${member.unitNumber} • ${member.designation}`
      : member.unitNumber
    : member.designation || '';

  const canMessage = member.allowDirectoryMessages !== false;
  const canCall = Boolean(member.phone);
  const intercomUnit = member.intercomNumber || (hasUnit ? member.unitNumber!.replace(/[^0-9]/g, '') : '');
  const canIntercom = Boolean(intercomUnit);

  return (
    <ListCard
      title={member.name}
      subtitle={subtitleText}
      leftAvatar={member.avatarUrl || undefined}
      leftAvatarFallback={
        !member.avatarUrl ? (member.name ? member.name.charAt(0).toUpperCase() : 'M') : undefined
      }
      status={{
        label: member.role ? member.role.toUpperCase() : 'RESIDENT',
        variant: getRoleVariant(member.role),
      }}
      showChevron={false}
      onPress={() => (onOpenConversation && canMessage ? onOpenConversation(member) : undefined)}
      className={cn('mb-3.5 p-4 rounded-2xl border border-border/80 shadow-xs', className)}
    >
      {/* Contact Details Section */}
      {(member.phone || member.email) && (
        <View className="gap-1.5 pt-2.5 mt-2.5 border-t border-border/30">
          {member.phone ? (
            <View className="flex-row items-center gap-2">
              <Phone size={13} className="text-muted-foreground shrink-0" />
              <Text className="text-xs font-semibold text-foreground tracking-wide">{member.phone}</Text>
            </View>
          ) : null}

          {member.email ? (
            <View className="flex-row items-center gap-2">
              <Mail size={13} className="text-muted-foreground shrink-0" />
              <Text className="text-xs font-medium text-muted-foreground flex-1" numberOfLines={1}>
                {member.email}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Action Row */}
      {(canMessage || canCall || canIntercom) && (
        <View className="flex-row items-center gap-2 pt-3 mt-2.5 border-t border-border/40 w-full">
          {/* Quick Message CTA */}
          {canMessage ? (
            <Button
              variant="secondary"
              size="sm"
              onPress={() => onQuickMessage && onQuickMessage(member)}
              leftIcon={Send}
              className="flex-1 h-9.5 rounded-xl bg-primary/10 border border-primary/20"
              textClassName="text-xs font-bold text-primary"
            >
              Message
            </Button>
          ) : null}

          {/* Call CTA */}
          {canCall && (
            <Button
              variant="outline"
              size="sm"
              onPress={handlePhonePress}
              leftIcon={Phone}
              className="h-9.5 rounded-xl border-border bg-muted/30 px-3.5"
              textClassName="text-xs font-semibold text-foreground"
            >
              Call
            </Button>
          )}

          {/* Intercom CTA */}
          {canIntercom && (
            <Button
              variant="outline"
              size="sm"
              onPress={() => (onIntercom ? onIntercom(intercomUnit) : handleIntercomPress())}
              leftIcon={MessageSquare}
              className="h-9.5 rounded-xl border-border bg-muted/30 px-3"
              textClassName="text-xs font-semibold text-foreground"
            >
              #{intercomUnit}
            </Button>
          )}
        </View>
      )}
    </ListCard>
  );
};

export default DirectoryContactCard;
