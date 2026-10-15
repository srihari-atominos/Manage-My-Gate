/**
 * Role Scope & Tenancy Archetypes (mirrors backend role/roleScope.constants.js).
 * `STAFF` keeps its stored value for existing roles and is presented as Unit Staff (Internal Staff).
 */
export const ROLE_SCOPE_VALUES = ['GLOBAL', 'UNIT', 'COMMUNITY_STAFF', 'STAFF']

export const ROLE_SCOPE_OPTIONS = [
  {
    value: 'GLOBAL',
    label: 'Global Scope',
    badge: 'Global',
    color: 'primary',
    description: 'Community-wide facility & management access. Unrestricted to a single unit.',
  },
  {
    value: 'UNIT',
    label: 'Unit Scope',
    badge: 'Unit Scope',
    color: 'success',
    description: 'Bound to specific villas/apartments when onboarding residents.',
  },
  {
    value: 'COMMUNITY_STAFF',
    label: 'Community Staff (Global Staff)',
    badge: 'Community Staff',
    color: 'info',
    description:
      'Community complaints & maintenance, staff portal, gate pass and attendance. Can also serve residents unless set to community only.',
    defaultPermissions: ['staff:view_own', 'complaints:assignee'],
  },
  {
    value: 'STAFF',
    label: 'Unit Staff (Internal Staff)',
    badge: 'Unit Staff',
    color: 'warning',
    description: 'Works only on the units residents allocate them to. Auto-syncs to Staff Management.',
    defaultPermissions: ['staff:view_own', 'staff:attendance', 'staff:assign_unit', 'complaints:assignee'],
  },
]

export const isTenantScope = (scope) => scope === 'UNIT' || scope === 'STAFF'

export const getRoleScopeOption = (scope) => ROLE_SCOPE_OPTIONS.find((o) => o.value === scope)
