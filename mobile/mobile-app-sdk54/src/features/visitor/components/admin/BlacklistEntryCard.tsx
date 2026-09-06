import React from 'react';
import { ListCard } from '@/components/ui/ListCard';
import { IconButton } from '@/components/common/IconButton';
import { Trash2 } from 'lucide-react-native';

export interface BlacklistEntry {
  _id: string;
  visitorName: string;
  reason: string;
  phone?: string;
  idProofNumber?: string;
  createdAt?: string;
}

export interface BlacklistEntryCardProps {
  entry: BlacklistEntry;
  onRemovePress: (id: string) => void;
}

/**
 * BlacklistEntryCard Component
 * Canonical ListCard implementation for Security Blacklist items.
 * Purely wraps ListCard with theme tokens, ShieldAlert indicator, and destructive action trigger.
 */
export function BlacklistEntryCard({
  entry,
  onRemovePress,
}: BlacklistEntryCardProps) {
  const subtitleParts: string[] = [];
  if (entry.reason) subtitleParts.push(`Reason: ${entry.reason}`);
  if (entry.phone) subtitleParts.push(`Ph: ${entry.phone}`);
  if (entry.idProofNumber) subtitleParts.push(`ID: ${entry.idProofNumber}`);

  return (
    <ListCard
      title={entry.visitorName}
      subtitle={subtitleParts.join(' • ')}
      timestamp={entry.createdAt}
      leftIcon="ShieldAlert"
      leftIconBgColor="bg-destructive/15"
      status={{ label: 'RESTRICTED', variant: 'danger' }}
      rightContent={
        <IconButton
          icon={Trash2}
          variant="destructive"
          size="sm"
          onPress={(e: any) => {
            e?.stopPropagation?.();
            onRemovePress(entry._id);
          }}
          accessibilityLabel={`Remove ${entry.visitorName} from blacklist`}
        />
      }
    />
  );
}

export default BlacklistEntryCard;
