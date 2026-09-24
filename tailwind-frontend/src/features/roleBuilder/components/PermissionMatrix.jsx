import React from 'react';
import { Checkbox } from 'src/components/ui/checkbox';
import { Label } from 'src/components/ui/label';

const formatPermissionLabel = (permissionString) => {
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

export const isPermissionSelected = (perm, selectedIds = []) => {
  if (!perm || !selectedIds || selectedIds.length === 0) return false;
  const permValue = perm?.name || perm?.code || perm?._id || perm;
  if (selectedIds.includes(permValue)) return true;
  if (perm?._id && selectedIds.includes(String(perm._id))) return true;

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

const PermissionMatrix = ({ groupedPermissions, selectedIds, onSelectAllGroup, onTogglePermission }) => {
  if (!groupedPermissions || Object.keys(groupedPermissions).length === 0) {
    return (
      <div className="text-center text-gray-500 py-6 text-sm">
        No permissions found in the system.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {Object.keys(groupedPermissions).map((category) => {
        let perms = groupedPermissions[category] || [];
        
        // Filter complaints permissions as requested
        if (category.toLowerCase() === 'complaints') {
          const allowedComplaintsPerms = ['dashboard', 'raise_ticket', 'complaint_management', 'staff_vendors', 'assignee', 'track_requests', 'staff'];
          perms = perms.filter(p => {
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
        
        const groupCodes = perms.map((p) => p.name || p.code || p._id);
        const isAllGroupSelected = groupCodes.length > 0 && perms.every((p) => isPermissionSelected(p, selectedIds));

        return (
          <div key={category} className="border border-stroke dark:border-strokedark rounded-md bg-white dark:bg-boxdark p-4 shadow-sm mb-2">
            <div className="flex justify-between items-center border-b border-stroke dark:border-strokedark pb-3 mb-4">
              <h6 className="font-bold text-sm text-black dark:text-white">
                {category.toLowerCase() === 'visitor' ? 'Visitor Management' : (category.toLowerCase() === 'amenities' ? 'Amenities & Bookings' : category.charAt(0).toUpperCase() + category.slice(1))} Permissions
              </h6>
              {category.toLowerCase() !== 'visitor' && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`select-all-${category}`}
                    checked={isAllGroupSelected}
                    onCheckedChange={(checked) => onSelectAllGroup(groupCodes, !!checked)}
                    className="checkbox"
                  />
                  <Label
                    htmlFor={`select-all-${category}`}
                    className="text-xs font-semibold text-gray-500 cursor-pointer"
                  >
                    Select All
                  </Label>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {perms.map((perm) => {
                const permValue = perm.name || perm.code || perm._id;
                const idSafe = String(permValue).replace(/:/g, '-');
                const isChecked = isPermissionSelected(perm, selectedIds);

                if (category.toLowerCase() === 'visitor') {
                  return (
                    <div key={permValue} className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`perm-check-${idSafe}`}
                        name="visitor-permission-group"
                        checked={isChecked}
                        onChange={(e) => onTogglePermission(permValue, e.target.checked)}
                        className="h-4 w-4 rounded-full border-stroke dark:border-strokedark text-primary focus:ring-primary bg-transparent"
                      />
                      <Label
                        htmlFor={`perm-check-${idSafe}`}
                        className="text-sm text-black dark:text-white cursor-pointer font-normal opacity-90"
                      >
                        {formatPermissionLabel(perm.name || String(permValue))}
                      </Label>
                    </div>
                  );
                }

                return (
                  <div key={permValue} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-check-${idSafe}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => onTogglePermission(permValue, !!checked)}
                      className="checkbox"
                    />
                    <Label
                      htmlFor={`perm-check-${idSafe}`}
                      className="text-sm text-black dark:text-white cursor-pointer font-normal opacity-90"
                    >
                      {formatPermissionLabel(perm.name || String(permValue))}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PermissionMatrix;
