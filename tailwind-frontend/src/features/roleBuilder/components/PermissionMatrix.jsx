import React from 'react';
import { Checkbox } from 'src/components/ui/checkbox';
import { Label } from 'src/components/ui/label';

const PERMISSION_LABEL_MAP = {
  active_board: 'Resident Feed',
  resident_feed: 'Resident Feed',
  polls: 'Community Engagement',
  community_engagement: 'Community Engagement',
  manage_notices: 'Manage Engagement',
  manage_engagement: 'Manage Engagement',
  dashboard: 'Manage Engagement',
};

const formatPermissionLabel = (permissionString) => {
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
          const seenLabels = new Set();
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
        
const isPermissionSelected = (selectedIds, perm) => {
  if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0 || !perm) return false;
  const pId = String(perm._id || '');
  const pName = String(perm.name || '').trim().toLowerCase();
  const pCode = String(perm.code || '').trim().toLowerCase();
  const pAction = String(perm.action || '').trim().toLowerCase();

  return selectedIds.some((selected) => {
    if (!selected) return false;
    const selStr = typeof selected === 'object' ? String(selected.name || selected._id || '') : String(selected);
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

        const groupCodes = perms.map((p) => p.name || p.code || p._id);
        const isAllGroupSelected = perms.length > 0 && perms.every((p) => isPermissionSelected(selectedIds, p));

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
                const isChecked = isPermissionSelected(selectedIds, perm);

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
