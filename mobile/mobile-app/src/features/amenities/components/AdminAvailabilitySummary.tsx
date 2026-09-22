import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Wrench, Ban } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { FacilityAvailabilityItem, AvailabilityState } from '../utils/amenityAvailabilityHelpers';
import { cn } from '@/lib/utils';

export interface AdminAvailabilitySummaryProps {
  items: FacilityAvailabilityItem[];
  className?: string;
}

const getStatusBadgeStyle = (state: AvailabilityState) => {
  switch (state) {
    case 'AVAILABLE':
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        dot: 'bg-emerald-500',
      };
    case 'PARTIALLY_AVAILABLE':
      return {
        bg: 'bg-amber-500/10 border-amber-500/30',
        text: 'text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-500',
      };
    case 'FULLY_BOOKED':
      return {
        bg: 'bg-rose-500/10 border-rose-500/30',
        text: 'text-rose-700 dark:text-rose-400',
        dot: 'bg-rose-500',
      };
    case 'MAINTENANCE':
      return {
        bg: 'bg-orange-500/10 border-orange-500/30',
        text: 'text-orange-700 dark:text-orange-400',
        dot: 'bg-orange-500',
      };
    case 'BLOCKED':
    default:
      return {
        bg: 'bg-muted border-border',
        text: 'text-muted-foreground',
        dot: 'bg-muted-foreground',
      };
  }
};

export function AdminAvailabilitySummary({ items, className }: AdminAvailabilitySummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  return (
    <View className={cn('bg-card rounded-xl border border-border/70 p-2.5 shadow-2xs', className)}>
      {/* Top Header Line with Toggle */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between"
        accessibilityRole="button"
        accessibilityLabel="Toggle availability breakdown"
      >
        <View className="flex-row items-center gap-1.5 flex-1 pr-2">
          <Text className="text-xs font-bold text-foreground">Availability</Text>
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
            • {items.length} {items.length === 1 ? 'facility' : 'facilities'}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Text className="text-[10px] text-primary font-medium">
            {isExpanded ? 'Collapse' : 'Expand'}
          </Text>
          <Icon
            as={isExpanded ? ChevronUp : ChevronDown}
            size={14}
            className="text-primary"
          />
        </View>
      </Pressable>

      {/* Compact Horizontal Scroll Row (Default View) */}
      {!isExpanded && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row gap-2 mt-1.5"
        >
          {items.map((item) => {
            const style = getStatusBadgeStyle(item.state);
            return (
              <View
                key={item.facilityId}
                className={cn(
                  'flex-row items-center gap-1.5 px-2 py-0.5 rounded-lg border',
                  style.bg
                )}
              >
                <View className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                <Text className="text-[11px] font-semibold text-foreground">
                  {item.facilityName}:
                </Text>
                <Text className={cn('text-[11px] font-bold', style.text)}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Expanded Grid View */}
      {isExpanded && (
        <View className="gap-1.5 mt-2 pt-2 border-t border-border/40">
          {items.map((item) => {
            const style = getStatusBadgeStyle(item.state);
            return (
              <View
                key={item.facilityId}
                className="flex-row items-center justify-between py-1 px-1"
              >
                <Text className="text-xs font-medium text-foreground flex-1 pr-2">
                  {item.facilityName}
                </Text>
                <View
                  className={cn(
                    'flex-row items-center gap-1 px-2 py-0.5 rounded-full border',
                    style.bg
                  )}
                >
                  <View className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                  <Text className={cn('text-[10px] font-bold', style.text)}>
                    {item.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default AdminAvailabilitySummary;
