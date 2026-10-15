/**
 * Role Scope & Tenancy Archetypes (mirrors backend role/roleScope.constants.js).
 * `STAFF` keeps its stored value for existing roles and is presented as Unit Staff (Internal Staff).
 */
export type RoleScope = 'GLOBAL' | 'UNIT' | 'COMMUNITY_STAFF' | 'STAFF';

export const ROLE_SCOPE_VALUES: RoleScope[] = ['GLOBAL', 'UNIT', 'COMMUNITY_STAFF', 'STAFF'];

export interface RoleScopeOption {
  value: RoleScope;
  label: string;
  tag: string;
  description: string;
  defaultPermissions?: string[];
  // Full class strings so NativeWind can detect them at build time.
  selectedCardClass: string;
  titleClass: string;
  tagClass: string;
  tagTextClass: string;
  radioClass: string;
}

export const ROLE_SCOPE_OPTIONS: RoleScopeOption[] = [
  {
    value: 'GLOBAL',
    label: 'Global Scope',
    tag: 'COMMUNITY',
    description: 'Community-wide facility & management access. Unrestricted to any single unit.',
    selectedCardClass: 'bg-blue-500/10 border-blue-500',
    titleClass: 'text-blue-600 dark:text-blue-400',
    tagClass: 'bg-blue-500/15',
    tagTextClass: 'text-blue-600 dark:text-blue-400',
    radioClass: 'border-blue-600 bg-blue-600',
  },
  {
    value: 'UNIT',
    label: 'Unit Scope',
    tag: 'RESIDENTIAL',
    description: 'Bound to specific villas/apartments when onboarding residents.',
    selectedCardClass: 'bg-emerald-500/10 border-emerald-500',
    titleClass: 'text-emerald-600 dark:text-emerald-400',
    tagClass: 'bg-emerald-500/15',
    tagTextClass: 'text-emerald-600 dark:text-emerald-400',
    radioClass: 'border-emerald-600 bg-emerald-600',
  },
  {
    value: 'COMMUNITY_STAFF',
    label: 'Community Staff (Global Staff)',
    tag: 'GLOBAL STAFF',
    description:
      'Community complaints & maintenance, staff portal, gate pass and attendance. Can also serve residents unless set to community only.',
    defaultPermissions: ['staff:view_own', 'complaints:assignee'],
    selectedCardClass: 'bg-violet-500/10 border-violet-500',
    titleClass: 'text-violet-600 dark:text-violet-400',
    tagClass: 'bg-violet-500/15',
    tagTextClass: 'text-violet-600 dark:text-violet-400',
    radioClass: 'border-violet-600 bg-violet-600',
  },
  {
    value: 'STAFF',
    label: 'Unit Staff (Internal Staff)',
    tag: 'INTERNAL STAFF',
    description: 'Works only on the units residents allocate them to. Auto-syncs to Staff Management.',
    defaultPermissions: ['staff:view_own', 'staff:attendance', 'staff:assign_unit', 'complaints:assignee'],
    selectedCardClass: 'bg-amber-500/10 border-amber-500',
    titleClass: 'text-amber-600 dark:text-amber-400',
    tagClass: 'bg-amber-500/15',
    tagTextClass: 'text-amber-600 dark:text-amber-400',
    radioClass: 'border-amber-600 bg-amber-600',
  },
];

export const isTenantScope = (scope?: string) => scope === 'UNIT' || scope === 'STAFF';

export const getRoleScopeOption = (scope?: string) => ROLE_SCOPE_OPTIONS.find((o) => o.value === scope);
