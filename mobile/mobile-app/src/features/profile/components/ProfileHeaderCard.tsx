import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/common/Avatar';
import { useTranslation } from '@/src/utils/i18n';
import { Mail, Phone, Sparkles } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export interface ProfileHeaderCardProps {
  name: string;
  email?: string;
  phone?: string;
  unitName?: string;
  roleName?: string;
  communityName?: string;
  avatarUrl?: string | null;
  avatarFallback?: string;
  status?: string;
  className?: string;
}

export const ProfileHeaderCard = ({
  name,
  email,
  phone,
  unitName,
  roleName = 'Resident',
  communityName,
  avatarUrl,
  avatarFallback,
  status = 'Active',
  className,
}: ProfileHeaderCardProps) => {
  const { t, tRole } = useTranslation();
  const initialLetter = avatarFallback || (name ? name.charAt(0).toUpperCase() : 'U');
  const localizedRole = tRole(roleName, roleName);
  const localizedStatus = t(`status_${status.toLowerCase().replace(/[\s\/-]+/g, '_')}`, t(status.toLowerCase(), status));

  return (
    <View
      className={cn(
        'items-center bg-card border border-border rounded-2xl p-5 shadow-xs gap-3 w-full',
        className
      )}
    >
      {/* Avatar with Ring */}
      <View className="relative items-center justify-center">
        <Avatar
          source={avatarUrl ? { uri: avatarUrl } : null}
          fallback={initialLetter}
          size="xl"
          className="border-2 border-primary/40 bg-primary/10"
        />
        <View className="absolute -bottom-1 -right-1 bg-status-success rounded-full p-1 border-2 border-card">
          <Sparkles size={10} className="text-white" />
        </View>
      </View>

      {/* User Info Header */}
      <View className="items-center">
        <Text className="text-xl font-black text-foreground text-center">
          {name}
        </Text>
        {communityName ? (
          <Text className="text-xs font-semibold text-primary mt-0.5 text-center">
            {communityName}
          </Text>
        ) : null}
      </View>

      {/* Email & Phone Details */}
      {(email || phone) && (
        <View className="flex-row flex-wrap items-center justify-center gap-3">
          {email ? (
            <View className="flex-row items-center gap-1">
              <Mail size={13} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground">{email}</Text>
            </View>
          ) : null}
          {phone ? (
            <View className="flex-row items-center gap-1">
              <Phone size={13} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground">{phone}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Status Badges Row */}
      <View className="flex-row items-center justify-center flex-wrap gap-2 pt-1">
        {unitName ? (
          <StatusBadge
            label={unitName}
            variant="info"
            size="sm"
          />
        ) : null}

        <StatusBadge
          label={localizedRole}
          variant="success"
          size="sm"
        />

        <StatusBadge
          label={localizedStatus}
          variant="neutral"
          dot
          size="sm"
        />
      </View>
    </View>
  );
};

export default ProfileHeaderCard;
