import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Check, RotateCcw, AlertTriangle, Bookmark, Eye, Layers } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';

const PRIORITIES = [
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
];

const TYPES = [
  { label: 'Unread', value: 'Unread', icon: Eye },
  { label: 'Bookmarks', value: 'Bookmarks', icon: Bookmark },
];

const STATUSES = [
  { label: 'Published', value: 'Published' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'Expired', value: 'Expired' },
  { label: 'Archived', value: 'Archived' },
];

export const NoticeFilterSheet = ({
  visible,
  onClose,
  filters = {},
  onApplyFilters,
  onResetFilters,
  showStatusFilter = false,
}) => {
  const { t } = useTranslation();

  const handleTogglePriority = (priority) => {
    const current = filters.priority;
    onApplyFilters({
      ...filters,
      priority: current === priority ? '' : priority,
    });
  };

  const handleToggleType = (typeVal) => {
    if (typeVal === 'Unread') {
      const isCurrentlyUnread = filters.readStatus === 'Unread';
      onApplyFilters({
        ...filters,
        readStatus: isCurrentlyUnread ? '' : 'Unread',
        isBookmarked: isCurrentlyUnread ? filters.isBookmarked : '',
      });
    } else if (typeVal === 'Bookmarks') {
      const isCurrentlyBookmarked = filters.isBookmarked === 'true' || filters.isBookmarked === true;
      onApplyFilters({
        ...filters,
        isBookmarked: isCurrentlyBookmarked ? '' : 'true',
        readStatus: isCurrentlyBookmarked ? filters.readStatus : '',
      });
    }
  };

  const handleToggleStatus = (status) => {
    const current = filters.status;
    onApplyFilters({
      ...filters,
      status: current === status ? '' : status,
    });
  };

  const hasActiveFilters = Boolean(
    filters.priority ||
    filters.readStatus ||
    filters.isBookmarked === 'true' ||
    filters.isBookmarked === true ||
    filters.status
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('filter_notices', 'Filter Notices')}
    >
      <View className="gap-5 pb-2">
        <ScrollView showsVerticalScrollIndicator={false} className="max-h-[420px]">
          {/* Priority Section */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2 px-1">
              <View className="flex-row items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500" />
                <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {t('priority', 'Priority')}
                </Text>
              </View>
              {filters.priority ? (
                <TouchableOpacity onPress={() => onApplyFilters({ ...filters, priority: '' })}>
                  <Text className="text-[11px] font-bold text-primary">{t('clear', 'Clear')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = filters.priority === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => handleTogglePriority(p.value)}
                    activeOpacity={0.7}
                    className={`flex-row items-center px-3.5 py-2 rounded-xl border ${
                      isSelected
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/40 border-border/80'
                    }`}
                  >
                    {isSelected && <Check size={13} className="text-primary me-1.5" />}
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Quick Notice Types (Resident) */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2 px-1">
              <View className="flex-row items-center gap-1.5">
                <Layers size={14} className="text-primary" />
                <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {t('display_type', 'Display Type')}
                </Text>
              </View>
              {(filters.readStatus || filters.isBookmarked) ? (
                <TouchableOpacity
                  onPress={() =>
                    onApplyFilters({ ...filters, readStatus: '', isBookmarked: '' })
                  }
                >
                  <Text className="text-[11px] font-bold text-primary">{t('clear', 'Clear')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {TYPES.map((typeItem) => {
                const isSelected =
                  (typeItem.value === 'Unread' && filters.readStatus === 'Unread') ||
                  (typeItem.value === 'Bookmarks' &&
                    (filters.isBookmarked === 'true' || filters.isBookmarked === true));
                const IconComponent = typeItem.icon;
                return (
                  <TouchableOpacity
                    key={typeItem.value}
                    onPress={() => handleToggleType(typeItem.value)}
                    activeOpacity={0.7}
                    className={`flex-row items-center px-3.5 py-2 rounded-xl border ${
                      isSelected
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/40 border-border/80'
                    }`}
                  >
                    {isSelected ? (
                      <Check size={13} className="text-primary me-1.5" />
                    ) : (
                      <IconComponent size={13} className="text-muted-foreground me-1.5" />
                    )}
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {typeItem.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Admin Notice Status (Only visible for Admins / Manage mode) */}
          {showStatusFilter && (
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2 px-1">
                <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {t('publishing_status', 'Publishing Status')}
                </Text>
                {filters.status ? (
                  <TouchableOpacity onPress={() => onApplyFilters({ ...filters, status: '' })}>
                    <Text className="text-[11px] font-bold text-primary">{t('clear', 'Clear')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View className="flex-row flex-wrap gap-2">
                {STATUSES.map((s) => {
                  const isSelected = filters.status === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      onPress={() => handleToggleStatus(s.value)}
                      activeOpacity={0.7}
                      className={`flex-row items-center px-3.5 py-2 rounded-xl border ${
                        isSelected
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/40 border-border/80'
                      }`}
                    >
                      {isSelected && <Check size={13} className="text-primary me-1.5" />}
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View className="flex-row items-center gap-2 pt-2 border-t border-border/60">
          {hasActiveFilters && (
            <Button
              variant="outline"
              onPress={() => {
                onResetFilters();
                onClose();
              }}
              className="flex-1 flex-row items-center justify-center gap-1.5 h-11 rounded-xl"
            >
              <RotateCcw size={14} className="text-muted-foreground" />
              <Text className="text-xs font-bold text-foreground">{t('reset_all', 'Reset')}</Text>
            </Button>
          )}
          <Button
            variant="default"
            onPress={onClose}
            className="flex-1 h-11 rounded-xl items-center justify-center"
          >
            <Text className="text-xs font-bold text-primary-foreground">{t('done', 'Done')}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default NoticeFilterSheet;
