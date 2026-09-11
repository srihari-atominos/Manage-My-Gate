import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { getUserRoleName } from '../../src/utils/rbac';
import { useTranslation } from '../../src/utils/i18n';

export interface RoleBasedGreetingProps {
  unitName?: string | null;
  communityName?: string;
  customRoleName?: string;
}

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
 * Extracts and formats the dynamic unit / villa / apartment number from user session.
 * Returns null if no unit is assigned (strictly avoids hardcoded fallbacks like "Villa 101").
 */
export const formatUnitLocation = (user: any, propUnitName?: string | null): string | null => {
  if (propUnitName && typeof propUnitName === 'string' && propUnitName.trim() !== '') {
    const pTrim = propUnitName.trim();
    const hasPrefix = /^(villa|unit|flat|apt|apartment|tower|block|gate|#)/i.test(pTrim);
    if (hasPrefix) return pTrim;
    return `Villa ${pTrim}`;
  }

  if (user) {
    // 1. Security / Guard persona check (only if gate is explicitly assigned)
    const roleLower = (user.role || (Array.isArray(user.roles) ? user.roles[0] : '') || '').toLowerCase();
    if (roleLower.includes('guard') || roleLower.includes('security')) {
      const gateVal = user.gate || user.assignedGate || user.gateName;
      if (gateVal && String(gateVal).trim() !== '') {
        return String(gateVal).trim();
      }
      return null;
    }

    // 2. Check direct unit fields on user session object
    const rawUnit =
      user.villaNumber ||
      user.activeVillaNumber ||
      user.unitNumber ||
      user.activeUnitNumber ||
      user.unitName ||
      user.assignedVilla ||
      user.flatNumber ||
      user.apartmentNumber ||
      user.villa ||
      user.unit;

    let candidateUnit = rawUnit;

    // 3. Check accessible units array if available
    if (!candidateUnit && Array.isArray(user.accessibleUnits) && user.accessibleUnits.length > 0) {
      candidateUnit =
        user.accessibleUnits[0]?.villaNumber ||
        user.accessibleUnits[0]?.unitNumber ||
        user.accessibleUnits[0]?.name ||
        user.accessibleUnits[0]?.villaName;
    }

    // 4. Check available workspaces
    if (!candidateUnit && Array.isArray(user.availableWorkspaces) && user.availableWorkspaces.length > 0) {
      for (const w of user.availableWorkspaces) {
        if (w.villaNumber || w.unitNumber) {
          candidateUnit = w.villaNumber || w.unitNumber;
          break;
        }
      }
    }

    if (candidateUnit !== undefined && candidateUnit !== null && String(candidateUnit).trim() !== '') {
      const strUnit = String(candidateUnit).trim();
      // Ignore placeholder strings like "N/A", "None", or "undefined"
      if (/^(n\/a|none|undefined|null)$/i.test(strUnit)) {
        return null;
      }

      const blockOrTower = user.block || user.blockOrBuilding || user.tower || user.building || user.villaBlock;
      const hasPrefix = /^(villa|unit|flat|apt|apartment|tower|block|#)/i.test(strUnit);

      if (hasPrefix) {
        if (blockOrTower && !strUnit.toLowerCase().includes(String(blockOrTower).toLowerCase())) {
          return `${blockOrTower} • ${strUnit}`;
        }
        return strUnit;
      }

      if (blockOrTower) {
        return `${blockOrTower} - #${strUnit}`;
      }

      return `Villa ${strUnit}`;
    }
  }

  // 5. If no unit is assigned, return null so NO badge is displayed
  return null;
};

export const RoleBasedGreeting: React.FC<RoleBasedGreetingProps> = ({
  unitName,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  // 1. Time of day calculation
  const timeGreeting = useMemo(() => getTimeOfDayGreeting(), []);

  // 2. Resolve personal display name (strictly the user's name, not role string)
  const displayName = useMemo(() => {
    return getUserDisplayName(user);
  }, [user]);

  // 3. Dynamic unit / location pill: strictly only if user has an assigned unit (no "Villa 101" fallback)
  const dynamicLocation = useMemo(() => {
    return formatUnitLocation(user, unitName);
  }, [unitName, user]);

  return (
    <View className="flex-row items-center justify-between py-2 px-1">
      {/* Left: Salutation & Subtitle */}
      <View className="flex-1 pr-2">
        <Text className="text-[20px] font-extrabold font-sans text-foreground tracking-tight leading-snug">
          {t(timeGreeting.key, timeGreeting.defaultText)}, {displayName} 👋
        </Text>
        <Text className="text-[12px] font-medium font-sans text-muted-foreground mt-0.5">
          {t('welcome_back_sub', 'Welcome back to your community hub')}
        </Text>
      </View>

      {/* Right: Location / Villa Badge Pill adopting theme with map icon (only if assigned) */}
      {dynamicLocation ? (
        <View className="flex-row items-center gap-1.5 bg-primary/10 dark:bg-primary/20 border border-primary/25 dark:border-primary/35 px-3 py-1.5 rounded-full shadow-2xs">
          <MapPin size={13} color="#FF6A00" strokeWidth={2.4} />
          <Text className="text-[12px] font-bold font-sans text-foreground">
            {dynamicLocation}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

export default RoleBasedGreeting;

