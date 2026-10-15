/**
 * Staff categories in the staff directory.
 *
 * COMMUNITY – Community Staff (Global Staff). Works for the community: complaints, maintenance, gate pass and
 *             attendance. Unless `communityOnly` is set, residents may also allocate them to their unit.
 * UNIT      – Unit Staff (Internal Staff). Works only for the units a resident allocates them to; never offered
 *             for community complaint / maintenance assignment.
 */
export const STAFF_CATEGORIES = Object.freeze({ COMMUNITY: 'COMMUNITY', UNIT: 'UNIT' });
export const STAFF_CATEGORY_VALUES = Object.values(STAFF_CATEGORIES);

/** Role scopes that turn a member into a staff directory entry, and the category each one maps to. */
export const STAFF_ROLE_SCOPE_CATEGORY = Object.freeze({
  COMMUNITY_STAFF: STAFF_CATEGORIES.COMMUNITY,
  STAFF: STAFF_CATEGORIES.UNIT,
});

export const isStaffRoleScope = (scope) => Object.prototype.hasOwnProperty.call(STAFF_ROLE_SCOPE_CATEGORY, scope);

export const staffCategoryForRoleScope = (scope) => STAFF_ROLE_SCOPE_CATEGORY[scope] || null;

// Records created before categories existed have no value; they behave as community staff open to residents,
// which is exactly how every staff member behaved until now.
export const staffCategoryOf = (technician) =>
  technician?.staffCategory === STAFF_CATEGORIES.UNIT ? STAFF_CATEGORIES.UNIT : STAFF_CATEGORIES.COMMUNITY;

/** May the community admin assign this staff member to complaints / maintenance work? */
export const isCommunityAssignable = (technician) => staffCategoryOf(technician) === STAFF_CATEGORIES.COMMUNITY;

/** May a resident (or admin on a resident's behalf) allocate this staff member to a unit? */
export const isResidentAssignable = (technician) =>
  staffCategoryOf(technician) === STAFF_CATEGORIES.UNIT || !technician?.communityOnly;

/** Mongo filter for staff offered on community complaint / maintenance work. */
export const communityAssignableFilter = () => ({ staffCategory: { $ne: STAFF_CATEGORIES.UNIT } });

/** Mongo filter for staff a resident may allocate to a unit. */
export const residentAssignableFilter = () => ({
  $or: [{ staffCategory: STAFF_CATEGORIES.UNIT }, { communityOnly: { $ne: true } }],
});
