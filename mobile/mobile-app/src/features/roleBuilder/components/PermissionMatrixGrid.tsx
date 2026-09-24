import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Checkbox } from '../../../../components/forms/Checkbox';
import { Icon } from '../../../../components/ui/icon';
import { ShieldCheck, Compass, Check, Layers, Users, Key, Landmark, Sparkles } from 'lucide-react-native';
import { PermissionGroupMap, PermissionItem } from '../store/roleSlice';

const PERMISSION_LABEL_MAP: Record<string, string> = {
  active_board: 'Resident Feed',
  resident_feed: 'Resident Feed',
  polls: 'Community Engagement',
  community_engagement: 'Community Engagement',
  manage_notices: 'Manage Engagement',
  manage_engagement: 'Manage Engagement',
  dashboard: 'Manage Engagement',
};

const formatPermissionLabel = (permissionString?: string): string => {
  if (!permissionString) return '';
  let label = permissionString;
  if (label.includes(':')) {
    const parts = label.split(':');
    label = parts[parts.length - 1];
  }
  const key = label.toLowerCase();
  if (PERMISSION_LABEL_MAP[key]) {
    return PERMISSION_LABEL_MAP[key];
  }
  label = label.replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const getCategoryDisplayName = (category: string): string => {
  const map: Record<string, string> = {
    visitor: 'Visitor Management',
    amenities: 'Amenities & Bookings',
    billing: 'Billing & Invoices',
    villas: 'Unit Management',
    users: 'User Management',
    notices: 'Notices Board',
    integrations: 'Integrations Hub',
    complaints: 'Complaints & Maintenance',
  };
  const key = category.toLowerCase();
  return map[key] || category.charAt(0).toUpperCase() + category.slice(1);
};

const getCategoryIcon = (category: string) => {
  const key = category.toLowerCase();
  switch (key) {
    case 'visitor':
      return ShieldCheck;
    case 'amenities':
      return Sparkles;
    case 'billing':
      return Landmark;
    case 'villas':
      return Layers;
    case 'users':
      return Users;
    case 'integrations':
      return Compass;
    default:
      return Key;
  }
};

const AMENITY_TIERS = [
  {
    id: 'resident',
    label: 'Resident',
    description: 'Catalog discovery, booking wizard, wallet & personal digital passes',
  },
  {
    id: 'security_guard',
    label: 'Security Guard',
    description: 'Gate QR scanner terminal & entry security logs',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Facility master, calendar, maintenance, ledgers, settings & dashboard',
  },
  {
    id: 'none',
    label: 'None',
    description: 'No access to amenity facilities or booking operations',
  },
];

interface PermissionMatrixGridProps {
  groupedPermissions: PermissionGroupMap;
  selectedIds: string[];
  activeAmenityTier?: string;
  onSelectAllGroup: (groupCodes: string[], checked: boolean) => void;
  onTogglePermission: (permValue: string, checked: boolean) => void;
}

export const PermissionMatrixGrid: React.FC<PermissionMatrixGridProps> = ({
  groupedPermissions,
  selectedIds,
  activeAmenityTier = 'none',
  onSelectAllGroup,
  onTogglePermission,
}) => {
  const [internalTier, setInternalTier] = React.useState<string>('none');
  const currentAmenityTier = activeAmenityTier || internalTier;
  const categories = Object.keys(groupedPermissions || {});

  if (categories.length === 0) {
    return (
      <View className="py-6 items-center bg-card rounded-2xl border border-border">
        <Text className="text-xs font-semibold text-muted-foreground">No permissions found in system catalog.</Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {categories.map((category) => {
        let perms: PermissionItem[] = groupedPermissions[category] || [];
        const isAmenities = category.toLowerCase() === 'amenities';

        // Filter complaints permissions as per reference domain rule
        if (category.toLowerCase() === 'complaints') {
          const allowedComplaintsPerms = [
            'dashboard',
            'raise_ticket',
            'complaint_management',
            'staff_vendors',
            'assignee',
            'track_requests',
            'staff',
          ];
          perms = perms.filter((p) => {
            const permName = p.name || p.code || p._id || '';
            const action = permName.includes(':') ? permName.split(':')[1] : permName;
            return allowedComplaintsPerms.includes(action.toLowerCase());
          });
        }

        // Filter noticeboard permissions as requested: only Resident Feed, Community Engagement, and Manage Engagement
        const catKey = category.toLowerCase();
        if (catKey === 'notices' || catKey === 'noticeboard' || catKey === 'notices board') {
          const allowedNoticesPerms = [
            'active_board',
            'resident_feed',
            'polls',
            'community_engagement',
            'manage_notices',
            'manage_engagement',
            'dashboard',
          ];
          const seenLabels = new Set<string>();
          perms = perms.filter((p) => {
            const permName = p.name || p.code || p._id || '';
            const action = (permName.includes(':') ? permName.split(':')[1] : permName).toLowerCase();
            if (allowedNoticesPerms.includes(action)) {
              const displayLabel = PERMISSION_LABEL_MAP[action] || action;
              if (seenLabels.has(displayLabel)) {
                return false;
              }
              seenLabels.add(displayLabel);
              return true;
            }
            return false;
          });
        }

const isPermissionSelected = (selectedIds: string[], perm: PermissionItem): boolean => {
  if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0 || !perm) return false;
  const pId = String(perm._id || '');
  const pName = String(perm.name || '').trim().toLowerCase();
  const pCode = String(perm.code || '').trim().toLowerCase();
  const pAction = String(perm.action || '').trim().toLowerCase();

  return selectedIds.some((selected) => {
    if (!selected) return false;
    const selStr = typeof selected === 'object' ? String((selected as any).name || (selected as any)._id || '') : String(selected);
    const selTrimmed = selStr.trim().toLowerCase();
    const selNormalized = selTrimmed.replace(':', '.');
    const pNameNormalized = pName.replace(':', '.');

    if (
      selTrimmed === pId ||
      selTrimmed === pName ||
      selTrimmed === pCode ||
      selNormalized === pNameNormalized
    ) {
      return true;
    }

    const selAction = selTrimmed.includes(':') ? selTrimmed.split(':')[1] : selTrimmed;
    const pActionName = pName.includes(':') ? pName.split(':')[1] : pName;
    if (selAction && (selAction === pAction || selAction === pActionName)) {
      return true;
    }

    return false;
  });
};

        const groupCodes = perms.map((p) => p.name || p.code || p._id || '');
        const selectedGroupCount = perms.filter((p) => isPermissionSelected(selectedIds || [], p)).length;
        const isAllGroupSelected = perms.length > 0 && selectedGroupCount === perms.length;

        const CategoryIcon = getCategoryIcon(category);
        const activeAmenityTier = isAmenities ? currentAmenityTier : null;

        return (
          <View key={category} className="gap-2">
            {/* Category Header */}
            <View className="flex-row items-center justify-between px-1">
              <View className="flex-row items-center gap-2">
                <View className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 items-center justify-center">
                  <Icon as={CategoryIcon} size={13} className="text-primary" />
                </View>
                <Text className="text-xs font-bold text-foreground">
                  {getCategoryDisplayName(category)}
                </Text>
                {isAmenities ? (
                  <View className="px-2 py-0.5 rounded-full bg-primary/15">
                    <Text className="text-[11px] font-extrabold text-primary capitalize">
                      {activeAmenityTier === 'none'
                        ? 'None'
                        : activeAmenityTier === 'security_guard'
                        ? 'Security'
                        : activeAmenityTier}
                    </Text>
                  </View>
                ) : (
                  <View className="px-1.5 py-0.2 rounded-full bg-primary/15">
                    <Text className="text-xs font-extrabold text-primary">
                      {selectedGroupCount}/{groupCodes.length}
                    </Text>
                  </View>
                )}
              </View>

              {!isAmenities && (
                <TouchableOpacity
                  onPress={() => onSelectAllGroup(groupCodes, !isAllGroupSelected)}
                  activeOpacity={0.7}
                  className="px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20"
                >
                  <Text className="text-xs font-bold text-primary">
                    {isAllGroupSelected ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Permission Group Container */}
            {isAmenities ? (
              <View className="gap-2">
                {AMENITY_TIERS.map((tier) => {
                  const isChecked = activeAmenityTier === tier.id;
                  return (
                    <TouchableOpacity
                      key={tier.id}
                      onPress={() => {
                        setInternalTier(tier.id);
                        onTogglePermission(`amenities_tier:${tier.id}`, true);
                      }}
                      activeOpacity={0.7}
                      className={`p-3 rounded-2xl border ${
                        isChecked
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'bg-card border-border/70'
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 me-3">
                          <Text
                            className={`text-xs font-bold ${
                              isChecked ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {tier.label}
                          </Text>
                          <Text className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                            {tier.description}
                          </Text>
                        </View>
                        <View
                          className={`w-5 h-5 rounded-full border items-center justify-center ${
                            isChecked
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/40 bg-transparent'
                          }`}
                        >
                          {isChecked ? (
                            <View className="w-2 h-2 rounded-full bg-primary-foreground" />
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                {perms.map((perm, idx) => {
                  const permValue = perm.name || perm.code || perm._id || '';
                  const isChecked = isPermissionSelected(selectedIds || [], perm);
                  const isLast = idx === perms.length - 1;

                  return (
                    <TouchableOpacity
                      key={permValue}
                      onPress={() => onTogglePermission(permValue, !isChecked)}
                      activeOpacity={0.7}
                      className={`flex-row items-center justify-between p-3 ${
                        !isLast ? 'border-b border-border/40' : ''
                      } ${isChecked ? 'bg-primary/5' : 'bg-card'}`}
                    >
                      <Text
                        className={`text-xs font-semibold flex-1 me-3 text-start ${
                          isChecked ? 'text-primary font-bold' : 'text-foreground'
                        }`}
                      >
                        {formatPermissionLabel(perm.name || String(permValue))}
                      </Text>

                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(val) => onTogglePermission(permValue, !!val)}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

export default PermissionMatrixGrid;
