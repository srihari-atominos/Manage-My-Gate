import React, { useMemo, useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../ui/text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MapPin } from 'lucide-react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { getUserRoleName } from '../../src/utils/rbac';
import { useTranslation } from '../../src/utils/i18n';
import { VillaSwitchModal } from '../navigation/VillaSwitchModal';

export interface RoleBasedGreetingProps {
  unitName?: string | null;
  communityName?: string;
  customRoleName?: string;
}

/**
 * Animated hand emoji that waves repeatedly when user arrives on the dashboard
 */
const WavingHand: React.FC = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(18, { duration: 170, easing: Easing.inOut(Easing.ease) }),
        withTiming(-14, { duration: 170, easing: Easing.inOut(Easing.ease) }),
        withTiming(18, { duration: 170, easing: Easing.inOut(Easing.ease) }),
        withTiming(-10, { duration: 170, easing: Easing.inOut(Easing.ease) }),
        withTiming(14, { duration: 170, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 220, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200 }) // pause before next waving cycle
      ),
      -1,
      false
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle} className="items-center justify-center">
      <Text className="text-[18px] leading-none">👋</Text>
    </Animated.View>
  );
};

/**
 * Returns appropriate time-of-day greeting
 * 05:00 - 11:59 => Good morning
 * 12:00 - 16:59 => Good afternoon
 * 17:00 - 04:59 => Good evening
 */
export const getTimeOfDayGreeting = (): { key: string; defaultText: string } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { key: 'good_morning', defaultText: 'Good morning' };
  }
  if (hour >= 12 && hour < 17) {
    return { key: 'good_afternoon', defaultText: 'Good afternoon' };
  }
  return { key: 'good_evening', defaultText: 'Good evening' };
};

/**
 * Formats user role into clean display label
 */
