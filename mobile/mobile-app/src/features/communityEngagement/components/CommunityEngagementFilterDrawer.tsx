import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DatePicker } from '@/components/common/DatePicker';
import { formatDateString } from '@/components/common/DatePickerModal';
import { TextInput } from '@/components/forms/TextInput';
import {
  Calendar,
  AlertCircle,
  Tag,
  Users,
  CheckSquare,
  Pin,
  BarChart3,
  RotateCcw,
  Check,
  Search,
  Shield,
  KeyRound,
  Building2,
} from 'lucide-react-native';
import {
  CommunityEngagementFilterValues,
  NoticePriority,
  NoticeCategory,
  LedgerDatePreset,
} from '../types/communityEngagement.types';
import { fetchRoles } from '@/src/features/roleBuilder/services/roleService';

export interface CommunityEngagementFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: CommunityEngagementFilterValues;
  onApply: (newFilters: CommunityEngagementFilterValues) => void;
  onReset: () => void;
  activeTypeFilter?: 'ALL' | 'NOTICES' | 'POLLS';
}

const DATE_PRESETS: { id: LedgerDatePreset; label: string }[] = [
  { id: 'ALL_TIME', label: 'All Time' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'PAST_30_DAYS', label: 'Past 30 Days' },
  { id: 'CUSTOM', label: 'Custom Range' },
];

const PRIORITIES: { id: NoticePriority; label: string; iconColor: string }[] = [
  { id: 'Critical', label: 'Critical', iconColor: 'text-destructive' },
  { id: 'High', label: 'High', iconColor: 'text-amber-500' },
  { id: 'Medium', label: 'Medium', iconColor: 'text-blue-500' },
  { id: 'Low', label: 'Low', iconColor: 'text-muted-foreground' },
];

const CATEGORIES: { id: NoticeCategory; label: string }[] = [
  { id: 'General', label: 'General' },
  { id: 'Maintenance', label: 'Maintenance' },
  { id: 'Events', label: 'Events' },
  { id: 'Emergency', label: 'Emergency' },
  { id: 'Meetings', label: 'Meetings' },
  { id: 'Rules', label: 'Rules' },
];

const AUDIENCE_SCOPES = [
  { id: 'ALL', label: 'All Community', icon: Users },
  { id: 'OWNERS_ONLY', label: 'Owners Only', icon: KeyRound },
  { id: 'STAFF_ONLY', label: 'Staff Only', icon: Shield },
  { id: 'SPECIFIC_ROLE', label: 'By Role', icon: Building2 },
];

