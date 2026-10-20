import { isFeatureAllowedForUser } from '../rbac';

const complaints = [
  ['complaints_dashboard', 'complaints:dashboard'],
  ['complaints_raise_ticket', 'complaints:raise_ticket'],
  ['complaints_track_requests', 'complaints:track_requests'],
  ['complaints_complaint_management', 'complaints:complaint_management'],
  ['complaints_staff', 'complaints:staff'],
  ['complaints_assignee', 'complaints:assignee'],
] as const;

describe('Complaints dashboard RBAC', () => {
  it('shows only the individual cards selected in Role Builder', () => {
    const user = {
      role: 'Community Admin',
      permissions: ['complaints', 'complaints:complaint_management', 'complaints:staff', 'complaints:assignee'],
    };

    const visible = complaints
      .filter(([id, permission]) => isFeatureAllowedForUser({ id, permission, categoryKey: 'complaints_helpdesk' }, user))
      .map(([id]) => id);

    expect(visible).toEqual([
      'complaints_complaint_management',
      'complaints_staff',
      'complaints_assignee',
    ]);
  });

  it('does not treat a broad complaints grant as every dashboard permission', () => {
    const user = { role: 'Community Admin', permissions: ['complaints'] };

    for (const [id, permission] of complaints) {
      expect(isFeatureAllowedForUser({ id, permission, categoryKey: 'complaints_helpdesk' }, user)).toBe(false);
    }
  });
});
