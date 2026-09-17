/**
 * Amenity Role Builder — Phase 2 Unit Tests
 * Validates the new Amenity Management v2 feature assignments across tiers:
 * - Resident: exactly 3 permissions
 * - Security Guard: exactly 2 permissions
 * - Admin: exactly 6 permissions
 * - None: 0 permissions
 * Also verifies tier transition isolation, zero accumulation, non-amenity preservation,
 * and deterministic initial tier detection.
 */

import { renderHook, act } from '@testing-library/react-native';
import {
  AMENITY_V2_TIER_PERMISSIONS,
  detectInitialAmenityTier,
  useRoleForm,
} from '../hooks/useRoleForm';

describe('Amenity Role Builder — Phase 2 Feature Assignment Matrix', () => {
  describe('1. Exact Tier Permission Contracts', () => {
    it('Resident tier has exactly 3 permissions, with zero Admin and zero Guard permissions', () => {
      const perms = AMENITY_V2_TIER_PERMISSIONS.resident;
      expect(perms).toHaveLength(3);
      expect(perms).toContain('amenities:discover');
      expect(perms).toContain('amenities:my_booking');
      expect(perms).toContain('amenities:wallet');

      // Ensure zero admin permissions
      expect(perms).not.toContain('amenities:amenities');
      expect(perms).not.toContain('amenities:admin_calander');
      expect(perms).not.toContain('amenities:maintenance');
      expect(perms).not.toContain('amenities:settings');
      expect(perms).not.toContain('amenities:dashboard');
      expect(perms).not.toContain('amenities:ledgers');

      // Ensure zero guard permissions
      expect(perms).not.toContain('amenities:scanner');
      expect(perms).not.toContain('amenities:security_logs');
    });

    it('Security Guard tier has exactly 2 permissions, with zero Resident and zero Admin permissions', () => {
      const perms = AMENITY_V2_TIER_PERMISSIONS.security_guard;
      expect(perms).toHaveLength(2);
      expect(perms).toContain('amenities:scanner');
      expect(perms).toContain('amenities:security_logs');

      // Ensure zero resident permissions
      expect(perms).not.toContain('amenities:discover');
      expect(perms).not.toContain('amenities:my_booking');
      expect(perms).not.toContain('amenities:wallet');

      // Ensure zero admin permissions
      expect(perms).not.toContain('amenities:amenities');
      expect(perms).not.toContain('amenities:admin_calander');
      expect(perms).not.toContain('amenities:maintenance');
      expect(perms).not.toContain('amenities:settings');
      expect(perms).not.toContain('amenities:dashboard');
      expect(perms).not.toContain('amenities:ledgers');
    });

    it('Admin tier has exactly 6 permissions, with zero Resident and zero Guard permissions', () => {
      const perms = AMENITY_V2_TIER_PERMISSIONS.admin;
      expect(perms).toHaveLength(6);
      expect(perms).toContain('amenities:amenities');
      expect(perms).toContain('amenities:admin_calander');
      expect(perms).toContain('amenities:maintenance');
      expect(perms).toContain('amenities:settings');
      expect(perms).toContain('amenities:dashboard');
      expect(perms).toContain('amenities:ledgers');

      // Ensure zero resident permissions
      expect(perms).not.toContain('amenities:discover');
      expect(perms).not.toContain('amenities:my_booking');
      expect(perms).not.toContain('amenities:wallet');

      // Ensure zero guard permissions
      expect(perms).not.toContain('amenities:scanner');
      expect(perms).not.toContain('amenities:security_logs');
    });

    it('None tier has exactly 0 permissions', () => {
      expect(AMENITY_V2_TIER_PERMISSIONS.none).toEqual([]);
      expect(AMENITY_V2_TIER_PERMISSIONS.none).toHaveLength(0);
    });
  });

  describe('2. Deterministic Initial Tier Detection', () => {
    it('detects resident tier from resident amenity permissions', () => {
      const perms = ['visitor:resident', 'amenities:discover', 'amenities:my_booking', 'amenities:wallet'];
      expect(detectInitialAmenityTier(perms)).toBe('resident');
    });

    it('detects security_guard tier from security guard amenity permissions', () => {
      const perms = ['visitor:guard', 'amenities:scanner', 'amenities:security_logs'];
      expect(detectInitialAmenityTier(perms)).toBe('security_guard');
    });

    it('detects admin tier from admin amenity permissions', () => {
      const perms = [
        'amenities:amenities',
        'amenities:admin_calander',
        'amenities:maintenance',
        'amenities:settings',
        'amenities:dashboard',
        'amenities:ledgers',
      ];
      expect(detectInitialAmenityTier(perms)).toBe('admin');
    });

    it('returns none when permissions array is empty or has no amenity permissions', () => {
      expect(detectInitialAmenityTier([])).toBe('none');
      expect(detectInitialAmenityTier(['visitor:resident', 'notices:read'])).toBe('none');
    });

    it('returns none safely when ambiguous/mixed amenity permissions are present', () => {
      const mixed = ['amenities:discover', 'amenities:scanner'];
      expect(detectInitialAmenityTier(mixed)).toBe('none');
    });
  });

  describe('3. Tier Transitions & Zero Accumulation via useRoleForm Hook', () => {
    const nonAmenity = ['visitor:resident', 'complaints:read'];

    it('correctly sets initial amenity tier when role is passed', async () => {
      const initialRole = {
        name: 'Resident Role',
        description: 'Testing',
        permissions: [...nonAmenity, ...AMENITY_V2_TIER_PERMISSIONS.resident],
      };

      const { result } = await renderHook(() =>
        useRoleForm({ role: initialRole, visible: true, onSave: jest.fn() })
      );

      expect(result.current.amenityTier).toBe('resident');
      expect(result.current.selectedPermissions).toEqual(
        expect.arrayContaining([...nonAmenity, ...AMENITY_V2_TIER_PERMISSIONS.resident])
      );
    });

    it('transitions Resident -> Admin cleanly with zero residue and non-amenity preservation', async () => {
      const initialRole = {
        name: 'Resident Role',
        description: 'Testing',
        permissions: [...nonAmenity, ...AMENITY_V2_TIER_PERMISSIONS.resident],
      };

      const { result } = await renderHook(() =>
        useRoleForm({ role: initialRole, visible: true, onSave: jest.fn() })
      );

      await act(async () => {
        result.current.handleTogglePermission('amenities_tier:admin', true);
      });

      expect(result.current.amenityTier).toBe('admin');
      // Preserves non-amenity
      nonAmenity.forEach((p) => {
        expect(result.current.selectedPermissions).toContain(p);
      });
      // Zero resident amenity permissions remain
      AMENITY_V2_TIER_PERMISSIONS.resident.forEach((p) => {
        expect(result.current.selectedPermissions).not.toContain(p);
      });
      // Exactly 6 admin amenity permissions
      const activeAmenityPerms = result.current.selectedPermissions.filter((p) =>
        p.startsWith('amenities:')
      );
      expect(activeAmenityPerms).toHaveLength(6);
      expect(activeAmenityPerms.sort()).toEqual([...AMENITY_V2_TIER_PERMISSIONS.admin].sort());
    });

    it('transitions Admin -> Security Guard cleanly with zero accumulation', async () => {
      const initialRole = {
        name: 'Admin Role',
        description: 'Testing',
        permissions: [...nonAmenity, ...AMENITY_V2_TIER_PERMISSIONS.admin],
      };

      const { result } = await renderHook(() =>
        useRoleForm({ role: initialRole, visible: true, onSave: jest.fn() })
      );

      await act(async () => {
        result.current.handleTogglePermission('amenities_tier:security_guard', true);
      });

      expect(result.current.amenityTier).toBe('security_guard');
      // Preserves non-amenity
      nonAmenity.forEach((p) => {
        expect(result.current.selectedPermissions).toContain(p);
      });
      // Zero admin amenity permissions remain
      AMENITY_V2_TIER_PERMISSIONS.admin.forEach((p) => {
        expect(result.current.selectedPermissions).not.toContain(p);
      });
      // Exactly 2 security guard permissions
      const activeAmenityPerms = result.current.selectedPermissions.filter((p) =>
        p.startsWith('amenities:')
      );
      expect(activeAmenityPerms).toHaveLength(2);
      expect(activeAmenityPerms.sort()).toEqual([...AMENITY_V2_TIER_PERMISSIONS.security_guard].sort());
    });

    it('transitions Security Guard -> Resident cleanly with zero accumulation', async () => {
      const initialRole = {
        name: 'Guard Role',
        description: 'Testing',
        permissions: [...nonAmenity, ...AMENITY_V2_TIER_PERMISSIONS.security_guard],
      };

      const { result } = await renderHook(() =>
        useRoleForm({ role: initialRole, visible: true, onSave: jest.fn() })
      );

      await act(async () => {
        result.current.handleTogglePermission('amenities_tier:resident', true);
      });

      expect(result.current.amenityTier).toBe('resident');
      // Preserves non-amenity
      nonAmenity.forEach((p) => {
        expect(result.current.selectedPermissions).toContain(p);
      });
      // Zero guard amenity permissions remain
      AMENITY_V2_TIER_PERMISSIONS.security_guard.forEach((p) => {
        expect(result.current.selectedPermissions).not.toContain(p);
      });
      // Exactly 3 resident permissions
      const activeAmenityPerms = result.current.selectedPermissions.filter((p) =>
        p.startsWith('amenities:')
      );
      expect(activeAmenityPerms).toHaveLength(3);
      expect(activeAmenityPerms.sort()).toEqual([...AMENITY_V2_TIER_PERMISSIONS.resident].sort());
    });

    it('transitions Resident -> None cleanly removing all amenity permissions', async () => {
      const initialRole = {
        name: 'Resident Role',
        description: 'Testing',
        permissions: [...nonAmenity, ...AMENITY_V2_TIER_PERMISSIONS.resident],
      };

      const { result } = await renderHook(() =>
        useRoleForm({ role: initialRole, visible: true, onSave: jest.fn() })
      );

      await act(async () => {
        result.current.handleTogglePermission('amenities_tier:none', true);
      });

      expect(result.current.amenityTier).toBe('none');
      // Non-amenity preserved
      expect(result.current.selectedPermissions).toEqual(nonAmenity);
      // Zero amenity permissions
      const activeAmenityPerms = result.current.selectedPermissions.filter((p) =>
        p.startsWith('amenities:')
      );
      expect(activeAmenityPerms).toHaveLength(0);
    });

    it('transitions None -> Admin cleanly injecting only the 6 admin permissions', async () => {
      const initialRole = {
        name: 'Basic Role',
        description: 'Testing',
        permissions: [...nonAmenity],
      };

      const { result } = await renderHook(() =>
        useRoleForm({ role: initialRole, visible: true, onSave: jest.fn() })
      );

      expect(result.current.amenityTier).toBe('none');

      await act(async () => {
        result.current.handleTogglePermission('amenities_tier:admin', true);
      });

      expect(result.current.amenityTier).toBe('admin');
      // Non-amenity preserved
      nonAmenity.forEach((p) => {
        expect(result.current.selectedPermissions).toContain(p);
      });
      // Exactly 6 admin permissions injected
      const activeAmenityPerms = result.current.selectedPermissions.filter((p) =>
        p.startsWith('amenities:')
      );
      expect(activeAmenityPerms).toHaveLength(6);
      expect(activeAmenityPerms.sort()).toEqual([...AMENITY_V2_TIER_PERMISSIONS.admin].sort());
    });
  });
});
