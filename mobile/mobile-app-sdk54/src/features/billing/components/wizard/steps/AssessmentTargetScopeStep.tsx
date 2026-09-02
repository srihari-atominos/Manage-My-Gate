import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { DropdownSelect, DropdownOption } from '@/components/forms/DropdownSelect';
import { SearchBar } from '@/components/forms/SearchBar';
import { Chip } from '@/components/common/Chip';
import { Icon } from '@/components/ui/icon';
import { Check, CheckSquare, Square, Filter, Home, Layers } from 'lucide-react-native';

const SCOPE_OPTIONS: DropdownOption[] = [
  { label: '🌐 Entire Community (All Active Residents)', value: 'ALL_COMMUNITY' },
  { label: '📍 Filter & Select Villa Units (By Block or BHK)', value: 'SPECIFIC_UNITS' },
  { label: '👤 Specific Resident Users', value: 'SPECIFIC_USERS' },
];

interface ScopeRowItem {
  _id: string;
  label: string;
  sub?: string;
  unitNumber?: string;
  block?: string;
  type?: string;
}

interface RoleItem {
  _id: string;
  id?: string;
  name: string;
  isTenantRole?: boolean;
}

interface AssessmentTargetScopeStepProps {
  scopeType: string;
  onChangeScopeType: (val: string) => void;
  roles: RoleItem[];
  checkedRoles: string[];
  onToggleRole: (roleId: string) => void;
  scopeRows: ScopeRowItem[];
  selectedIds: string[];
  onToggleId: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: (ids: string[]) => void;
  searchQuery: string;
  onChangeSearchQuery: (text: string) => void;
  availableBlocks?: string[];
  availableUnitTypes?: string[];
  onToggleBlockPreset?: (blockName: string) => void;
  onToggleTypePreset?: (unitType: string) => void;
  isBlockFullySelected?: (blockName: string) => boolean;
  isTypeFullySelected?: (unitType: string) => boolean;
  totalUnitsCount?: number;
}

