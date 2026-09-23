import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  Tag,
  AlertCircle,
  CheckSquare,
  Camera,
  FileText,
  Calendar,
  RotateCcw,
  Check,
  Pin,
  Clock,
  ShieldAlert,
  Wrench,
  Building2,
  Megaphone,
} from 'lucide-react-native';

export interface ActiveBoardFilterValues {
  categories: string[];
  priorities: string[];
  requiresSignoffOnly: boolean;
  unreadOnly: boolean;
  isPinnedOnly: boolean;
  hasImagesOnly: boolean;
  hasDocsOnly: boolean;
  datePreset: 'ALL_TIME' | 'TODAY' | 'THIS_WEEK' | 'PAST_30_DAYS';
}

export const DEFAULT_ACTIVE_BOARD_FILTERS: ActiveBoardFilterValues = {
  categories: [],
  priorities: [],
  requiresSignoffOnly: false,
  unreadOnly: false,
  isPinnedOnly: false,
  hasImagesOnly: false,
  hasDocsOnly: false,
  datePreset: 'ALL_TIME',
};

export interface ActiveBoardFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: ActiveBoardFilterValues;
  onApply: (filters: ActiveBoardFilterValues) => void;
  onReset: () => void;
  matchCount?: number;
}

const CATEGORY_OPTIONS = [
  { id: 'General', label: 'General', icon: Megaphone },
  { id: 'Maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'Events', label: 'Events', icon: Calendar },
  { id: 'Emergency', label: 'Emergency', icon: ShieldAlert },
  { id: 'Meetings', label: 'Meetings', icon: Building2 },
];

const PRIORITY_OPTIONS = [
  { id: 'Critical', label: 'Critical', color: 'text-red-500' },
  { id: 'High', label: 'High Priority', color: 'text-amber-500' },
  { id: 'Medium', label: 'Medium', color: 'text-blue-500' },
  { id: 'Low', label: 'Low', color: 'text-muted-foreground' },
];

const DATE_PRESETS: { id: ActiveBoardFilterValues['datePreset']; label: string }[] = [
  { id: 'ALL_TIME', label: 'All Time' },
  { id: 'TODAY', label: 'Today' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'PAST_30_DAYS', label: 'Past 30 Days' },
];

export const ActiveBoardFilterDrawer: React.FC<ActiveBoardFilterDrawerProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
  matchCount,
}) => {
  const [categories, setCategories] = useState<string[]>(filters.categories || []);
  const [priorities, setPriorities] = useState<string[]>(filters.priorities || []);
  const [requiresSignoffOnly, setRequiresSignoffOnly] = useState<boolean>(
    filters.requiresSignoffOnly || false
  );
  const [unreadOnly, setUnreadOnly] = useState<boolean>(filters.unreadOnly || false);
  const [isPinnedOnly, setIsPinnedOnly] = useState<boolean>(filters.isPinnedOnly || false);
  const [hasImagesOnly, setHasImagesOnly] = useState<boolean>(filters.hasImagesOnly || false);
  const [hasDocsOnly, setHasDocsOnly] = useState<boolean>(filters.hasDocsOnly || false);
  const [datePreset, setDatePreset] = useState<ActiveBoardFilterValues['datePreset']>(
    filters.datePreset || 'ALL_TIME'
  );

  // Sync state when filters prop updates
  useEffect(() => {
    setCategories(filters.categories || []);
    setPriorities(filters.priorities || []);
    setRequiresSignoffOnly(filters.requiresSignoffOnly || false);
    setUnreadOnly(filters.unreadOnly || false);
    setIsPinnedOnly(filters.isPinnedOnly || false);
    setHasImagesOnly(filters.hasImagesOnly || false);
    setHasDocsOnly(filters.hasDocsOnly || false);
    setDatePreset(filters.datePreset || 'ALL_TIME');
  }, [filters, visible]);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const togglePriority = (prio: string) => {
    setPriorities((prev) =>
      prev.includes(prio) ? prev.filter((p) => p !== prio) : [...prev, prio]
    );
  };

  const handleApply = () => {
    onApply({
      categories,
      priorities,
      requiresSignoffOnly,
      unreadOnly,
      isPinnedOnly,
      hasImagesOnly,
      hasDocsOnly,
      datePreset,
    });
    onClose();
  };

  const handleReset = () => {
    setCategories([]);
    setPriorities([]);
    setRequiresSignoffOnly(false);
    setUnreadOnly(false);
    setIsPinnedOnly(false);
    setHasImagesOnly(false);
    setHasDocsOnly(false);
    setDatePreset('ALL_TIME');
    onReset();
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filter Announcements"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="p-4 pb-8 gap-5"
      >
        <Text className="text-xs text-muted-foreground -mt-2">
          Narrow community feed by category, urgency & actions
        </Text>

        {/* 1. Categories Section */}
        <View className="gap-2.5">
          <View className="flex-row items-center gap-1.5">
            <Tag size={15} className="text-primary" />
            <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
              Category
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = categories.includes(cat.id);
              return (
                <Chip
                  key={cat.id}
                  label={cat.label}
                  selected={isSelected}
                  onPress={() => toggleCategory(cat.id)}
                  icon={cat.icon}
                  className="rounded-xl px-3 py-2"
                />
              );
            })}
          </View>
        </View>

        {/* 2. Priority & Urgency Section */}
        <View className="gap-2.5 border-t border-border/40 pt-4">
          <View className="flex-row items-center gap-1.5">
            <AlertCircle size={15} className="text-primary" />
            <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
              Urgency & Priority
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((prio) => {
              const isSelected = priorities.includes(prio.id);
              return (
                <Chip
                  key={prio.id}
                  label={prio.label}
                  selected={isSelected}
                  onPress={() => togglePriority(prio.id)}
                  className="rounded-xl px-3 py-2"
                />
              );
            })}
          </View>
        </View>

        {/* 3. Action & Governance Flags */}
        <View className="gap-2.5 border-t border-border/40 pt-4">
          <View className="flex-row items-center gap-1.5">
            <CheckSquare size={15} className="text-primary" />
            <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
              Action & Governance
            </Text>
          </View>
          <View className="gap-2">
            {/* Requires Sign-off checkbox */}
            <TouchableOpacity
              onPress={() => setRequiresSignoffOnly(!requiresSignoffOnly)}
              activeOpacity={0.7}
              className={`flex-row items-center justify-between p-3 rounded-2xl border ${
                requiresSignoffOnly
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-full bg-amber-500/15 items-center justify-center">
                  <CheckSquare size={16} className="text-amber-600 dark:text-amber-400" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground">
                    Needs My Sign-off
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Notices requiring resident acknowledgment
                  </Text>
                </View>
              </View>
              <View
                className={`w-5 h-5 rounded-md border items-center justify-center ${
                  requiresSignoffOnly
                    ? 'bg-amber-600 border-amber-600'
                    : 'border-muted-foreground/40 bg-card'
                }`}
              >
                {requiresSignoffOnly && <Check size={12} color="#ffffff" />}
              </View>
            </TouchableOpacity>

            {/* Unread Only checkbox */}
            <TouchableOpacity
              onPress={() => setUnreadOnly(!unreadOnly)}
              activeOpacity={0.7}
              className={`flex-row items-center justify-between p-3 rounded-2xl border ${
                unreadOnly
                  ? 'bg-primary/10 border-primary/40'
                  : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                  <Clock size={16} className="text-primary" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground">
                    Unread Announcements Only
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Updates you have not yet opened
                  </Text>
                </View>
              </View>
              <View
                className={`w-5 h-5 rounded-md border items-center justify-center ${
                  unreadOnly
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground/40 bg-card'
                }`}
              >
                {unreadOnly && <Check size={12} color="#ffffff" />}
              </View>
            </TouchableOpacity>

            {/* Pinned to Top checkbox */}
            <TouchableOpacity
              onPress={() => setIsPinnedOnly(!isPinnedOnly)}
              activeOpacity={0.7}
              className={`flex-row items-center justify-between p-3 rounded-2xl border ${
                isPinnedOnly
                  ? 'bg-primary/10 border-primary/40'
                  : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                  <Pin size={16} className="text-primary" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground">
                    Pinned Announcements Only
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Important bulletins pinned by management
                  </Text>
                </View>
              </View>
              <View
                className={`w-5 h-5 rounded-md border items-center justify-center ${
                  isPinnedOnly
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground/40 bg-card'
                }`}
              >
                {isPinnedOnly && <Check size={12} color="#ffffff" />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Media & Attachments */}
        <View className="gap-2.5 border-t border-border/40 pt-4">
          <View className="flex-row items-center gap-1.5">
            <Camera size={15} className="text-primary" />
            <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
              Media & Attachments
            </Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setHasImagesOnly(!hasImagesOnly)}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-between p-3 rounded-2xl border ${
                hasImagesOnly
                  ? 'bg-primary/10 border-primary/40'
                  : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-2">
                <Camera size={15} className="text-muted-foreground" />
                <Text className="text-xs font-bold text-foreground">Has Photos</Text>
              </View>
              <View
                className={`w-4 h-4 rounded border items-center justify-center ${
                  hasImagesOnly
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground/40 bg-card'
                }`}
              >
                {hasImagesOnly && <Check size={10} color="#ffffff" />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHasDocsOnly(!hasDocsOnly)}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-between p-3 rounded-2xl border ${
                hasDocsOnly
                  ? 'bg-primary/10 border-primary/40'
                  : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-2">
                <FileText size={15} className="text-muted-foreground" />
                <Text className="text-xs font-bold text-foreground">Has PDF / Docs</Text>
              </View>
              <View
                className={`w-4 h-4 rounded border items-center justify-center ${
                  hasDocsOnly
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground/40 bg-card'
                }`}
              >
                {hasDocsOnly && <Check size={10} color="#ffffff" />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Date Posted Presets */}
        <View className="gap-2.5 border-t border-border/40 pt-4">
          <View className="flex-row items-center gap-1.5">
            <Calendar size={15} className="text-primary" />
            <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
              Date Posted
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => {
              const isSelected = datePreset === preset.id;
              return (
                <Chip
                  key={preset.id}
                  label={preset.label}
                  selected={isSelected}
                  onPress={() => setDatePreset(preset.id)}
                  className="rounded-xl px-3 py-2"
                />
              );
            })}
          </View>
        </View>

        {/* 6. Footer Action CTAs */}
        <View className="flex-row items-center gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onPress={handleReset}
            className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-1.5"
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
          >
            <RotateCcw size={15} className="text-foreground" />
            <Text className="text-xs font-bold text-foreground">Reset All</Text>
          </Button>

          <Button
            variant="default"
            onPress={handleApply}
            className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-1.5"
            accessibilityRole="button"
            accessibilityLabel="Apply filters"
          >
            <Text className="text-xs font-bold text-primary-foreground">
              {typeof matchCount === 'number'
                ? `Show Results (${matchCount})`
                : 'Apply Filters'}
            </Text>
          </Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default ActiveBoardFilterDrawer;
