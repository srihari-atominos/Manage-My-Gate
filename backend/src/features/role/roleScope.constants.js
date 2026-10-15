/**
 * Role Scope & Tenancy Archetypes.
 *
 * GLOBAL          – community-wide management access, not bound to a unit.
 * UNIT            – bound to the villas/apartments a resident is onboarded to.
 * COMMUNITY_STAFF – Community Staff (Global Staff): community complaints / maintenance, staff portal, gate pass
 *                   and attendance; may also serve residents unless marked community-only in the staff directory.
 * STAFF           – Unit Staff (Internal Staff): works only on units residents allocate them to. The stored value
 *                   stays `STAFF` so existing roles keep working.
 */
export const ROLE_SCOPES = Object.freeze({
  GLOBAL: 'GLOBAL',
  UNIT: 'UNIT',
  COMMUNITY_STAFF: 'COMMUNITY_STAFF',
  STAFF: 'STAFF',
});

export const ROLE_SCOPE_VALUES = Object.values(ROLE_SCOPES);

export const ROLE_SCOPE_LABELS = Object.freeze({
  GLOBAL: 'Global Scope',
  UNIT: 'Unit Scope',
  COMMUNITY_STAFF: 'Community Staff (Global Staff)',
  STAFF: 'Unit Staff (Internal Staff)',
});

/** Scopes whose members are bound to units (tenant roles). */
export const isTenantScope = (scope) => scope === ROLE_SCOPES.UNIT || scope === ROLE_SCOPES.STAFF;
