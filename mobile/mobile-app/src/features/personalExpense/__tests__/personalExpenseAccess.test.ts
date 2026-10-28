import { isFeatureAllowedForUser } from '@/src/utils/rbac';
const feature = { id: 'personal_expense_manager' };
describe('personal expense visibility', () => {
  it('disallows resident owners and tenants', () => {
    expect(isFeatureAllowedForUser(feature, { role: 'Resident Owner' })).toBe(false);
    expect(isFeatureAllowedForUser(feature, { role: 'Resident Tenant' })).toBe(false);
    expect(isFeatureAllowedForUser(feature, { role: 'Resident' })).toBe(false);
    expect(isFeatureAllowedForUser(feature, { role: 'Tenant' })).toBe(false);
  });
  it('excludes security, facility, admin, and platform users', () => {
    expect(isFeatureAllowedForUser(feature, { role: 'Security Guard' })).toBe(false);
    expect(isFeatureAllowedForUser(feature, { role: 'Facility Manager' })).toBe(false);
    expect(isFeatureAllowedForUser(feature, { role: 'Community Admin' })).toBe(false);
    expect(isFeatureAllowedForUser(feature, { role: 'Resident Owner', isPlatform: true })).toBe(false);
  });
});
