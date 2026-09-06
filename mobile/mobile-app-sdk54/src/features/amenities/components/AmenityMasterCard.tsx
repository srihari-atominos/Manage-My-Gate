import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Amenity } from '../store/amenitySlice';
import { Users, Clock, Edit2, Power, Trash2, Building } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export interface AmenityMasterCardProps {
  item: Amenity;
  onPress: (item: Amenity) => void;
  onEdit: (item: Amenity) => void;
  onToggleStatus: (item: Amenity) => void;
  onDelete: (item: Amenity) => void;
}

const mapAmenityStatus = (status?: string): { label: string; variant: StatusVariant } => {
  const s = (status || 'active').toLowerCase();
  if (s === 'maintenance') {
    return { label: 'MAINTENANCE', variant: 'warning' };
  }
  if (s === 'inactive') {
    return { label: 'INACTIVE', variant: 'neutral' };
  }
  return { label: 'ACTIVE', variant: 'success' };
};

export const AmenityMasterCard: React.FC<AmenityMasterCardProps> = ({
  item,
  onPress,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const statusMeta = mapAmenityStatus(item.status);
  const isActive = statusMeta.label === 'ACTIVE';

  const pricingType = item.pricing?.pricingType || 'hourly';
  const baseRate = item.pricing?.baseRate ?? item.bookingFee ?? 0;
  const openTime = item.bookingRules?.openTime || item.openTime || '08:00';
  const closeTime = item.bookingRules?.closeTime || item.closeTime || '21:00';
  const category = item.category || item.type || 'General Facility';
  const imageUrl = item.imageUrl || (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '');

  return (
    <ListCard
      title={item.name}
      subtitle={`${category} • ${item.location || 'Community Center'}`}
      leftImage={imageUrl || undefined}
      leftIcon={!imageUrl ? Building : undefined}
      leftIconBgColor="bg-primary/10"
      status={{ label: statusMeta.label, variant: statusMeta.variant }}
      onPress={() => onPress(item)}
      className="mb-3"
    >
      {/* Facility Metadata Row */}
      <View className="flex-row items-center justify-between pt-1 border-t border-border/40">
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Users size={12} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground">Cap: {item.capacity || 20}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Clock size={12} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground">{openTime} - {closeTime}</Text>
          </View>
        </View>

        <Text className="text-xs font-bold text-primary">
          {baseRate ? `₹${baseRate}/${pricingType === 'daily' ? 'day' : 'slot'}` : 'Free Access'}
        </Text>
      </View>

      {/* Admin Action Buttons Row */}
      <View className="flex-row items-center justify-end gap-2 pt-2 mt-1">
        <Button
          variant="outline"
          size="sm"
          onPress={() => onEdit(item)}
          className="flex-row items-center gap-1 h-7 px-2.5 rounded-lg border-blue-500/30 bg-blue-500/10 active:bg-blue-500/20"
          accessibilityLabel={`Edit ${item.name}`}
        >
          <Edit2 size={11} className="text-blue-600 dark:text-blue-400" />
          <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">Edit</Text>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onPress={() => onToggleStatus(item)}
          className={cn(
            'flex-row items-center gap-1 h-7 px-2.5 rounded-lg',
            isActive
              ? 'border-amber-500/30 bg-amber-500/10 active:bg-amber-500/20'
              : 'border-emerald-500/30 bg-emerald-500/10 active:bg-emerald-500/20'
          )}
          accessibilityLabel={isActive ? `Deactivate ${item.name}` : `Activate ${item.name}`}
        >
          <Power size={11} className={isActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} />
          <Text className={cn('text-xs font-semibold', isActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
            {isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onPress={() => onDelete(item)}
          className="flex-row items-center gap-1 h-7 px-2.5 rounded-lg bg-red-600 active:bg-red-700"
          accessibilityLabel={`Delete ${item.name}`}
        >
          <Trash2 size={11} color="#FFFFFF" />
          <Text className="text-xs font-semibold text-white">Delete</Text>
        </Button>
      </View>
    </ListCard>
  );
};

export default AmenityMasterCard;
