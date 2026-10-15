/**
 * Role Scope & Tenancy Archetypes (mirrors backend role/roleScope.constants.js).
 * `STAFF` keeps its stored value for existing roles and is presented as Unit Staff (Internal Staff).
 * Class strings are written out in full so Tailwind can detect them.
 */
export const ROLE_SCOPE_VALUES = ['GLOBAL', 'UNIT', 'COMMUNITY_STAFF', 'STAFF']

export const ROLE_SCOPE_OPTIONS = [
  {
    value: 'GLOBAL',
    label: 'Global Scope',
    description: 'Community-wide facility & management access. Unrestricted to a single unit.',
    selectedClass: 'border-primary bg-primary/10 shadow-xs',
    titleClass: 'text-primary',
    badgeClass: 'bg-primary/15 text-primary border border-primary/30',
  },
  {
    value: 'UNIT',
    label: 'Unit Scope',
    description: 'Bound to specific villas/apartments when onboarding residents.',
    selectedClass: 'border-emerald-500 bg-emerald-500/10 shadow-xs',
    titleClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
  },
  {
    value: 'COMMUNITY_STAFF',
    label: 'Community Staff (Global Staff)',
    description:
      'Community complaints & maintenance, staff portal, gate pass and attendance. Can also serve residents unless set to community only.',
    defaultPermissions: ['staff:view_own', 'complaints:assignee'],
    selectedClass: 'border-violet-500 bg-violet-500/10 shadow-xs',
    titleClass: 'text-violet-600 dark:text-violet-400',
    badgeClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30',
  },
  {
    value: 'STAFF',
    label: 'Unit Staff (Internal Staff)',
    description: 'Works only on the units residents allocate them to. Auto-syncs to Staff Management.',
    defaultPermissions: ['staff:view_own', 'staff:attendance', 'staff:assign_unit', 'complaints:assignee'],
    selectedClass: 'border-amber-500 bg-amber-500/10 shadow-xs',
    titleClass: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  },
]

export const isTenantScope = (scope) => scope === 'UNIT' || scope === 'STAFF'

export const getRoleScopeOption = (scope) => ROLE_SCOPE_OPTIONS.find((o) => o.value === scope)