export const AssessmentTargetScopeStep: React.FC<AssessmentTargetScopeStepProps> = ({
  scopeType,
  onChangeScopeType,
  roles,
  checkedRoles,
  onToggleRole,
  scopeRows,
  selectedIds,
  onToggleId,
  onSelectAll,
  onDeselectAll,
  searchQuery,
  onChangeSearchQuery,
  availableBlocks = [],
  availableUnitTypes = [],
  onToggleBlockPreset,
  onToggleTypePreset,
  isBlockFullySelected,
  isTypeFullySelected,
  totalUnitsCount,
}) => {
  const isSpecificUnits = scopeType === 'SPECIFIC_UNITS' || scopeType === 'VILLA_BLOCK' || scopeType === 'UNIT_TYPE';
  const isSpecificUsers = scopeType === 'SPECIFIC_USERS';
  const showScopeTable = isSpecificUnits || isSpecificUsers;

  const allSelected = scopeRows.length > 0 && scopeRows.every((r) => selectedIds.includes(r._id));

  return (
    <View className="gap-4">
      {/* Scope Type Dropdown */}
      <DropdownSelect
        label="Target Scope (Who Gets Billed?) *"
        options={SCOPE_OPTIONS}
        value={scopeType}
        onValueChange={onChangeScopeType}
        placeholder="Select Target Scope"
      />

      {/* ── CHARGE TO RESIDENT ROLES CHECKBOXES ───────────────────────── */}
      <View className="bg-card border border-border rounded-xl p-4 gap-2.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Charge To Resident Roles * ({checkedRoles.length} selected)
          </Text>
          {roles.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                const allRoleIds = roles.map((r) => String(r._id || r.id));
                const allChecked = allRoleIds.every((id) => checkedRoles.includes(id));
                if (allChecked) {
                  allRoleIds.forEach((id) => {
                    if (checkedRoles.includes(id)) onToggleRole(id);
                  });
                } else {
                  allRoleIds.forEach((id) => {
                    if (!checkedRoles.includes(id)) onToggleRole(id);
                  });
                }
              }}
            >
              <Text className="text-xs font-bold text-primary">
                {roles.length > 0 && roles.every((r) => checkedRoles.includes(String(r._id || r.id)))
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text className="text-xs text-muted-foreground">
          Select which resident role types will receive invoices (e.g. Owner vs Tenant).
        </Text>

        <View className="flex-row flex-wrap gap-2 mt-1">
          {roles.map((role) => {
            const roleId = String(role._id || role.id);
            const isChecked = checkedRoles.includes(roleId);
            return (
              <TouchableOpacity
                key={roleId}
                onPress={() => onToggleRole(roleId)}
                activeOpacity={0.7}
                className={`px-3 py-2 rounded-xl border flex-row items-center gap-2 ${
                  isChecked
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background'
                }`}
              >
                <Icon
                  as={isChecked ? CheckSquare : Square}
                  size={16}
                  className={isChecked ? 'text-primary' : 'text-muted-foreground'}
                />
                <Text
                  className={`text-xs font-bold ${
                    isChecked ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {role.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {checkedRoles.length === 0 && (
          <Text className="text-xs font-bold text-destructive mt-1">
            ⚠️ Please select at least one resident role.
          </Text>
        )}
      </View>

      {/* ── ALL COMMUNITY NOTICE ─────────────────────────────────────── */}
      {scopeType === 'ALL_COMMUNITY' && (
        <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex-row items-center gap-2.5">
          <Icon as={Check} size={18} className="text-emerald-600 shrink-0" />
          <Text className="text-xs text-emerald-800 font-bold flex-1">
            Applies to all active homes across the community matching the selected roles.
          </Text>
        </View>
      )}

      {/* ── SPECIFIC UNITS QUICK FILTER PRESETS & CHECKLIST ─────────────── */}
      {isSpecificUnits && (
        <View className="bg-card border border-border rounded-xl p-4 gap-3.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Icon as={Filter} size={16} className="text-primary" />
              <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
                Quick Select Presets
              </Text>
            </View>
            <View className="bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              <Text className="text-xs font-bold text-primary">
                {selectedIds.length} {totalUnitsCount ? `of ${totalUnitsCount}` : ''} Units Selected
              </Text>
            </View>
          </View>

          <Text className="text-xs text-muted-foreground">
            Tap a Block or Floorplan chip to instantly select all matching homes, then uncheck any specific exemptions below.
          </Text>

          {/* Block Filter Chips */}
          {availableBlocks.length > 0 && (
            <View className="gap-1.5">
              <View className="flex-row items-center gap-1">
                <Icon as={Layers} size={13} className="text-muted-foreground" />
                <Text className="text-[11px] font-bold text-muted-foreground uppercase">
                  Select by Block / Tower:
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                {availableBlocks.map((blockName) => {
                  const isSelected = isBlockFullySelected ? isBlockFullySelected(blockName) : false;
                  return (
                    <Chip
                      key={blockName}
                      label={blockName}
                      selected={isSelected}
                      onPress={() => onToggleBlockPreset && onToggleBlockPreset(blockName)}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* Unit Type (BHK) Filter Chips */}
          {availableUnitTypes.length > 0 && (
            <View className="gap-1.5">
              <View className="flex-row items-center gap-1">
                <Icon as={Home} size={13} className="text-muted-foreground" />
                <Text className="text-[11px] font-bold text-muted-foreground uppercase">
                  Select by Floorplan (BHK):
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                {availableUnitTypes.map((uType) => {
                  const isSelected = isTypeFullySelected ? isTypeFullySelected(uType) : false;
                  return (
                    <Chip
                      key={uType}
                      label={uType}
                      selected={isSelected}
                      onPress={() => onToggleTypePreset && onToggleTypePreset(uType)}
                    />
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── SCOPE CHECKLIST SELECTOR TABLE ───────────────────────────── */}
      {showScopeTable && (
        <View className="bg-card border border-border rounded-xl p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isSpecificUsers ? 'Select Residents' : 'Granular Unit Exclusion'} ({selectedIds.length} active)
            </Text>
            {scopeRows.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  allSelected
                    ? onDeselectAll(scopeRows.map((r) => r._id))
                    : onSelectAll(scopeRows.map((r) => r._id))
                }
              >
                <Text className="text-xs font-bold text-primary">
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Input */}
          <SearchBar
            value={searchQuery}
            onChangeText={onChangeSearchQuery}
            placeholder={
              isSpecificUsers
                ? 'Search resident name or email...'
                : 'Search unit number, block, or BHK...'
            }
          />

          {/* List Rows */}
          <View className="max-h-64 rounded-xl border border-border overflow-hidden">
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {scopeRows.length === 0 ? (
                <View className="p-4 items-center">
                  <Text className="text-xs text-muted-foreground font-semibold">
                    No matching items found.
                  </Text>
                </View>
              ) : (
                scopeRows.map((row) => {
                  const isChecked = selectedIds.includes(row._id);
                  return (
                    <TouchableOpacity
                      key={row._id}
                      onPress={() => onToggleId(row._id)}
                      activeOpacity={0.7}
                      className={`p-3 border-b border-border flex-row items-center justify-between ${
                        isChecked ? 'bg-primary/5' : 'bg-card'
                      }`}
                    >
                      <View className="flex-1 me-2">
                        <Text className="text-xs font-bold text-foreground">{row.label}</Text>
                        {row.sub ? (
                          <Text className="text-[11px] text-muted-foreground">{row.sub}</Text>
                        ) : null}
                      </View>
                      <Icon
                        as={isChecked ? CheckSquare : Square}
                        size={18}
                        className={isChecked ? 'text-primary' : 'text-muted-foreground'}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

export default AssessmentTargetScopeStep;
