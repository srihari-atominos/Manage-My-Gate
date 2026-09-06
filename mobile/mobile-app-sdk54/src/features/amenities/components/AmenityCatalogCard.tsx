import React from 'react';
import { ListCard } from '@/components/ui/ListCard';
import { type StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Amenity } from '../store/amenitySlice';
import { cn } from '@/lib/utils';

export interface AmenityCatalogCardProps {
  amenity: Amenity;
  onPress: (amenity: Amenity) => void;
  onBookClick?: (amenityId: string) => void;
}

/**
 * AmenityCatalogCard Component
 * Canonical ListCard implementation for Amenity Discovery & Catalog screens.
 * Fully unified without bifurcated layouts, supporting images, badges, and reservation CTAs.
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
  const category = amenity.category || amenity.type || 'General';
  const imageUrl = amenity.imageUrl || (Array.isArray(amenity.images) && amenity.images.length > 0 ? amenity.images[0] : '');

  const statusLabel = isMaintenance ? 'Under Maintenance' : isInactive ? 'Inactive' : 'Available';
  const statusVariant: StatusVariant = isMaintenance ? 'warning' : isInactive ? 'neutral' : 'success';
  const priceDisplay = baseRate ? `$${baseRate}/${pricingType === 'daily' ? 'day' : 'slot'}` : 'Free';

  const subtitleParts = [category];
  if (amenity.location) subtitleParts.push(amenity.location);
  if (amenity.capacity) subtitleParts.push(`Cap: ${amenity.capacity}`);
  subtitleParts.push(`${openTime}-${closeTime}`);

  return (
    <ListCard
      title={amenity.name}
      subtitle={subtitleParts.join(' • ')}
      leftImage={imageUrl || undefined}
      leftIcon={!imageUrl ? (amenity.iconName || 'Building') : undefined}
      status={{
        label: statusLabel,
        variant: statusVariant,
      }}
      secondaryBadge={{
        label: priceDisplay,
        variant: baseRate ? 'info' : 'neutral',
      }}
      rightContent={
        onBookClick ? (
          <Button
            variant={isAvailable ? 'default' : 'outline'}
            size="sm"
            disabled={!isAvailable}
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onBookClick(amenity._id);
            }}
            className="h-8 px-2.5 rounded-lg shrink-0"
            accessibilityRole="button"
            accessibilityLabel={`Reserve ${amenity.name}`}
          >
            <Text
              className={cn(
                'text-xs font-semibold',
                isAvailable ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {isMaintenance ? 'Maintenance' : isInactive ? 'Inactive' : 'Reserve'}
            </Text>
          </Button>
        ) : undefined
      }
      onPress={() => onPress(amenity)}
    />
  );
}

export default AmenityCatalogCard;
