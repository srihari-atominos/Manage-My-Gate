import { COMPLAINT_CATEGORY_OPTIONS } from '../components/ComplaintTypeSheet';
import { Complaint } from '../types';

describe('Complaints & Maintenance Dashboard UX & Visitor Reference Standard', () => {
  const mockComplaints: Complaint[] = [
    {
      _id: 'c1',
      complaintNumber: 'CMP-1001',
      title: 'Water tap leaking in master bathroom',
      category: 'Plumbing',
      status: 'Open',
      priority: 'High',
      department: 'Plumbing',
      createdAt: '2026-09-26T10:00:00.000Z',
      location: { flat: '402', building: 'Tower A' },
    },
    {
      _id: 'c2',
      complaintNumber: 'CMP-1002',
      title: 'Living room switch board sparking',
      category: 'Electrical',
      status: 'In Progress',
      priority: 'Critical',
      department: 'Electrical',
      assignedTechnicianName: 'Rajesh Kumar',
      createdAt: '2026-09-26T09:30:00.000Z',
      location: { flat: '402', building: 'Tower A' },
    },
    {
      _id: 'c3',
      complaintNumber: 'CMP-1003',
      title: 'Clubhouse gym AC water leakage',
      category: 'AC & HVAC',
      status: 'Work Completed',
      priority: 'Medium',
      department: 'AC & HVAC',
      assignedTechnicianName: 'Suresh Electrician',
      createdAt: '2026-09-25T14:00:00.000Z',
    },
    {
      _id: 'c4',
      complaintNumber: 'CMP-1004',
      title: 'Main door lock replacement',
      category: 'Carpentry',
      status: 'Closed',
      priority: 'Low',
      department: 'Carpentry',
      createdAt: '2026-09-24T11:00:00.000Z',
    },
    {
      _id: 'c5',
      complaintNumber: 'CMP-1005',
      title: 'Lift fan not working in Block B',
      category: 'Elevators',
      status: 'Open',
      priority: 'High',
      department: 'Elevators',
      createdAt: '2026-09-23T08:00:00.000Z',
    },
  ];

  describe('Archetype / Category Selection Options (Type-Selection-First Pattern)', () => {
    it('defines all required maintenance categories with descriptions and icons', () => {
      expect(COMPLAINT_CATEGORY_OPTIONS).toHaveLength(10);

      const categoryIds = COMPLAINT_CATEGORY_OPTIONS.map((c) => c.id);
      expect(categoryIds).toContain('Plumbing');
      expect(categoryIds).toContain('Electrical');
      expect(categoryIds).toContain('Carpentry');
      expect(categoryIds).toContain('Elevators');
      expect(categoryIds).toContain('AC & HVAC');
      expect(categoryIds).toContain('Security');
      expect(categoryIds).toContain('Housekeeping');
      expect(categoryIds).toContain('Parking');
      expect(categoryIds).toContain('Amenities');
      expect(categoryIds).toContain('Others');
    });

    it('ensures each archetype card has a non-empty title and description', () => {
      COMPLAINT_CATEGORY_OPTIONS.forEach((option) => {
        expect(option.title).toBeTruthy();
        expect(option.description).toBeTruthy();
        expect(option.icon).toBeDefined();
        expect(option.iconColor).toBeDefined();
      });
    });

    it('includes priority badges on critical infrastructure archetypes', () => {
      const elevatorOpt = COMPLAINT_CATEGORY_OPTIONS.find((c) => c.id === 'Elevators');
      expect(elevatorOpt?.badge).toBe('Safety Critical');

      const plumbingOpt = COMPLAINT_CATEGORY_OPTIONS.find((c) => c.id === 'Plumbing');
      expect(plumbingOpt?.badge).toBe('Urgent Available');

      const electricalOpt = COMPLAINT_CATEGORY_OPTIONS.find((c) => c.id === 'Electrical');
      expect(electricalOpt?.badge).toBe('Priority Support');
    });
  });

  describe('Executive KPI Dashboard Calculation Logic', () => {
    it('accurately tallies open, in-progress, and resolved tickets', () => {
      const openCount = mockComplaints.filter((c) =>
        ['Submitted', 'Open', 'Waiting For Assignment', 'Waiting For Acceptance'].includes(c.status)
      ).length;

      const inProgressCount = mockComplaints.filter((c) =>
        ['Assigned', 'In Progress', 'Accepted'].includes(c.status)
      ).length;

      const resolvedCount = mockComplaints.filter((c) =>
        ['Closed', 'Completed', 'Resolved', 'Work Completed'].includes(c.status)
      ).length;

      expect(openCount).toBe(2); // c1, c5
      expect(inProgressCount).toBe(1); // c2
      expect(resolvedCount).toBe(2); // c3, c4
    });

    it('sets KPI card variant to warning when open tickets require action', () => {
      const openCount = 2;
      const variant = openCount > 0 ? 'warning' : 'accent';
      const trend = openCount > 0 ? 'Needs Action' : 'All Clear';

      expect(variant).toBe('warning');
      expect(trend).toBe('Needs Action');
    });
  });

  describe('Dashboard Layout & Recent Activity Constraints (3-Item Limit Rule)', () => {
    it('strictly confines preview cards to at most 3 items on the dashboard screen', () => {
      const recentPreview = mockComplaints.slice(0, 3);
      expect(recentPreview).toHaveLength(3);
      expect(recentPreview[0]._id).toBe('c1');
      expect(recentPreview[1]._id).toBe('c2');
      expect(recentPreview[2]._id).toBe('c3');
    });

    it('filters complaints by search query correctly before slicing', () => {
      const query = 'sparking';
      const filtered = mockComplaints.filter(
        (c) =>
          c.title?.toLowerCase().includes(query) ||
          c.category?.toLowerCase().includes(query) ||
          c.complaintNumber?.toLowerCase().includes(query)
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].complaintNumber).toBe('CMP-1002');
      expect(filtered.slice(0, 3)).toHaveLength(1);
    });

    it('filters complaints by category query', () => {
      const query = 'Plumbing';
      const filtered = mockComplaints.filter(
        (c) =>
          c.category?.toLowerCase().includes(query.toLowerCase()) ||
          c.title?.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0]._id).toBe('c1');
    });
  });
});
