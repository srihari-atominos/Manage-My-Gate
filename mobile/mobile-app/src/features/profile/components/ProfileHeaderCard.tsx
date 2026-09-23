import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
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
  isAvatarLoading?: boolean;
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
  isAvatarLoading = false,
}: ProfileHeaderCardProps) => {
  const { t, tRole } = useTranslation();
  const initialLetter = avatarFallback || (name ? name.charAt(0).toUpperCase() : 'U');
  const localizedRole = tRole(roleName, roleName);
  const localizedStatus = t(`status_${status.toLowerCase().replace(/[\s\/-]+/g, '_')}`, t(status.toLowerCase(), status));
  const resolvedAvatarUrl = avatarUrl ? getImageUrl(avatarUrl) : null;

  return (
    <View
      className={cn(
        'items-center bg-card border border-border/70 rounded-3xl p-5 shadow-2xs gap-3 w-full',
        className
      )}
    >
      {/* Avatar with Ring & Camera Badge */}
      <TouchableOpacity
        onPress={onAvatarPress}
        disabled={!onAvatarPress || isAvatarLoading}
        activeOpacity={0.85}
        className="relative items-center justify-center mt-1 mb-2"
        accessibilityRole={onAvatarPress ? 'button' : 'none'}
        accessibilityLabel="Change profile avatar"
      >
        <Avatar
          source={resolvedAvatarUrl ? { uri: resolvedAvatarUrl } : null}
          fallback={initialLetter}
          size="xl"
          style={{ width: 88, height: 88, borderRadius: 44 }}
          className="border-2 border-primary/30 bg-primary/10 shadow-2xs"
          fallbackClassName="text-2xl"
        />
        {isAvatarLoading && (
          <View className="absolute inset-0 rounded-full bg-black/50 items-center justify-center">
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}
        {showCameraBadge && !isAvatarLoading && (
          <View className="absolute bottom-0 right-0 size-7 rounded-full bg-primary border-2 border-card items-center justify-center shadow-2xs">
            <Camera size={13} color="#FFFFFF" strokeWidth={2.4} />
          </View>
        )}
      </TouchableOpacity>

      {/* User Info Header */}
      <View className="items-center">
        <Text className="text-[21px] font-bold font-sans text-foreground text-center tracking-tight">
          {name}
        </Text>
        {communityName ? (
          <Text className="text-[13px] font-bold font-sans text-primary mt-0.5 text-center">
            {communityName}
          </Text>
        ) : null}
      </View>

      {/* Email & Phone Details */}
      {(email || phone) && (
        <View className="flex-row flex-wrap items-center justify-center gap-3">
          {email ? (
            <View className="flex-row items-center gap-1.5">
              <Mail size={13} className="text-muted-foreground" />
              <Text className="text-[12.5px] font-medium font-sans text-muted-foreground">{email}</Text>
            </View>
          ) : null}
          {phone ? (
            <View className="flex-row items-center gap-1.5">
              <Phone size={13} className="text-muted-foreground" />
              <Text className="text-[12.5px] font-medium font-sans text-muted-foreground">{phone}</Text>
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
