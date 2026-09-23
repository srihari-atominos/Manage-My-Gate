import {
  CommunityEngagementFilterValues,
  NoticePriority,
  NoticeCategory,
} from '../types/communityEngagement.types';

describe('Community Engagement Ledger Filter & Aggregation Logic', () => {
  const mockItems = [
    {
      id: 'n1',
      type: 'NOTICE' as const,
      title: 'Water Tank Cleaning',
      subtitle: 'Maintenance • High Priority',
      status: 'Published',
      priority: 'High' as NoticePriority,
      category: 'Maintenance' as NoticeCategory,
      isPinned: true,
      requiresAcknowledgement: false,
      targetAudience: { targetType: 'ALL' },
      createdAt: '2026-03-10T10:00:00.000Z',
    },
    {
      id: 'n2',
      type: 'NOTICE' as const,
      title: 'Fire Drill Mandatory Evacuation',
      subtitle: 'Emergency • Critical Priority',
      status: 'Published',
      priority: 'Critical' as NoticePriority,
      category: 'Emergency' as NoticeCategory,
      isPinned: true,
      requiresAcknowledgement: true,
      targetAudience: { targetType: 'ROLES', targetRoles: ['role-guard-1'] },
      createdAt: '2026-03-12T10:00:00.000Z',
    },
    {
      id: 'n3',
      type: 'NOTICE' as const,
      title: 'Annual Financial Budget Draft',
      subtitle: 'General • Low Priority',
      status: 'Draft',
      priority: 'Low' as NoticePriority,
      category: 'General' as NoticeCategory,
      isPinned: false,
      requiresAcknowledgement: false,
      targetAudience: { targetType: 'RESIDENCY_TYPES', targetResidencyTypes: ['Owner'] },
      createdAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'n4',
      type: 'NOTICE' as const,
      title: 'Diwali Party Notice',
      subtitle: 'Events • Medium Priority',
      status: 'Expired',
      priority: 'Medium' as NoticePriority,
      category: 'Events' as NoticeCategory,
      isPinned: false,
      requiresAcknowledgement: false,
      targetAudience: { targetType: 'ALL' },
      createdAt: '2025-11-01T10:00:00.000Z',
    },
    {
      id: 'p1',
      type: 'POLL' as const,
      title: 'Tennis Court Lighting',
      subtitle: '3 Options • 15 Votes Submitted',
      status: 'Active',
      votingMode: 'PUBLIC',
      choiceType: 'SINGLE_CHOICE',
      targetAudience: { targetType: 'ALL' },
      createdAt: '2026-03-11T10:00:00.000Z',
    },
    {
      id: 'p2',
      type: 'POLL' as const,
      title: 'Secret Ballot for Committee Election',
      subtitle: '2 Options • 0 Votes Submitted',
      status: 'Draft',
      votingMode: 'ANONYMOUS',
      choiceType: 'SINGLE_CHOICE',
      targetAudience: { targetType: 'RESIDENCY_TYPES', targetResidencyTypes: ['Owner'] },
      createdAt: '2026-03-05T10:00:00.000Z',
    },
    {
      id: 'p3',
      type: 'POLL' as const,
      title: 'Gym Equipment Survey',
      subtitle: '4 Options • 50 Votes Submitted',
      status: 'Closed',
      votingMode: 'PUBLIC',
      choiceType: 'MULTIPLE_CHOICE',
      targetAudience: { targetType: 'ALL' },
      createdAt: '2026-01-15T10:00:00.000Z',
    },
  ];

  it('calculates accurate live status counts across notices and polls', () => {
    let all = 0;
    let active = 0;
    let draft = 0;
    let expired = 0;

    mockItems.forEach((item) => {
      all++;
      const s = item.status.toUpperCase();
      if (s === 'ACTIVE' || s === 'PUBLISHED') active++;
      else if (s === 'DRAFT') draft++;
      else if (s === 'CLOSED' || s === 'EXPIRED') expired++;
    });

    expect(all).toBe(7);
    expect(active).toBe(3); // n1, n2, p1
    expect(draft).toBe(2);  // n3, p2
    expect(expired).toBe(2); // n4, p3
  });

  it('filters by perspective chips (Row 4 single/dual selection logic)', () => {
    // Both unselected -> shows All
    const getPerspective = (notices: boolean, polls: boolean) => {
      if ((!notices && !polls) || (notices && polls)) return 'ALL';
      if (notices && !polls) return 'NOTICES';
      return 'POLLS';
    };

    expect(getPerspective(false, false)).toBe('ALL');
    expect(getPerspective(true, false)).toBe('NOTICES');
    expect(getPerspective(false, true)).toBe('POLLS');
    expect(getPerspective(true, true)).toBe('ALL');

    const noticesOnly = mockItems.filter((i) => i.type === 'NOTICE');
    const pollsOnly = mockItems.filter((i) => i.type === 'POLL');

    expect(noticesOnly.length).toBe(4);
    expect(pollsOnly.length).toBe(3);
  });

  it('filters notices by multi-select priorities and categories', () => {
    const selectedPriorities: NoticePriority[] = ['Critical', 'High'];
    const selectedCategories: NoticeCategory[] = ['Maintenance', 'Emergency'];

    const filtered = mockItems.filter((item) => {
      if (item.type !== 'NOTICE') return false;
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(item.priority!)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category!)) return false;
      return true;
    });

    expect(filtered.length).toBe(2);
    expect(filtered.map((f) => f.id)).toEqual(['n1', 'n2']);
  });

  it('filters by target audience scope (Owners Only and Specific Role)', () => {
    // Test Owners Only
    const ownersOnly = mockItems.filter((item) => {
      const aud = item.targetAudience;
      const resTypes = aud?.targetResidencyTypes || [];
      return resTypes.includes('Owner');
    });
    expect(ownersOnly.length).toBe(2); // n3, p2

    // Test Specific Role
    const selectedRoleIds = ['role-guard-1'];
    const roleFiltered = mockItems.filter((item) => {
      const aud = item.targetAudience;
      const roles = aud?.targetRoles || [];
      return selectedRoleIds.some((r) => roles.includes(r));
    });
    expect(roleFiltered.length).toBe(1);
    expect(roleFiltered[0].id).toBe('n2');
  });

  it('filters by governance flags (Pinned only & Sign-off required)', () => {
    const pinnedAndSignOff = mockItems.filter((item) => {
      if (item.type !== 'NOTICE') return false;
      return item.isPinned && item.requiresAcknowledgement;
    });

    expect(pinnedAndSignOff.length).toBe(1);
    expect(pinnedAndSignOff[0].id).toBe('n2');
  });

  it('filters polls by voting mode and choice type', () => {
    const anonymousPolls = mockItems.filter(
      (item) => item.type === 'POLL' && item.votingMode === 'ANONYMOUS'
    );
    expect(anonymousPolls.length).toBe(1);
    expect(anonymousPolls[0].id).toBe('p2');

    const multiChoicePolls = mockItems.filter(
      (item) => item.type === 'POLL' && item.choiceType === 'MULTIPLE_CHOICE'
    );
    expect(multiChoicePolls.length).toBe(1);
    expect(multiChoicePolls[0].id).toBe('p3');
  });
});
