import { isFeatureAllowedForUser } from '@/src/utils/rbac';
const feature = { id: 'personal_expense_manager' };
describe('personal expense visibility', () => {
  it('allows resident community users only', () => { expect(isFeatureAllowedForUser(feature, { role: 'Resident' })).toBe(true); expect(isFeatureAllowedForUser(feature, { role: 'Tenant' })).toBe(true); });
  it('excludes security, facility, admin, and platform users', () => { expect(isFeatureAllowedForUser(feature, { role: 'Security Guard' })).toBe(false); expect(isFeatureAllowedForUser(feature, { role: 'Facility Manager' })).toBe(false); expect(isFeatureAllowedForUser(feature, { role: 'Community Admin' })).toBe(false); expect(isFeatureAllowedForUser(feature, { role: 'Resident', isPlatform: true })).toBe(false); });
});