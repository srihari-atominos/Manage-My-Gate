import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Checkbox } from '../../../../components/forms/Checkbox';
import { Icon } from '../../../../components/ui/icon';
import { ShieldCheck, Compass, Check, Layers, Users, Key, Landmark, Sparkles } from 'lucide-react-native';
import { PermissionGroupMap, PermissionItem } from '../store/roleSlice';

const formatPermissionLabel = (permissionString?: string): string => {
  if (!permissionString) return '';
  let label = permissionString;
  if (label.includes(':')) {
    const parts = label.split(':');
    label = parts[parts.length - 1];
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

interface PermissionMatrixGridProps {
  groupedPermissions: PermissionGroupMap;
  selectedIds: string[];
  onSelectAllGroup: (groupCodes: string[], checked: boolean) => void;
  onTogglePermission: (permValue: string, checked: boolean) => void;
}

export const PermissionMatrixGrid: React.FC<PermissionMatrixGridProps> = ({
  groupedPermissions,
  selectedIds,
  onSelectAllGroup,
  onTogglePermission,
}) => {
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

        const groupCodes = perms.map((p) => p.name || p.code || p._id || '');
        const selectedGroupCount = groupCodes.filter((code) => (selectedIds || []).includes(code)).length;
        const isAllGroupSelected = groupCodes.length > 0 && selectedGroupCount === groupCodes.length;

        const CategoryIcon = getCategoryIcon(category);

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
                <View className="px-1.5 py-0.2 rounded-full bg-primary/15">
                  <Text className="text-xs font-extrabold text-primary">
                    {selectedGroupCount}/{groupCodes.length}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => onSelectAllGroup(groupCodes, !isAllGroupSelected)}
                activeOpacity={0.7}
                className="px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20"
              >
                <Text className="text-xs font-bold text-primary">
                  {isAllGroupSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Permission Group Container */}
            <View className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
              {perms.map((perm, idx) => {
                const permValue = perm.name || perm.code || perm._id || '';
                const isChecked = (selectedIds || []).includes(permValue);
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
          </View>
        );
      })}
    </View>
  );
};

export default PermissionMatrixGrid;
