import React from 'react';
import { View, Image, Pressable, TouchableOpacity } from 'react-native';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Amenity } from '../store/amenitySlice';
import { Users, Clock, Edit2, Power, Trash2, Building2, MapPin, Sparkles, Timer } from 'lucide-react-native';
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
  const slotDuration = item.bookingRules?.slotDurationMinutes || 60;
  const category = item.category || item.type || 'Facility';
  const imageUrl = item.imageUrl || (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '');
  const priceDisplay = baseRate ? `₹${baseRate}/${pricingType === 'daily' ? 'day' : 'slot'}` : 'Free Access';

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.name} master details`}
      className="bg-card rounded-3xl border border-border/80 overflow-hidden mb-4 shadow-sm active:opacity-95"
    >
      {/* 1. Hero Cover Image Header */}
      <View className="h-44 w-full relative bg-muted overflow-hidden">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-primary/10">
            <Building2 size={44} className="text-primary/50" />
          </View>
        )}

        {/* Top Badges Row */}
        <View className="absolute top-3 inset-x-3 flex-row justify-between items-center z-10">
          {/* Category Pill */}
          <View className="bg-black/60 px-3 py-1 rounded-full flex-row items-center gap-1.5 border border-white/20 shadow-xs">
            <Sparkles size={11} color="#f59e0b" />
            <Text className="text-xs font-bold text-white uppercase tracking-wider">
              {category}
            </Text>
          </View>

          {/* Status Badge */}
          <StatusBadge
            label={statusMeta.label}
            variant={statusMeta.variant}
            dot={isActive}
          />
        </View>

        {/* Bottom-Right Price Tag Pill on Image */}
        <View className="absolute bottom-3 right-3 z-10">
          <View className="bg-card/95 px-3 py-1.5 rounded-xl border border-border/70 shadow-sm flex-row items-center gap-1">
            <Text className="text-[11px] font-semibold text-muted-foreground">Fee:</Text>
            <Text className="text-xs font-extrabold text-primary">
              {priceDisplay}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Card Content & Metadata Body */}
      <View className="p-4">
        {/* Title & Location */}
        <View className="mb-2">
          <Text className="text-lg font-extrabold text-foreground tracking-tight">
            {item.name}
          </Text>
          <View className="flex-row items-center gap-1 mt-1">
            <MapPin size={13} className="text-muted-foreground" />
            <Text className="text-xs font-medium text-muted-foreground">
              {item.location || 'Community Center'}
            </Text>
          </View>
        </View>

        {/* Spec Chips Row */}
        <View className="flex-row flex-wrap items-center gap-2 pt-2.5 border-t border-border/40">
          <View className="flex-row items-center gap-1.5 bg-secondary/80 px-2.5 py-1 rounded-lg">
            <Users size={12} className="text-muted-foreground" />
            <Text className="text-[11px] font-semibold text-foreground">
              Cap: {item.capacity || 20}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5 bg-secondary/80 px-2.5 py-1 rounded-lg">
            <Clock size={12} className="text-muted-foreground" />
            <Text className="text-[11px] font-semibold text-foreground">
              {openTime} - {closeTime}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5 bg-secondary/80 px-2.5 py-1 rounded-lg">
            <Timer size={12} className="text-muted-foreground" />
            <Text className="text-[11px] font-semibold text-foreground">
              {pricingType === 'daily' ? 'Full Day' : `${slotDuration}m`}
            </Text>
          </View>
        </View>

        {/* 3. Admin Action Controls Row */}
        <View className="flex-row items-center justify-between gap-2 pt-3 mt-3 border-t border-border/40">
          <Button
            variant="edit"
            size="sm"
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onEdit(item);
            }}
            className="flex-1 flex-row items-center justify-center gap-1.5 h-9 rounded-xl"
            accessibilityLabel={`Edit ${item.name}`}
          >
            <Edit2 size={13} color="#059669" />
            <Text>Edit</Text>
          </Button>

          <Button
            variant={isActive ? 'warning' : 'info'}
            size="sm"
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onToggleStatus(item);
            }}
            className="flex-1 flex-row items-center justify-center gap-1.5 h-9 rounded-xl"
            accessibilityLabel={isActive ? `Deactivate ${item.name}` : `Activate ${item.name}`}
          >
            <Power size={13} color={isActive ? '#d97706' : '#245fa8'} />
            <Text>{isActive ? 'Deactivate' : 'Activate'}</Text>
          </Button>

          <Button
            variant="destructive-outline"
            size="sm"
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onDelete(item);
            }}
            className="flex-1 flex-row items-center justify-center gap-1.5 h-9 rounded-xl"
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Trash2 size={13} color="#e11d48" />
            <Text>Delete</Text>
          </Button>
        </View>
      </View>
    </Pressable>
  );
};

export default AmenityMasterCard;
