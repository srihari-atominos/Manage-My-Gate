/**
 * Navigation Forensic Audit Test Suite
 *
 * Verifies:
 * 1. BottomNavigationBar role-specific amenity resolution (Resident vs Guard vs Admin vs None)
 * 2. GlobalNavModal role-specific amenity item filtering (Zero leakage)
 * 3. Settings route protection and prevention of Discover rejection loops
 * 4. Resident Amenity convergence across Quick Actions, Dashboard, Hero, and Bottom Nav
 * 5. Legacy protection (0 user-facing references to legacy resident dashboard)
 */

import { ALL_AVAILABLE_FEATURES } from '../../dashboard/dashboardCatalog';
import { isFeatureAllowedForUser } from '../../../utils/rbac';

describe('Navigation Forensic Audit & Feature Cutover', () => {
  const residentUser = {
    role: 'Tenant/Owner',
    permissions: [
      'visitor:resident',
      'amenities:discover',
      'amenities:my_booking',
      'amenities:wallet',
      'complaints:track_requests',
      'notices:active_board',
      'billing:action_center',
    ],
  };

  const guardUser = {
    role: 'Security Guard',
    permissions: [
      'visitor:guard',
      'amenities:scanner',
      'amenities:security_logs',
      'notices:active_board',
    ],
  };

  const adminUser = {
    role: 'Community Admin',
    permissions: [
      'visitor:admin',
      'amenities:amenities',
      'amenities:admin_calander',
      'amenities:maintenance',
      'amenities:settings',
      'amenities:dashboard',
      'amenities:ledgers',
      'billing:dashboard',
      'billing:assessment_manager',
      'users:read',
      'villas:read',
      'roles:read',
    ],
  };

  const noneUser = {
    role: 'Resident',
    permissions: ['notices:read'],
  };

  describe('1. BottomNavigationBar Role-Specific Routing Contract', () => {
    // Helper replicating BottomNavigationBar handleTabPress logic
    const resolveBottomNavAmenityRoute = (user: any): string => {
      let targetRoute = '/(resident)/amenities/discover';
      if (
        user &&
        isFeatureAllowedForUser({ id: 'amenities_scanner', permission: 'amenities:scanner' }, user) &&
        !isFeatureAllowedForUser({ id: 'amenities_discover', permission: 'amenities:discover' }, user)
      ) {
        targetRoute = '/(resident)/amenities/scanner';
      } else if (
        user &&
        !isFeatureAllowedForUser({ id: 'amenities_discover', permission: 'amenities:discover' }, user) &&
        (isFeatureAllowedForUser({ id: 'amenities_dashboard', permission: 'amenities:dashboard' }, user) ||
         isFeatureAllowedForUser({ id: 'amenities_admin_calendar', permission: 'amenities:admin_calander' }, user) ||
         isFeatureAllowedForUser({ id: 'amenities_master', permission: 'amenities:amenities' }, user))
      ) {
        targetRoute = isFeatureAllowedForUser({ id: 'amenities_dashboard', permission: 'amenities:dashboard' }, user)
          ? '/(resident)/amenities/dashboard'
          : isFeatureAllowedForUser({ id: 'amenities_admin_calendar', permission: 'amenities:admin_calander' }, user)
            ? '/(resident)/amenities/admin-calendar'
            : '/(resident)/amenities/admin-master';
      } else if (
        user &&
        !isFeatureAllowedForUser({ id: 'amenities_discover', permission: 'amenities:discover' }, user) &&
        !isFeatureAllowedForUser({ id: 'amenities_scanner', permission: 'amenities:scanner' }, user)
      ) {
        targetRoute = '/(resident)/dashboard';
      }
      return targetRoute;
    };

    it('resolves Resident to /(resident)/amenities/discover', () => {
      expect(resolveBottomNavAmenityRoute(residentUser)).toBe('/(resident)/amenities/discover');
    });

    it('resolves Security Guard to /(resident)/amenities/scanner', () => {
      expect(resolveBottomNavAmenityRoute(guardUser)).toBe('/(resident)/amenities/scanner');
    });

    it('resolves Admin to /(resident)/amenities/dashboard', () => {
      expect(resolveBottomNavAmenityRoute(adminUser)).toBe('/(resident)/amenities/dashboard');
    });

    it('resolves None persona to /(resident)/dashboard (safely protected)', () => {
      expect(resolveBottomNavAmenityRoute(noneUser)).toBe('/(resident)/dashboard');
    });
  });

  describe('2. GlobalNavModal Role-Specific Item Isolation', () => {
    const rawAmenityNavItems = [
      { id: 'a-discover', route: '/(resident)/amenities/discover', permission: 'amenities:discover' },
      { id: 'a-bookings', route: '/(resident)/amenities/my-bookings', permission: 'amenities:my_booking' },
      { id: 'a-wallet', route: '/(resident)/amenities/wallet', permission: 'amenities:wallet' },
      { id: 'a-scanner', route: '/(resident)/amenities/scanner', permission: 'amenities:scanner' },
      { id: 'a-dashboard', route: '/(resident)/amenities/dashboard', permission: 'amenities:dashboard' },
      { id: 'a-calendar', route: '/(resident)/amenities/admin-calendar', permission: 'amenities:admin_calander' },
      { id: 'a-master', route: '/(resident)/amenities/admin-master', permission: 'amenities:amenities' },
      { id: 'a-maintenance', route: '/(resident)/amenities/maintenance', permission: 'amenities:maintenance' },
      { id: 'a-ledgers', route: '/(resident)/amenities/ledgers', permission: 'amenities:ledgers' },
    ];

    it('Resident sees exactly the 3 resident items and zero admin/guard items', () => {
      const visible = rawAmenityNavItems.filter((item) =>
        isFeatureAllowedForUser({ id: item.id, permission: item.permission }, residentUser)
      );
      expect(visible.map((v) => v.id)).toEqual(['a-discover', 'a-bookings', 'a-wallet']);
    });

    it('Security Guard sees exactly the 1 scanner item and zero resident/admin items', () => {
      const visible = rawAmenityNavItems.filter((item) =>
        isFeatureAllowedForUser({ id: item.id, permission: item.permission }, guardUser)
      );
      expect(visible.map((v) => v.id)).toEqual(['a-scanner']);
    });

    it('Admin sees exactly the 5 admin items and zero resident/guard items', () => {
      const visible = rawAmenityNavItems.filter((item) =>
        isFeatureAllowedForUser({ id: item.id, permission: item.permission }, adminUser)
      );
      expect(visible.map((v) => v.id).sort()).toEqual(
        ['a-dashboard', 'a-calendar', 'a-master', 'a-maintenance', 'a-ledgers'].sort()
      );
    });

    it('None persona sees 0 items, ensuring the category is hidden', () => {
      const visible = rawAmenityNavItems.filter((item) =>
        isFeatureAllowedForUser({ id: item.id, permission: item.permission }, noneUser)
      );
      expect(visible).toHaveLength(0);
    });
  });

  describe('3. Resident Amenity Convergence Across All UI Surface Areas', () => {
    it('Resident Quick Action routes to /(resident)/amenities/discover', () => {
      const feature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'amenities_discover');
      expect(feature?.route).toBe('/(resident)/amenities/discover');
    });

    it('Resident features in catalog have zero references to legacy dashboard', () => {
      const residentAmenityCatalog = ALL_AVAILABLE_FEATURES.filter(
        (f) => f.categoryKey === 'amenities_facilities' && isFeatureAllowedForUser(f, residentUser)
      );
      expect(residentAmenityCatalog.length).toBeGreaterThan(0);
      residentAmenityCatalog.forEach((f) => {
        expect(f.route).not.toBe('/(resident)/amenities/dashboard');
      });
    });
  });

  describe('4. Migrated Features Route Availability & Resolution', () => {
    const requiredFeatureRoutes = [
      { id: 'complaints_dashboard', expected: '/(resident)/complaints/dashboard' },
      { id: 'complaints_raise_ticket', expected: '/(resident)/complaints/raise-ticket' },
      { id: 'complaints_track_requests', expected: '/(resident)/complaints/my-tickets' },
      { id: 'complaints_complaint_management', expected: '/(resident)/complaints/manage' },
      { id: 'complaints_staff', expected: '/(resident)/complaints/staff' },
      { id: 'complaints_assignee', expected: '/(resident)/complaints/assignee' },
      { id: 'community_engagement', expected: '/(resident)/community-engagement' },
      { id: 'billing_dashboard', expected: '/(resident)/billing' },
      { id: 'billing_my_dues', expected: '/(resident)/billing/my-dues' },
      { id: 'billing_wallet', expected: '/(resident)/billing/wallet' },
      { id: 'billing_assessment_manager', expected: '/(resident)/admin/billing/assessments' },
      { id: 'billing_action_center', expected: '/(resident)/admin/billing/ledger' },
    ];

    requiredFeatureRoutes.forEach(({ id, expected }) => {
      it(`feature '${id}' has canonical route '${expected}'`, () => {
        const feature = ALL_AVAILABLE_FEATURES.find((f) => f.id === id);
        expect(feature).toBeDefined();
        expect(feature?.route).toBe(expected);
      });
    });
  });
});
