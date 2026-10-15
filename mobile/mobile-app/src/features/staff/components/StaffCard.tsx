import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { staffCategoryLabel, staffCategoryOf } from '../staffCategories';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StaffMember } from '../services/staffService';
import { Phone, Mail, Edit3, Trash2, Eye } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';
import { StaffAvatar } from './StaffAvatar';
import { getDepartmentLabel } from '../services/staffService';

interface StaffCardProps {
  member: StaffMember;
  canManage: boolean;
  onPress: (member: StaffMember) => void;
  onEdit?: (member: StaffMember) => void;
  onDelete?: (member: StaffMember) => void;
}

const getStatusVariant = (status: string): StatusVariant => {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Inactive':
    default:
      return 'neutral';
  }
};

const getTypeVariant = (type: string): StatusVariant => {
  return type === 'In-House Staff' ? 'info' : 'neutral';
};

export const StaffCard: React.FC<StaffCardProps> = ({
  member,
  canManage,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const subtitle = member.designation
    ? `${member.designation} • ${getDepartmentLabel(member)}`
    : getDepartmentLabel(member);

  return (
    <View className="mb-3 rounded-2xl bg-card border border-border p-3.5 shadow-sm">
      <View className="flex-row items-center">
        <View className="flex-row items-center flex-1 me-2">
          <View className="me-3 shrink-0">
            <StaffAvatar name={member.name} photoUrl={member.photoUrl} size={44} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center flex-wrap gap-1.5">
              <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                {member.name}
              </Text>
              {member.staffCode ? (
                <View className="px-1.5 py-0.5 rounded bg-muted">
                  <Text className="text-[10px] font-mono text-muted-foreground">
                    {member.staffCode}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-2 flex-row flex-wrap gap-1.5">
        <StatusBadge
          label={member.status}
          variant={getStatusVariant(member.status)}
          size="sm"
        />
        <StatusBadge
          label={member.type}
          variant={getTypeVariant(member.type)}
          size="sm"
        />
        <StatusBadge
          label={staffCategoryLabel(member)}
          variant={staffCategoryOf(member) === 'UNIT' ? 'warning' : 'gold'}
          size="sm"
        />
      </View>

      {/* Contact Info Row */}
      <View className="mt-3 pt-2.5 border-t border-border/50 flex-row items-center flex-wrap gap-x-4 gap-y-1.5">
        <View className="flex-row items-center">
          <Phone size={13} className="text-muted-foreground me-1.5" />
          <Text className="text-xs text-foreground font-medium">
            {member.phone}
          </Text>
        </View>
        {member.email ? (
          <View className="flex-row items-center flex-1 min-w-[120px]">
            <Mail size={13} className="text-muted-foreground me-1.5" />
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {member.email}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Action Buttons Row */}
      <View className="mt-2.5 pt-2 border-t border-border/40 flex-row items-center justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2.5"
          onPress={() => onPress(member)}
          accessibilityLabel={`View details for ${member.name}`}
        >
          <Eye size={14} className="text-foreground me-1.5" />
          <Text className="text-xs font-medium text-foreground">{t('staff_card_view', 'View')}</Text>
        </Button>

        {canManage && onEdit ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5"
            onPress={() => onEdit(member)}
            accessibilityLabel={`Edit ${member.name}`}
          >
            <Edit3 size={13} className="text-foreground me-1.5" />
            <Text className="text-xs font-medium text-foreground">{t('staff_card_edit', 'Edit')}</Text>
          </Button>
        ) : null}

        {canManage && onDelete ? (
          <Button
            size="sm"
            variant="destructive"
            className="h-8 px-2.5"
            onPress={() => onDelete(member)}
            accessibilityLabel={`Delete ${member.name}`}
          >
            <Trash2 size={13} className="text-destructive-foreground me-1.5" />
            <Text className="text-xs font-medium text-destructive-foreground">{t('staff_card_delete', 'Delete')}</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
};

export default StaffCard;
