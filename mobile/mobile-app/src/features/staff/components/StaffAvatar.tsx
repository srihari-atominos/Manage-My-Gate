import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { resolveStaffPhotoUrl } from '../services/staffService';

interface StaffAvatarProps {
  name?: string;
  photoUrl?: string | null;
  /** Diameter in px. */
  size?: number;
  /** Rounded square instead of a circle. */
  square?: boolean;
  className?: string;
}

const initialsOf = (name?: string) =>
  (name || 'S')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** Staff photo with an initials fallback (no photo, or the image failed to load). */
export const StaffAvatar: React.FC<StaffAvatarProps> = ({ name, photoUrl, size = 44, square = false, className }) => {
  const [failed, setFailed] = useState(false);
  const uri = resolveStaffPhotoUrl(photoUrl);
  const radius = square ? size * 0.28 : size / 2;

  return (
    <View
      className={`bg-primary/10 items-center justify-center overflow-hidden ${className || ''}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text className="font-bold text-primary" style={{ fontSize: Math.max(11, size * 0.34) }}>
          {initialsOf(name)}
        </Text>
      )}
    </View>
  );
};

export default StaffAvatar;
