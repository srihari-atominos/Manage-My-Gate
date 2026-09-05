import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/common/Avatar';
import { useTranslation } from '@/src/utils/i18n';
import { Mail, Phone, Camera } from 'lucide-react-native';
import { getImageUrl } from '@/src/utils/imageUrl';
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
  onAvatarPress?: () => void;
  showCameraBadge?: boolean;
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
  onAvatarPress,
  showCameraBadge = false,
}: ProfileHeaderCardProps) => {
  const { t, tRole } = useTranslation();
  const initialLetter = avatarFallback || (name ? name.charAt(0).toUpperCase() : 'U');
  const localizedRole = tRole(roleName, roleName);
  const localizedStatus = t(`status_${status.toLowerCase().replace(/[\s\/-]+/g, '_')}`, t(status.toLowerCase(), status));
  const resolvedAvatarUrl = avatarUrl ? getImageUrl(avatarUrl) : null;

  return (
    <View
      className={cn(
        'items-center bg-card border border-border rounded-2xl p-5 shadow-xs gap-3 w-full',
        className
      )}
    >
      {/* Avatar with Ring & Camera Badge */}
      <TouchableOpacity
        onPress={onAvatarPress}
        disabled={!onAvatarPress}
        activeOpacity={0.85}
        className="relative items-center justify-center"
        accessibilityRole={onAvatarPress ? 'button' : 'none'}
        accessibilityLabel="Change profile avatar"
      >
        <Avatar
          source={resolvedAvatarUrl ? { uri: resolvedAvatarUrl } : null}
          fallback={initialLetter}
          size="xl"
          className="border-2 border-primary/40 bg-primary/10 h-20 w-20"
        />
        {showCameraBadge && (
          <View className="absolute -bottom-1 -right-1 size-7 rounded-full bg-primary border-2 border-card items-center justify-center shadow-xs">
            <Camera size={13} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      {onAvatarPress && (
        <TouchableOpacity
          onPress={onAvatarPress}
          activeOpacity={0.8}
          className="flex-row items-center gap-1.5 py-1 px-3 rounded-full bg-primary/10 border border-primary/20 -mt-1"
        >
          <Camera size={12} className="text-primary" />
          <Text className="text-xs font-bold text-primary">
            {t('change_photo', 'Change Photo')}
          </Text>
        </TouchableOpacity>
      )}

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
      </View>
    </View>
  );
};

export default ProfileHeaderCard;
