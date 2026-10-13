import { InviteUserData } from '../services/userService';

describe('User Management Staff Convergence & Dual-Scope Roles (Mobile)', () => {
  const isStaffRole = (roleName?: string) => {
    if (!roleName) return false;
    const lower = roleName.toLowerCase();
    return (
      lower.includes('staff') ||
      lower.includes('vendor') ||
      lower.includes('technician') ||
      lower.includes('maintenance') ||
      lower.includes('maid') ||
      lower.includes('driver') ||
      lower.includes('cook') ||
      lower.includes('gardener') ||
      lower.includes('electrician') ||
      lower.includes('plumber') ||
      lower.includes('carpenter') ||
      lower.includes('cleaner') ||
      lower.includes('housekeeping')
    );
  };

  it('correctly identifies Community Staff and Household Staff as staff roles', () => {
    expect(isStaffRole('Community Staff')).toBe(true);
    expect(isStaffRole('Household Staff')).toBe(true);
    expect(isStaffRole('Maid')).toBe(true);
    expect(isStaffRole('Driver')).toBe(true);
    expect(isStaffRole('Plumber')).toBe(true);
    expect(isStaffRole('Electrician')).toBe(true);
  });

  it('correctly identifies non-staff resident roles', () => {
    expect(isStaffRole('Resident Owner')).toBe(false);
    expect(isStaffRole('Resident Tenant')).toBe(false);
    expect(isStaffRole('Family Member')).toBe(false);
    expect(isStaffRole('Super Admin')).toBe(false);
  });

  it('allows optional unit assignment for Community Staff (Global)', () => {
    const invitePayload: InviteUserData = {
      email: 'facility.tech@community.com',
      name: 'Facility Tech',
      phone: '+966500000001',
      roleName: 'Community Staff',
      villaId: null,
      staffData: {
        isStaff: true,
        department: 'Maintenance',
        staffType: 'In-House Staff',
        designation: 'Electrician',
        staffCode: 'STF-ELEC-01',
      },
    };

    expect(invitePayload.villaId).toBeNull();
    expect(invitePayload.staffData?.isStaff).toBe(true);
    expect(invitePayload.staffData?.department).toBe('Maintenance');
  });

  it('supports unit-scoped Household Staff with assigned villaId', () => {
    const invitePayload: InviteUserData = {
      email: 'maid@resident.com',
      name: 'Maria Maid',
      phone: '+966500000002',
      roleName: 'Household Staff',
      villaId: 'villa-unit-101',
      staffData: {
        isStaff: true,
        department: 'Others',
        staffType: 'In-House Staff',
        designation: 'Maid',
      },
    };

    expect(invitePayload.villaId).toBe('villa-unit-101');
    expect(invitePayload.staffData?.isStaff).toBe(true);
    expect(invitePayload.staffData?.designation).toBe('Maid');
  });

  it('validates row logic: requires villa for resident tenant but allows empty villa for household staff', () => {
    const validateUnitRequirement = (roleName: string, isTenantRole: boolean, villaId?: string) => {
      const isStaff = isStaffRole(roleName);
      if (isTenantRole && !isStaff && !villaId) {
        return { isValid: false, error: 'Select a Unit for this role' };
      }
      return { isValid: true };
    };

    // Resident Tenant is tenant-scoped and non-staff => requires villa
    expect(validateUnitRequirement('Resident Tenant', true, undefined).isValid).toBe(false);
    expect(validateUnitRequirement('Resident Tenant', true, 'villa-101').isValid).toBe(true);

    // Household Staff is tenant-scoped, but staff => villa is optional
    expect(validateUnitRequirement('Household Staff', true, undefined).isValid).toBe(true);
    expect(validateUnitRequirement('Household Staff', true, 'villa-101').isValid).toBe(true);

    // Community Staff is global => villa is optional
    expect(validateUnitRequirement('Community Staff', false, undefined).isValid).toBe(true);
  });
});
