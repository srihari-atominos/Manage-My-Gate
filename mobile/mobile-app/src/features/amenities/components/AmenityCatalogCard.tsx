import React from 'react';
import { View, Image, Pressable, TouchableOpacity } from 'react-native';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Amenity } from '../store/amenitySlice';
import { cn } from '@/lib/utils';
import { MapPin, Users, Clock, Timer, CalendarCheck, Building2, Sparkles } from 'lucide-react-native';

export interface AmenityCatalogCardProps {
  amenity: Amenity;
  onPress: (amenity: Amenity) => void;
  onBookClick?: (amenityId: string) => void;
}

/**
 * AmenityCatalogCard Component
 * Luxury standalone card layout for Amenity Discovery with high-res cover image,
 * floating category & status badges, metadata specs, and prominent reservation CTAs.
 */
export function AmenityCatalogCard({
  amenity,
  onPress,
  onBookClick,
}: AmenityCatalogCardProps) {
  const itemStatus = (amenity.status || 'active').toLowerCase();
  const currentStatus = (amenity.currentStatus || '').toLowerCase();
  const isMaintenance = itemStatus === 'maintenance' || currentStatus === 'under maintenance';
  const isInactive = itemStatus === 'inactive' || currentStatus === 'unavailable';
  const isAvailable = !isMaintenance && !isInactive && itemStatus === 'active';

  const pricingType = amenity.pricing?.pricingType || 'hourly';
  const baseRate = amenity.pricing?.baseRate ?? amenity.bookingFee ?? 0;
  const openTime = amenity.bookingRules?.openTime || amenity.openTime || '08:00';
  const closeTime = amenity.bookingRules?.closeTime || amenity.closeTime || '21:00';
  const slotDuration = amenity.bookingRules?.slotDurationMinutes || 60;
  const category = amenity.category || amenity.type || 'Facility';
  const imageUrl = amenity.imageUrl || (Array.isArray(amenity.images) && amenity.images.length > 0 ? amenity.images[0] : '');

  const statusLabel = isMaintenance ? 'Under Maintenance' : isInactive ? 'Inactive' : 'Available';
  const statusVariant: StatusVariant = isMaintenance ? 'warning' : isInactive ? 'neutral' : 'success';
  const priceDisplay = baseRate ? `₹${baseRate}/${pricingType === 'daily' ? 'day' : 'slot'}` : 'Free Access';

  return (
    <View className="bg-card rounded-3xl border border-border/80 overflow-hidden mb-4 shadow-sm">
      {/* 1. Clickable Card Area: Hero Cover Image & Facility Details */}
      <Pressable
        onPress={() => onPress(amenity)}
        accessibilityRole="button"
        accessibilityLabel={`View ${amenity.name} details`}
        className="active:opacity-95"
      >
        {/* Hero Cover Image with Floating Glass Badges */}
        <View className="h-48 w-full relative bg-muted overflow-hidden">
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

            {/* Status Badge with Pulsing Dot */}
            <StatusBadge
              label={statusLabel}
              variant={statusVariant}
              dot={isAvailable}
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
        <View className="p-4 pb-2">
          {/* Title & Location */}
          <View className="mb-2">
            <Text className="text-lg font-extrabold text-foreground tracking-tight">
              {amenity.name}
            </Text>
            <View className="flex-row items-center gap-1 mt-1">
              <MapPin size={13} className="text-muted-foreground" />
              <Text className="text-xs font-medium text-muted-foreground">
                {amenity.location || 'Clubhouse & Community Zone'}
              </Text>
            </View>
          </View>

          {/* Optional Description Snippet */}
          {amenity.description ? (
            <Text numberOfLines={2} className="text-xs text-muted-foreground/90 leading-relaxed mb-3">
              {amenity.description}
            </Text>
          ) : null}

          {/* Spec Chips Row */}
          <View className="flex-row flex-wrap items-center gap-2 pt-2.5 border-t border-border/40">
            <View className="flex-row items-center gap-1.5 bg-secondary/80 px-2.5 py-1 rounded-lg">
              <Users size={12} className="text-muted-foreground" />
              <Text className="text-[11px] font-semibold text-foreground">
                Max {amenity.capacity || 20} persons
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
                {pricingType === 'daily' ? 'Full Day Access' : `${slotDuration}m slots`}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* 3. Primary Action Footer CTA (Separated from outer Pressable to prevent nested HTML <button> hydration errors) */}
      {onBookClick ? (
        <View className="px-4 pb-4 pt-1">
          <Button
            variant={isAvailable ? 'default' : 'outline'}
            size="default"
            disabled={!isAvailable}
            onPress={() => onBookClick(amenity._id)}
            className="w-full h-11 rounded-2xl flex-row items-center justify-center gap-2 shadow-xs"
            accessibilityRole="button"
            accessibilityLabel={`Reserve ${amenity.name}`}
          >
            <CalendarCheck size={16} className={isAvailable ? 'text-primary-foreground' : 'text-muted-foreground'} />
            <Text
              className={cn(
                'text-xs font-bold',
                isAvailable ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {isMaintenance ? 'Under Maintenance' : isInactive ? 'Facility Inactive' : 'Reserve & Book Slot'}
            </Text>
          </Button>
        </View>
      ) : null}
    </View>
  );
}

export default AmenityCatalogCard;
