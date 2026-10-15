/** Staff directory categories (mirrors backend technician/staffCategory.utils.js). */
export const STAFF_CATEGORY_OPTIONS = [
  {
    value: 'COMMUNITY',
    label: 'Community Staff (Global Staff)',
    shortLabel: 'Community Staff',
    description: 'Takes community complaints & maintenance work, with staff portal, gate pass and attendance.',
  },
  {
    value: 'UNIT',
    label: 'Unit Staff (Internal Staff)',
    shortLabel: 'Unit Staff',
    description: 'Works only on the units residents allocate them to.',
  },
]

// Records saved before categories existed are community staff.
export const staffCategoryOf = (staff) => (staff?.staffCategory === 'UNIT' ? 'UNIT' : 'COMMUNITY')

export const staffCategoryLabel = (staff) => {
  const category = staffCategoryOf(staff)
  if (category === 'UNIT') return 'Unit Staff'
  return staff?.communityOnly ? 'Community Staff · Community only' : 'Community Staff · Community & residents'
}

/** Can the admin assign this staff member to community complaints / maintenance? */
export const isCommunityAssignable = (staff) => staffCategoryOf(staff) === 'COMMUNITY'