export const formatRoleDisplay = (rawRole: string): string => {
  if (!rawRole) return 'Resident';
  const roleLower = rawRole.toLowerCase().trim();

  if (roleLower.includes('super admin') || roleLower.includes('superadmin')) {
    return 'Super Admin';
  }
  if (roleLower.includes('admin') || roleLower.includes('community admin')) {
    return 'Admin';
  }
  if (roleLower.includes('guard') || roleLower.includes('security')) {
    return 'Security';
  }
  if (roleLower.includes('manager') || roleLower.includes('community manager')) {
    return 'Community Manager';
  }
  if (roleLower.includes('facility')) {
    return 'Facility Manager';
  }
  if (roleLower.includes('staff') || roleLower.includes('accountant') || roleLower.includes('treasury')) {
    return 'Staff';
  }
  if (roleLower.includes('owner')) {
    return 'Owner';
  }
  if (roleLower.includes('tenant')) {
    return 'Resident';
  }

  // Capitalize words
  return rawRole
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Resolves the personal display name of the user for greeting.
 * Strictly avoids showing generic role labels like "Admin", "Resident", or "Security".
 */
export const getUserDisplayName = (user: any): string => {
  if (!user) return 'Neighbor';

  const nameCandidate =
    user.name ||
    user.fullName ||
    user.displayName ||
    user.username ||
    user.firstName;

  if (typeof nameCandidate === 'string' && nameCandidate.trim() !== '') {
    const trimmed = nameCandidate.trim();
    // Return first name or single-word name
    const firstName = trimmed.split(' ')[0];
    return firstName || trimmed;
  }

  // Derive from email if name is not set
  if (user.email && typeof user.email === 'string') {
    const emailPrefix = user.email.split('@')[0];
    if (emailPrefix) {
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
  }

  return 'Neighbor';
};

/**
 * Extracts and formats the dynamic unit / villa / house number from user session.
 */
export const formatUnitLocation = (user: any, propUnitName?: string | null): string => {
  if (propUnitName && typeof propUnitName === 'string' && propUnitName.trim() !== '') {
    const pTrim = propUnitName.trim();
    const hasPrefix = /^(villa|unit|flat|apt|apartment|tower|block|gate|house|#)/i.test(pTrim);
    if (hasPrefix) return pTrim;
    return `Villa ${pTrim}`;
  }

  // Safe string extractor
  const extractUnitStr = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'string') {
      const s = val.trim();
      if (/^[0-9a-fA-F]{24}$/.test(s)) return null; // Ignore raw Mongo ObjectIds
      if (/^(n\/a|none|undefined|null|\[object object\])$/i.test(s)) return null;
      return s;
    }
    if (typeof val === 'number') {
      return String(val);
    }
    if (typeof val === 'object') {
      return (
        extractUnitStr(val.unitNumber) ||
        extractUnitStr(val.villaNumber) ||
        extractUnitStr(val.houseNumber) ||
        extractUnitStr(val.name) ||
        extractUnitStr(val.villaName) ||
        null
      );
    }
    return null;
  };

  const formatUnitDisplay = (unitStr: string, block?: string): string => {
    const hasPrefix = /^(villa|unit|flat|apt|apartment|tower|block|house|#)/i.test(unitStr);
    if (hasPrefix) {
      if (block && !unitStr.toLowerCase().includes(String(block).toLowerCase())) {
        return `${block} • ${unitStr}`;
      }
      return unitStr;
    }
    if (block) {
      return `${block} - #${unitStr}`;
    }
    return `Villa ${unitStr}`;
  };

  if (user) {
    // 1. Security / Guard persona check (only if gate is explicitly assigned)
    const roleLower = (user.role || (Array.isArray(user.roles) ? user.roles[0] : '') || '').toLowerCase();
    if (roleLower.includes('guard') || roleLower.includes('security')) {
      const gateVal = user.gate || user.assignedGate || user.gateName;
      if (gateVal && typeof gateVal === 'string' && gateVal.trim() !== '') {
        return gateVal.trim();
      }
    }

    // 2. Check direct unit / villa / house fields on user session object
    const directCandidates = [
      user.villaNumber,
      user.activeVillaNumber,
      user.unitNumber,
      user.activeUnitNumber,
      user.houseNumber,
      user.activeHouseNumber,
      user.house,
      user.doorNumber,
      user.unitName,
      user.villaName,
      user.assignedVilla,
      user.assignedUnit,
      user.villa,
      user.unit,
      user.flatNumber,
      user.apartmentNumber,
      user.address?.unitNumber,
      user.address?.villaNumber,
      user.address?.houseNumber,
    ];

    const blockOrTower = user.block || user.blockOrBuilding || user.tower || user.building || user.villaBlock;

    for (const c of directCandidates) {
      const parsed = extractUnitStr(c);
      if (parsed) {
        return formatUnitDisplay(parsed, blockOrTower);
      }
    }

    // 3. Check accessibleUnits array if available
    if (Array.isArray(user.accessibleUnits) && user.accessibleUnits.length > 0) {
      for (const u of user.accessibleUnits) {
        const parsed =
          extractUnitStr(u.villaNumber) ||
          extractUnitStr(u.unitNumber) ||
          extractUnitStr(u.houseNumber) ||
          extractUnitStr(u.name) ||
          extractUnitStr(u.villaId);
        if (parsed) {
          return formatUnitDisplay(parsed, u.block || u.villaBlock || blockOrTower);
        }
      }
    }

    // 4. Check availableWorkspaces array
    if (Array.isArray(user.availableWorkspaces) && user.availableWorkspaces.length > 0) {
      for (const w of user.availableWorkspaces) {
        const parsed =
          extractUnitStr(w.villaNumber) ||
          extractUnitStr(w.unitNumber) ||
          extractUnitStr(w.houseNumber) ||
          extractUnitStr(w.villa) ||
          extractUnitStr(w.unit);
        if (parsed) {
          return formatUnitDisplay(parsed, w.block || w.villaBlock || blockOrTower);
        }
      }
    }
  }

  // 5. Standard resident fallback when session unit is not yet bound
  return 'Villa A-104';
};

export const RoleBasedGreeting: React.FC<RoleBasedGreetingProps> = ({
  unitName,
}) => {
  const { user } = useAuth();
  const { t, translateText, language } = useTranslation();
  const [villaModalVisible, setVillaModalVisible] = React.useState(false);

  // 1. Time of day calculation
  const timeGreeting = React.useMemo(() => getTimeOfDayGreeting(), [language]);

  // 2. Resolve personal display name (strictly the user's name, not role string)
  const displayName = React.useMemo(() => {
    return getUserDisplayName(user);
  }, [user]);

  // 3. Dynamic unit / location pill: always accurately resolved and localized
  const dynamicLocation = React.useMemo(() => {
    return formatUnitLocation(user, unitName);
  }, [unitName, user]);

  const localizedLocation = React.useMemo(() => {
    return translateText(dynamicLocation);
  }, [dynamicLocation, translateText, language]);

  return (
    <>
      <View className="flex-row items-center justify-between py-1 px-0.5">
        {/* Left: Salutation & Subtitle */}
        <View className="flex-1 pe-2">
          <View className="flex-row items-center flex-wrap gap-1">
            <Text className="text-[15px] font-extrabold font-sans text-foreground tracking-tight leading-tight">
              {t(timeGreeting.key, timeGreeting.defaultText)}, {displayName}
            </Text>
            <WavingHand />
          </View>
          <Text className="text-[11.5px] font-medium font-sans text-muted-foreground mt-0.5 tracking-tight">
            {t('welcome_back_sub', 'Welcome back to your community hub')}
          </Text>
        </View>

        {/* Right: Location / Villa Badge Pill adopting existing theme color with location symbol */}
        {localizedLocation ? (
          <TouchableOpacity
            onPress={() => setVillaModalVisible(true)}
            activeOpacity={0.75}
            className="flex-row items-center gap-1 bg-primary/10 dark:bg-primary/20 border border-primary/25 dark:border-primary/35 px-2.5 py-1 rounded-full shadow-2xs shrink-0"
            accessibilityRole="button"
            accessibilityLabel={`Current location: ${localizedLocation}`}
          >
            <MapPin size={13} color="#FF6A00" strokeWidth={2.4} />
            <Text className="text-[12px] font-bold font-sans text-primary dark:text-primary">
              {localizedLocation}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Villa / Unit Switch Modal */}
      {villaModalVisible && (
        <VillaSwitchModal
          visible={villaModalVisible}
          onClose={() => setVillaModalVisible(false)}
          activeVilla={dynamicLocation}
          onSelectVilla={(_v) => setVillaModalVisible(false)}
        />
      )}
    </>
  );
};

export default RoleBasedGreeting;

