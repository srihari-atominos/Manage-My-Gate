import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Shield,
  Users,
  Settings,
  CreditCard,
  Briefcase,
  FileText,
  MessageSquare,
  Home,
  MapPin,
  Calendar,
  Layers,
  Link2,
} from 'lucide-react-native';
import { Checkbox } from '@/components/forms/Checkbox';

const formatPermissionLabel = (permissionString: string) => {
  const exactLabels: Record<string, string> = {
    'billing:action_center': 'Digital Wallet & Resident Ledger',
    'billing:dashboard': 'Billing Hub & Community Ledger',
    'billing:assessment_manager': 'Assessment Manager',
    'notices:active_board': 'Resident Feed',
    'notices:polls': 'Community Engagement',
  };
  if (!permissionString) return '';
  const normalized = String(permissionString).toLowerCase().replace(/\./g, ':');
  if (exactLabels[normalized]) return exactLabels[normalized];
  if (
    normalized === 'staff:directory' ||
    normalized === 'staff:view' ||
    normalized === 'staff:manage'
  )
    return 'Directory';
  if (normalized === 'staff:attendance') return 'Attendance Logs';
  if (normalized === 'staff:assign_unit') return 'Unit Allocation';
  if (normalized === 'staff:portal' || normalized === 'staff:view_own')
    return 'Staff Portal & Pass';
  const label = (String(permissionString).split(/[:.]/).pop() || '').replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const getPermissionDescription = (permissionString: string) =>
  String(permissionString).toLowerCase().replace(/\./g, ':') === 'billing:action_center'
    ? 'Prepaid wallet top-up, dues payments, and personal transaction receipts'
    : '';
export const isPermissionSelected = (perm: any, selectedIds: string[] = []) => {
  if (!perm || !selectedIds || selectedIds.length === 0) return false;
  const permValue = String(perm?.name || perm?.code || perm?._id || perm);

  if (permValue.endsWith(':full_access')) {
    const category = permValue.split(':')[0];
    return selectedIds.some((p) => String(p).startsWith(`${category}:`));
  }

  if (selectedIds.includes(permValue)) return true;
  if (perm?._id && selectedIds.includes(String(perm._id))) return true;

  if (typeof permValue === 'string') {
    const normalizedPerm = permValue.toLowerCase().replace(/\./g, ':');
    const normalizedSelected = new Set(
      selectedIds.map((id) => String(id).toLowerCase().replace(/\./g, ':'))
    );
    const noticeAliases: Record<string, string[]> = {
      'notices:active_board': ['notices:active_board', 'notices:read'],
      'notices:polls': ['notices:polls', 'polls:read', 'polls:vote'],
      'notices:manage_notices': [
        'notices:manage_notices',
        'notices:dashboard',
        'notices:create',
        'notices:update',
        'notices:delete',
        'notices:publish',
        'polls:create',
        'polls:update',
        'polls:delete',
        'polls:publish',
        'polls:close',
      ],
      'staff:directory': ['staff:directory', 'staff:view', 'staff:manage'],
      'staff:attendance': ['staff:attendance'],
      'staff:assign_unit': ['staff:assign_unit'],
      'staff:portal': ['staff:portal', 'staff:view_own'],
    };
    if (noticeAliases[normalizedPerm]?.some((alias) => normalizedSelected.has(alias))) {
      return true;
    }

    const dot = permValue.replace(/:/g, '.');
    const colon = permValue.replace(/\./g, ':');
    if (selectedIds.includes(dot) || selectedIds.includes(colon)) return true;
  }
  return false;
};

const getCategoryDisplayName = (category: string) => {
  const map: Record<string, string> = {
    visitor: 'Visitor Management',
    amenities: 'Amenities & Booking',
    complaints: 'Complaints & Maintenance',
    notices: 'Notice Board & Polls',
    digital_wallet: 'Digital Wallet & Ledger',
    billing: 'Billing & Invoices',
    staff: 'Staff Management',
    villas: 'Unit Management',
    users: 'User Management',
    integrations: 'Integration Hub',
    roles: 'Roles & Permissions',
    workspaces: 'Workspaces',
  };
  return map[category] || category.charAt(0).toUpperCase() + category.slice(1);
};

const getCategoryIcon = (category: string) => {
  const map: Record<string, any> = {
    visitor: Users,
    amenities: Calendar,
    complaints: Settings,
    notices: MessageSquare,
    digital_wallet: CreditCard,
    billing: CreditCard,
    staff: Users,
    villas: Home,
    users: Briefcase,
    integrations: Link2,
    roles: Shield,
    workspaces: Layers,
  };
  return map[category] || Shield;
};

const CATEGORY_ORDER: Record<string, number> = {
  visitor: 1,
  amenities: 2,
  complaints: 3,
  notices: 4,
  digital_wallet: 5,
  billing: 6,
  staff: 7,
  villas: 8,
  users: 9,
  roles: 10,
  workspaces: 11,
  integrations: 12,
};
interface PermissionMatrixGridProps {
  groupedPermissions: Record<string, any[]>;
  selectedIds: string[];
  onSelectAllGroup: (groupCodes: string[], checked: boolean) => void;
  onTogglePermission: (permValue: string, checked: boolean) => void;
}

const PermissionMatrixGrid = ({
  groupedPermissions,
  selectedIds,
  onSelectAllGroup,
  onTogglePermission,
}: PermissionMatrixGridProps) => {
  const normalizedGroupedPermissions = React.useMemo(() => {
    if (!groupedPermissions) return {};
    const result: Record<string, any[]> = {};
    Object.entries(groupedPermissions).forEach(([categoryKey, perms]) => {
      const lowerKey = categoryKey.toLowerCase();
      if (lowerKey === 'polls') {
        result.notices = [...(result.notices || []), ...(perms || [])];
        return;
      }
      const categoryPermissions = perms || [];
      if (lowerKey === 'digital_wallet') {
        result.digital_wallet = [...(result.digital_wallet || []), ...categoryPermissions];
        return;
      }

      if (lowerKey === 'billing') {
        const walletPermissions = categoryPermissions.filter(
          (permission) =>
            String(permission.name || permission.code || permission._id || '')
              .toLowerCase()
              .replace(/\./g, ':') === 'billing:action_center'
        );
        result.digital_wallet = [...(result.digital_wallet || []), ...walletPermissions];
        result.billing = categoryPermissions.filter(
          (permission) => !walletPermissions.includes(permission)
        );
        return;
      }
      result[lowerKey] = categoryPermissions;
    });
    return result;
  }, [groupedPermissions]);

  const categories = React.useMemo(() => {
    return Object.keys(normalizedGroupedPermissions).sort((a, b) => {
      const orderA = CATEGORY_ORDER[a] || 99;
      const orderB = CATEGORY_ORDER[b] || 99;
      if (orderA === orderB) return a.localeCompare(b);
      return orderA - orderB;
    });
  }, [normalizedGroupedPermissions]);

  if (categories.length === 0) {
    return (
      <View className="items-center justify-center p-4">
        <Text className="text-muted-foreground">No permissions found in the system matrix.</Text>
      </View>
    );
  }

  return (
    <View className="flex-col gap-4">
      {categories.map((category) => {
        let perms = [...(normalizedGroupedPermissions[category] || [])];

        if (category === 'complaints') {
          const allowed = [
            'dashboard',
            'raise_ticket',
            'complaint_management',
            'track_requests',
            'staff',
            'assignee',
          ];
          perms = perms.filter((p) => {
            const permName = p.name || p.code || p._id || '';
            const action = permName.includes(':')
              ? permName.split(':')[1]
              : permName.includes('.')
                ? permName.split('.')[1]
                : permName;
            return allowed.includes(action.toLowerCase());
          });
        }

        if (['users', 'villas', 'roles', 'workspaces', 'integrations'].includes(category)) {
          perms = [
            {
              _id: `${category}:full_access`,
              name: `${category}:full_access`,
              description: 'Full Access',
            },
          ];
        }

        if (category === 'notices') {
          const allowed = ['active_board', 'polls', 'manage_notices'];
          perms = perms.filter((p) => {
            const permName = p.name || p.code || p._id || '';
            const action = permName.includes(':')
              ? permName.split(':')[1]
              : permName.includes('.')
                ? permName.split('.')[1]
                : permName;
            return allowed.includes(action.toLowerCase());
          });
          const existingActions = perms.map((p) => {
            const name = p.name || p.code || p._id || '';
            return name.includes(':')
              ? name.split(':')[1]
              : name.includes('.')
                ? name.split('.')[1]
                : name;
          });
          if (!existingActions.includes('active_board')) {
            perms.push({ name: 'notices:active_board' });
          }
          if (!existingActions.includes('polls')) {
            perms.push({ name: 'notices:polls' });
          }
          if (!existingActions.includes('manage_notices')) {
            perms.push({ name: 'notices:manage_notices' });
          }
        }

        if (category === 'staff') {
          perms = [
            {
              _id: 'staff:directory',
              name: 'staff:directory',
              description: 'Staff Directory',
            },
            {
              _id: 'staff:attendance',
              name: 'staff:attendance',
              description: 'Attendance Logs',
            },
            {
              _id: 'staff:assign_unit',
              name: 'staff:assign_unit',
              description: 'Unit Allocation',
            },
            {
              _id: 'staff:portal',
              name: 'staff:portal',
              description: 'Staff Portal & Pass',
            },
          ];
        }

        const groupCodes = perms.map((p) => p.name || p.code || p._id || '');
        const selectedGroupCount = perms.filter((p) => isPermissionSelected(p, selectedIds)).length;
        const isAllGroupSelected =
          groupCodes.length > 0 && selectedGroupCount === groupCodes.length;

        const CategoryIcon = getCategoryIcon(category);

        return (
          <View key={category} className="gap-2">
            {/* Category Header */}
            <View className="flex-row items-center justify-between px-1">
              <View className="flex-row items-center gap-2">
                <View className="h-6 w-6 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                  <CategoryIcon size={13} className="text-primary" />
                </View>
                <Text className="font-bold text-xs text-foreground">
                  {getCategoryDisplayName(category)}
                </Text>
                <View className="py-0.2 rounded-full bg-primary/15 px-1.5">
                  <Text className="font-extrabold text-xs text-primary">
                    {selectedGroupCount}/{groupCodes.length}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => onSelectAllGroup(groupCodes, !isAllGroupSelected)}
                activeOpacity={0.7}
                className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1">
                <Text className="font-bold text-xs text-primary">
                  {isAllGroupSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Permission Group Container */}
            <View className="flex-row flex-wrap gap-2">
              {perms.map((perm, idx) => {
                const permValue = perm.name || perm.code || perm._id || '';
                const isChecked = isPermissionSelected(perm, selectedIds);
                const label = formatPermissionLabel(perm.name || String(permValue));
                const description = getPermissionDescription(perm.name || String(permValue));

                return (
                  <TouchableOpacity
                    key={permValue}
                    onPress={() => onTogglePermission(permValue, !isChecked)}
                    activeOpacity={0.7}
                    className={`flex-row items-center self-start rounded-xl border p-2.5 ${
                      isChecked
                        ? 'shadow-xs border-primary/40 bg-primary/10'
                        : 'shadow-2xs border-border/80 bg-card'
                    }`}>
                    <View className="me-2.5">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(val) => onTogglePermission(permValue, !!val)}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-start text-[11px] ${
                          isChecked ? 'font-bold text-primary' : 'font-semibold text-foreground'
                        }`}>
                        {label}
                      </Text>
                      {description ? (
                        <Text className="mt-0.5 text-[10px] text-muted-foreground">
                          {description}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
};

export { PermissionMatrixGrid };
export default PermissionMatrixGrid;
