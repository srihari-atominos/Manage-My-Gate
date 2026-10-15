/** Staff directory categories (mirrors backend technician/staffCategory.utils.js). */
export type StaffCategory = 'COMMUNITY' | 'UNIT';

export const STAFF_CATEGORY_OPTIONS: { label: string; value: StaffCategory; description: string }[] = [
  {
    value: 'COMMUNITY',
    label: 'Community Staff (Global Staff)',
    description: 'Takes community complaints & maintenance work, with staff portal, gate pass and attendance.',
  },
  {
    value: 'UNIT',
    label: 'Unit Staff (Internal Staff)',
    description: 'Works only on the units residents allocate them to.',
  },
];

interface Categorised {
  staffCategory?: StaffCategory | string | null;
  communityOnly?: boolean;
}

// Records saved before categories existed are community staff.
export const staffCategoryOf = (staff?: Categorised | null): StaffCategory =>
  staff?.staffCategory === 'UNIT' ? 'UNIT' : 'COMMUNITY';

export const staffCategoryLabel = (staff?: Categorised | null): string => {
  if (staffCategoryOf(staff) === 'UNIT') return 'Unit Staff';
  return staff?.communityOnly ? 'Community Staff · Community only' : 'Community Staff';
};

/** Can the admin assign this staff member to community complaints / maintenance? */
export const isCommunityAssignable = (staff?: Categorised | null) => staffCategoryOf(staff) === 'COMMUNITY';
