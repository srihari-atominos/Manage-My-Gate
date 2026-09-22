/**
 * Audience targeting constants.
 */

export const AUDIENCE_TARGET_TYPES = Object.freeze({
  ALL: 'ALL',
  ROLES: 'ROLES',
  BLOCKS: 'BLOCKS',
  UNITS: 'UNITS',
  RESIDENCY_TYPES: 'RESIDENCY_TYPES',
  CUSTOM: 'CUSTOM',
});

export const VALID_TARGET_TYPES = Object.freeze(Object.values(AUDIENCE_TARGET_TYPES));

export const DEFAULT_RESIDENCY_TYPES = Object.freeze([
  'Owner',
  'Resident Owner',
  'Non-Resident Owner',
  'Tenant',
  'Family Member',
  'Primary Resident',
  'Resident',
  'None',
]);
