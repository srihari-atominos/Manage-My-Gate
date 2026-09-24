import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Checkbox } from '../../../../components/forms/Checkbox';
import { Icon } from '../../../../components/ui/icon';
import { ShieldCheck, Compass, Check, Layers, Users, Key, Landmark, Sparkles } from 'lucide-react-native';
import { PermissionGroupMap, PermissionItem } from '../store/roleSlice';

const formatPermissionLabel = (permissionString?: string): string => {
  if (!permissionString) return '';
  const str = String(permissionString).toLowerCase();
  if (str === 'notices:active_board' || str === 'notices.active_board' || str === 'active_board') {
    return 'Resident Feed';
  }
  if (str === 'notices:polls' || str === 'notices.polls' || str === 'polls') {
    return 'Community Engagement';
  }
  if (str === 'notices:manage_notices' || str === 'notices.manage_notices' || str === 'manage_notices') {
    return 'Manage Engagement';
  }

  let label = permissionString;
  if (label.includes(':')) {
    const parts = label.split(':');
    label = parts[parts.length - 1];
  }
  label = label.replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const isPermissionSelected = (perm: PermissionItem | string, selectedIds: string[] = []): boolean => {
  if (!perm || !selectedIds || selectedIds.length === 0) return false;
  const permValue = typeof perm === 'object' ? (perm?.name || perm?.code || perm?._id || '') : perm;
  if (selectedIds.includes(permValue)) return true;
  if (typeof perm === 'object' && perm?._id && selectedIds.includes(String(perm._id))) return true;

  if (typeof permValue === 'string') {
    const dot = permValue.replace(/:/g, '.');
    const colon = permValue.replace(/\./g, ':');
    if (selectedIds.includes(dot) || selectedIds.includes(colon)) return true;

    const action = permValue.includes(':')
      ? permValue.split(':')[1]
      : permValue.includes('.')
      ? permValue.split('.')[1]
      : permValue;

    if (selectedIds.includes(action)) return true;

    if (
      (action === 'active_board' || permValue === 'notices:active_board') &&
      (selectedIds.includes('notices:read') || selectedIds.includes('notices.read'))
    ) {
      return true;
    }
  }
  return false;
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

        // Filter notices permissions down to strictly 3 granular options:
        // Resident Feed, Community Engagement, Manage Engagement
        if (category.toLowerCase() === 'notices') {
          const allowedNoticeActions = ['active_board', 'polls', 'manage_notices'];
          perms = perms.filter((p) => {
            const permName = p.name || p.code || p._id || '';
            const action = permName.includes(':')
              ? permName.split(':')[1]
              : permName.includes('.')
              ? permName.split('.')[1]
              : permName;
            return allowedNoticeActions.includes(action.toLowerCase());
          });

          const existingActions = perms.map((p) => {
            const name = p.name || p.code || p._id || '';
            return name.includes(':') ? name.split(':')[1] : (name.includes('.') ? name.split('.')[1] : name);
          });
          if (!existingActions.includes('active_board')) {
            perms.push({ name: 'notices:active_board', code: 'notices:active_board', _id: 'notices:active_board' });
          }
          if (!existingActions.includes('polls')) {
            perms.push({ name: 'notices:polls', code: 'notices:polls', _id: 'notices:polls' });
          }
          if (!existingActions.includes('manage_notices')) {
            perms.push({ name: 'notices:manage_notices', code: 'notices:manage_notices', _id: 'notices:manage_notices' });
          }
        }

        const groupCodes = perms.map((p) => p.name || p.code || p._id || '');
        const selectedGroupCount = perms.filter((p) => isPermissionSelected(p, selectedIds)).length;
        const isAllGroupSelected = groupCodes.length > 0 && selectedGroupCount === groupCodes.length;

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
                  const isChecked = isPermissionSelected(perm, selectedIds);
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