export const CommunityEngagementFilterDrawer: React.FC<CommunityEngagementFilterDrawerProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
  activeTypeFilter = 'ALL',
}) => {
  const [datePreset, setDatePreset] = useState<LedgerDatePreset>(filters.datePreset);
  const [startDate, setStartDate] = useState<string>(filters.startDate || '');
  const [endDate, setEndDate] = useState<string>(filters.endDate || '');
  const [priorities, setPriorities] = useState<NoticePriority[]>(filters.priorities || []);
  const [categories, setCategories] = useState<NoticeCategory[]>(filters.categories || []);
  const [audienceScope, setAudienceScope] = useState<any>(filters.audienceScope || 'ALL');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(filters.selectedRoleIds || []);
  const [pollVotingModes, setPollVotingModes] = useState<('PUBLIC' | 'ANONYMOUS')[]>(
    filters.pollVotingModes || []
  );
  const [pollChoiceTypes, setPollChoiceTypes] = useState<('SINGLE_CHOICE' | 'MULTIPLE_CHOICE')[]>(
    filters.pollChoiceTypes || []
  );
  const [isPinnedOnly, setIsPinnedOnly] = useState<boolean>(filters.isPinnedOnly || false);
  const [requiresAcknowledgementOnly, setRequiresAcknowledgementOnly] = useState<boolean>(
    filters.requiresAcknowledgementOnly || false
  );

  // Search roles state
  const [roleSearch, setRoleSearch] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([]);
  const [loadingRoles, setLoadingRoles] = useState<boolean>(false);

  // Sync internal state when opened or filters prop change
  useEffect(() => {
    if (visible) {
      setDatePreset(filters.datePreset || 'ALL_TIME');
      setStartDate(filters.startDate || '');
      setEndDate(filters.endDate || '');
      setPriorities(filters.priorities || []);
      setCategories(filters.categories || []);
      setAudienceScope(filters.audienceScope || 'ALL');
      setSelectedRoleIds(filters.selectedRoleIds || []);
      setPollVotingModes(filters.pollVotingModes || []);
      setPollChoiceTypes(filters.pollChoiceTypes || []);
      setIsPinnedOnly(filters.isPinnedOnly || false);
      setRequiresAcknowledgementOnly(filters.requiresAcknowledgementOnly || false);
      setRoleSearch('');

      // Fetch distinct estate roles
      setLoadingRoles(true);
      fetchRoles({ page: 1, limit: 100 })
        .then((res: any) => {
          const raw = res?.data?.data || res?.data || [];
          const items = Array.isArray(raw) ? raw : [];
          setAvailableRoles(
            items
              .map((r: any) => ({
                id: r._id || r.id,
                name: r.name || r.roleName || 'Unnamed Role',
              }))
              .filter((r: any) => Boolean(r.id) && Boolean(r.name))
          );
        })
        .catch(() => {})
        .finally(() => setLoadingRoles(false));
    }
  }, [visible, filters]);

  const handleSelectDatePreset = (preset: LedgerDatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      const sunday = new Date(now.setDate(monday.getDate() + 6));
      setStartDate(formatDateString(monday));
      setEndDate(formatDateString(sunday));
    } else if (preset === 'THIS_MONTH') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      setStartDate(formatDateString(firstDay));
      setEndDate(formatDateString(lastDay));
    } else if (preset === 'PAST_30_DAYS') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(formatDateString(past30));
      setEndDate(formatDateString(now));
    }
  };

  const togglePriority = (p: NoticePriority) => {
    setPriorities((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const toggleCategory = (c: NoticeCategory) => {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    );
  };

  const toggleRoleId = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleVotingMode = (mode: 'PUBLIC' | 'ANONYMOUS') => {
    setPollVotingModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const toggleChoiceType = (choice: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE') => {
    setPollChoiceTypes((prev) =>
      prev.includes(choice) ? prev.filter((c) => c !== choice) : [...prev, choice]
    );
  };

  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return availableRoles;
    const term = roleSearch.trim().toLowerCase();
    return availableRoles.filter((r) => r.name.toLowerCase().includes(term));
  }, [availableRoles, roleSearch]);

  const handleApply = () => {
    onApply({
      datePreset,
      startDate,
      endDate,
      priorities,
      categories,
      audienceScope,
      selectedRoleIds,
      pollVotingModes,
      pollChoiceTypes,
      isPinnedOnly,
      requiresAcknowledgementOnly,
    });
    onClose();
  };

  const handleResetInternal = () => {
    setDatePreset('ALL_TIME');
    setStartDate('');
    setEndDate('');
    setPriorities([]);
    setCategories([]);
    setAudienceScope('ALL');
    setSelectedRoleIds([]);
    setPollVotingModes([]);
    setPollChoiceTypes([]);
    setIsPinnedOnly(false);
    setRequiresAcknowledgementOnly(false);
    setRoleSearch('');
    onReset();
    onClose();
  };

  const showNoticeFilters = activeTypeFilter === 'ALL' || activeTypeFilter === 'NOTICES';
  const showPollFilters = activeTypeFilter === 'ALL' || activeTypeFilter === 'POLLS';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Advanced Filters"
      snapPoints={['88%']}
    >
      <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
        <View className="gap-5 pb-16">
          {/* Section 1: Date Range Presets */}
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Calendar size={16} className="text-primary" />
              <Text className="font-bold text-sm text-foreground">Date Range</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {DATE_PRESETS.map((p) => (
                <Chip
                  key={p.id}
                  label={p.label}
                  selected={datePreset === p.id}
                  onPress={() => handleSelectDatePreset(p.id)}
                />
              ))}
            </View>

            {/* Custom Date Pickers */}
            {datePreset === 'CUSTOM' ? (
              <View className="flex-row items-center gap-3 pt-2">
                <View className="flex-1">
                  <DatePicker
                    label="Start Date"
                    value={startDate ? new Date(`${startDate}T00:00:00`) : null}
                    onChange={(d: Date) => {
                      setStartDate(formatDateString(d));
                      setDatePreset('CUSTOM');
                    }}
                    placeholder="Start Date"
                  />
                </View>
                <View className="flex-1">
                  <DatePicker
                    label="End Date"
                    value={endDate ? new Date(`${endDate}T00:00:00`) : null}
                    onChange={(d: Date) => {
                      setEndDate(formatDateString(d));
                      setDatePreset('CUSTOM');
                    }}
                    placeholder="End Date"
                  />
                </View>
              </View>
            ) : null}
          </View>

          {/* Section 2: Notice Priorities (Multi-Select Chips) */}
          {showNoticeFilters && (
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <AlertCircle size={16} className="text-primary" />
                <Text className="font-bold text-sm text-foreground">
                  Notice Priority (Multi-Select)
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {PRIORITIES.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.label}
                    selected={priorities.includes(item.id)}
                    onPress={() => togglePriority(item.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Section 3: Notice Categories (Multi-Select Chips) */}
          {showNoticeFilters && (
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Tag size={16} className="text-primary" />
                <Text className="font-bold text-sm text-foreground">
                  Notice Category (Multi-Select)
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.label}
                    selected={categories.includes(item.id)}
                    onPress={() => toggleCategory(item.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Section 4: Target Audience Scope & Searchable Roles */}
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Users size={16} className="text-primary" />
              <Text className="font-bold text-sm text-foreground">Target Audience Scope</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {AUDIENCE_SCOPES.map((scope) => {
                const IconComp = scope.icon;
                return (
                  <Chip
                    key={scope.id}
                    label={scope.label}
                    icon={IconComp}
                    selected={audienceScope === scope.id}
                    onPress={() => setAudienceScope(scope.id as any)}
                  />
                );
              })}
            </View>

            {/* If By Role is selected: Search box + dynamic selectable role chips */}
            {audienceScope === 'SPECIFIC_ROLE' && (
              <View className="mt-2 p-3 bg-muted/30 border border-border/70 rounded-2xl gap-2.5">
                <Text className="text-xs font-semibold text-foreground">
                  Filter by Specific Estate Roles ({selectedRoleIds.length} selected):
                </Text>

                {/* Role search text field */}
                <View className="flex-row items-center bg-card border border-border rounded-xl px-3 py-1.5">
                  <Icon as={Search} size={15} className="text-muted-foreground me-2 shrink-0" />
                  <TextInput
                    value={roleSearch}
                    onChangeText={setRoleSearch}
                    placeholder="Search roles (e.g. Guard, Admin, Committee)..."
                    className="flex-1 text-xs text-foreground p-0 bg-transparent border-0"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                {/* Role chips */}
                <View className="flex-row flex-wrap gap-1.5 max-h-36">
                  {loadingRoles ? (
                    <Text className="text-xs text-muted-foreground py-2">Loading roles...</Text>
                  ) : filteredRoles.length > 0 ? (
                    filteredRoles.map((role) => (
                      <Chip
                        key={role.id}
                        label={role.name}
                        selected={selectedRoleIds.includes(role.id)}
                        onPress={() => toggleRoleId(role.id)}
                      />
                    ))
                  ) : (
                    <Text className="text-xs text-muted-foreground py-2">
                      No roles matching &quot;{roleSearch}&quot;
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Section 5: Poll Attributes (Multi-Select Chips) */}
          {showPollFilters && (
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <BarChart3 size={16} className="text-primary" />
                <Text className="font-bold text-sm text-foreground">
                  Poll Attributes (Multi-Select)
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label="🗳️ Anonymous Voting"
                  selected={pollVotingModes.includes('ANONYMOUS')}
                  onPress={() => toggleVotingMode('ANONYMOUS')}
                />
                <Chip
                  label="👤 Public Voting"
                  selected={pollVotingModes.includes('PUBLIC')}
                  onPress={() => toggleVotingMode('PUBLIC')}
                />
                <Chip
                  label="☑️ Multiple Choice"
                  selected={pollChoiceTypes.includes('MULTIPLE_CHOICE')}
                  onPress={() => toggleChoiceType('MULTIPLE_CHOICE')}
                />
                <Chip
                  label="🔘 Single Choice"
                  selected={pollChoiceTypes.includes('SINGLE_CHOICE')}
                  onPress={() => toggleChoiceType('SINGLE_CHOICE')}
                />
              </View>
            </View>
          )}

          {/* Section 6: Governance Flags (Multi-Select Chips) */}
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <CheckSquare size={16} className="text-primary" />
              <Text className="font-bold text-sm text-foreground">Governance Flags</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="📌 Pinned to Top"
                selected={isPinnedOnly}
                onPress={() => setIsPinnedOnly((prev) => !prev)}
              />
              <Chip
                label="✍️ Sign-off Required"
                selected={requiresAcknowledgementOnly}
                onPress={() => setRequiresAcknowledgementOnly((prev) => !prev)}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onPress={handleResetInternal}
              accessibilityLabel="Reset Filters"
            >
              <RotateCcw size={16} className="me-2 text-muted-foreground" />
              <Text className="font-bold text-sm text-foreground">Reset All</Text>
            </Button>

            <Button
              variant="default"
              size="lg"
              className="flex-1 bg-primary"
              onPress={handleApply}
              accessibilityLabel="Apply Filters"
            >
              <Check size={16} className="me-2 text-primary-foreground" />
              <Text className="font-bold text-sm text-primary-foreground">Apply Filters</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default CommunityEngagementFilterDrawer;
