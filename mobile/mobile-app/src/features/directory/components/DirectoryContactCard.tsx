import React from 'react';
import { View, Linking, TouchableOpacity } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { DirectoryMember } from '../types/directoryTypes';
import { DirectoryPulseNote } from './DirectoryPulseNote';
import { Phone, MessageSquare, ThumbsUp, Send } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export interface DirectoryContactCardProps {
  member: DirectoryMember;
  onCall?: (phone: string) => void;
  onIntercom?: (intercom: string) => void;
  onQuickMessage?: (member: DirectoryMember) => void;
  onInterestedInNote?: (member: DirectoryMember) => void;
  onOpenConversation?: (member: DirectoryMember) => void;
  className?: string;
}

export const DirectoryContactCard = ({
  member,
  onCall,
  onIntercom,
  onQuickMessage,
  onInterestedInNote,
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

  const canMessage = member.allowDirectoryMessages !== false;
  const canCall = Boolean(member.phone) && member.showPhoneInDirectory !== false;
  const canIntercom = Boolean(member.intercomNumber) && member.allowIntercomCalls !== false;

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
      onPress={() => onOpenConversation && canMessage ? onOpenConversation(member) : undefined}
      className={cn('mb-3', className)}
    >
      {/* Active Community Note */}
      {member.activeCommunityNote ? (
        <DirectoryPulseNote note={member.activeCommunityNote} />
      ) : null}

      {/* Interest Tags */}
      {member.interests && member.interests.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5 py-1">
          {member.interests.map((interest, idx) => (
            <View key={idx} className="bg-muted/50 rounded-lg px-2 py-0.5 border border-border/30">
              <Text className="text-[10px] font-semibold text-muted-foreground">{interest}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Action Row */}
      {(canMessage || canCall || canIntercom) && (
        <View className="flex-row items-center gap-2 pt-2.5 border-t border-border/40 w-full mt-1">
          {/* Note Interaction CTA */}
          {member.activeCommunityNote && canMessage ? (
            <Button
              variant="default"
              size="sm"
              onPress={() => onInterestedInNote && onInterestedInNote(member)}
              leftIcon={ThumbsUp}
              className="flex-1 h-9 rounded-xl bg-primary"
              textClassName="text-xs font-semibold text-primary-foreground"
            >
              I'm Interested
            </Button>
          ) : null}

          {/* Quick Message CTA */}
          {canMessage ? (
            <Button
              variant="secondary"
              size="sm"
              onPress={() => onQuickMessage && onQuickMessage(member)}
              leftIcon={Send}
              className="flex-1 h-9 rounded-xl bg-primary/10 border border-primary/20"
              textClassName="text-xs font-semibold text-primary"
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
              className="h-9 rounded-xl border-border bg-muted/40 px-3"
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
              onPress={handleIntercomPress}
              leftIcon={MessageSquare}
              className="h-9 rounded-xl border-border bg-muted/40 px-3"
              textClassName="text-xs font-semibold text-foreground"
            >
              #{member.intercomNumber}
            </Button>
          )}
        </View>
      )}
    </ListCard>
  );
};

export default DirectoryContactCard;
