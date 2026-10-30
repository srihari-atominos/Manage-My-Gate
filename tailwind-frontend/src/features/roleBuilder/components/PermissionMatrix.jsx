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

  // Staff Management (4 Granular Sub-Features)
  if (str === 'staff:directory' || str === 'staff:view' || str === 'staff:manage' || str === 'view' && permissionString?.includes('staff')) {
    return 'Staff Directory';
  }
  if (str === 'staff:attendance' || str === 'attendance') {
    return 'Attendance Logs';
  }
  if (str === 'staff:assign_unit' || str === 'assign_unit') {
    return 'Unit Allocation';
  }
  if (str === 'staff:portal' || str === 'staff:view_own' || str === 'view_own') {
    return 'Staff Portal & Pass';
  }

  // Billing & Invoices (Canonical 6 Items & Wallet)
  const billingLabels = {
    'billing:my_invoices': 'My Invoice',
    'billing:assessments': 'Assessments',
    'billing:ledger': 'Billing Ledger',
    'billing:billing_hub': 'Billing Hub',
    'billing:expenses': 'Community Expenses',
    'billing:dashboard': 'Community Finance',
    'billing:action_center': 'Digital Wallet & Resident Ledger',
  };
  if (billingLabels[str]) {
    return billingLabels[str];
  }

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

const getCategoryDisplayName = (category) => {
  const map = {
    visitor: 'Visitor Management',
    staff: 'Staff Management',
    amenities: 'Amenities & Bookings',
    digital_wallet: 'Digital Wallet & Ledger',
    billing: 'Billing & Invoices',
    villas: 'Unit Management',
    users: 'User Management',
    notices: 'Notice Board & Polls',
    integrations: 'Integrations Hub',
    complaints: 'Complaints & Maintenance',
    roles: 'Role Builder',
    workspaces: 'Workspaces',
  };
  const key = category.toLowerCase();
  return map[key] || category.charAt(0).toUpperCase() + category.slice(1);
};

const CATEGORY_ORDER = {
  visitor: 1,
  staff: 2,
  amenities: 3,
  complaints: 4,
  notices: 5,
  digital_wallet: 6,
  billing: 7,
  villas: 8,
  users: 9,
  roles: 10,
  workspaces: 11,
  integrations: 12,
};

const PermissionMatrix = ({ groupedPermissions, selectedIds, onSelectAllGroup, onTogglePermission }) => {
  const normalizedGroupedPermissions = React.useMemo(() => {
    if (!groupedPermissions) return {};
    const result = {};

    Object.entries(groupedPermissions).forEach(([categoryKey, perms]) => {
      const lowerKey = categoryKey.toLowerCase();
      if (lowerKey === 'polls') return;
      if (lowerKey === 'billing') {
        const canonical6BillingItems = [
          {
            _id: 'billing:my_invoices',
            name: 'billing:my_invoices',
            code: 'billing:my_invoices',
            permissionAliases: ['billing:my_invoices', 'billing:my_dues'],
            description: 'Resident personal invoices, statements, dues, and payment checkout',
          },
          {
            _id: 'billing:assessments',
            name: 'billing:assessments',
            code: 'billing:assessments',
            permissionAliases: ['billing:assessments', 'billing:assessment_manager'],
            description: 'Recurring maintenance generation, penalty rules, and batch invoice distribution',
          },
          {
            _id: 'billing:ledger',
            name: 'billing:ledger',
            code: 'billing:ledger',
            permissionAliases: ['billing:ledger', 'billing:financial_ledger', 'billing:reconciliation_manage'],
            description: 'Double-entry accounting, settlement records, audit logs, and account reconciliations',
          },
          {
            _id: 'billing:billing_hub',
            name: 'billing:billing_hub',
            code: 'billing:billing_hub',
            permissionAliases: ['billing:billing_hub'],
            description: 'Administrative central desk for invoices, dues tracking, and payment reconciliations',
          },
          {
            _id: 'billing:expenses',
            name: 'billing:expenses',
            code: 'billing:expenses',
            permissionAliases: [
              'billing:expenses',
              'billing:view_expense',
              'billing:create_expense',
              'billing:record_expense_payment',
              'billing:reconcile_expense_payment',
              'billing:pay_online_expense',
            ],
            description: 'Track community vendor bills, operational expenses, receipt scanning, and payouts',
          },
          {
            _id: 'billing:dashboard',
            name: 'billing:dashboard',
            code: 'billing:dashboard',
            permissionAliases: ['billing:dashboard', 'billing:community_finance'],
            description: 'Real-time financial analytics, revenue vs expense curves, and treasury health',
          },
        ];

        result.billing = canonical6BillingItems;

        const actionCenterPerm = (perms || []).find((p) => {
          const val = String(p?.name || p?.code || p?._id || '').toLowerCase();
          return val === 'billing:action_center' || val.endsWith(':action_center');
        });
        if (actionCenterPerm || !result.digital_wallet || result.digital_wallet.length === 0) {
          result.digital_wallet = [
            {
              _id: 'billing:action_center',
              name: 'billing:action_center',
              code: 'billing:action_center',
              permissionAliases: ['billing:action_center'],
              description: 'Resident wallet top-ups, pre-paid passes, transfer balance, and personal ledger',
            },
          ];
        }
        return;
      }
      result[lowerKey] = perms || [];
    });

    return result;
  }, [groupedPermissions]);

  const categories = React.useMemo(() => {
    return Object.keys(normalizedGroupedPermissions).sort((a, b) => {
      const orderA = CATEGORY_ORDER[a.toLowerCase()] ?? 99;
      const orderB = CATEGORY_ORDER[b.toLowerCase()] ?? 99;
      return orderA - orderB;
    });
  }, [normalizedGroupedPermissions]);

  if (!groupedPermissions || Object.keys(groupedPermissions).length === 0) {
    return (
      <div className="text-center text-gray-500 py-6 text-sm">
        No permissions found in the system.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {categories.map((category) => {
        let perms = normalizedGroupedPermissions[category] || [];
        
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
        
        const groupCodes = perms.map((p) => p.name || p.code || p._id);
        const isAllGroupSelected = groupCodes.length > 0 && perms.every((p) => isPermissionSelected(p, selectedIds));

        return (
          <div key={category} className="border border-stroke dark:border-strokedark rounded-md bg-white dark:bg-boxdark p-4 shadow-sm mb-2">
            <div className="flex justify-between items-center border-b border-stroke dark:border-strokedark pb-3 mb-4">
              <h6 className="font-bold text-sm text-black dark:text-white">
                {getCategoryDisplayName(category)}
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
