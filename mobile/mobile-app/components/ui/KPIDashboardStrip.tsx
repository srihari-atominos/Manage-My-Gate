import React from 'react';
import { View, ScrollView, Platform } from 'react-native';
import { KPICard, type KPICardProps } from './KPICard';
import { Skeleton } from './Skeleton';
import { cn } from '../../lib/utils';

export interface KPIDashboardStripProps {
  cards: KPICardProps[];
  loading?: boolean;
  layout?: 'auto' | 'grid2x2' | 'carousel' | 'row' | 'row3';
  className?: string;
  contentContainerClassName?: string;
  skeletonCount?: number;
}

export function KPIDashboardStrip({
  cards = [],
  loading = false,
  layout = 'auto',
  className,
  contentContainerClassName,
  skeletonCount,
}: KPIDashboardStripProps) {
  // Determine layout mode
  const effectiveLayout = React.useMemo(() => {
    if (layout !== 'auto') return layout;
    if (cards.length === 4) return 'grid2x2';
    if (cards.length === 3) return 'row3';
    if (cards.length === 2) return 'row';
    return 'carousel';
  }, [layout, cards.length]);

  const count = skeletonCount || (effectiveLayout === 'grid2x2' ? 4 : effectiveLayout === 'row3' ? 3 : effectiveLayout === 'row' ? 2 : Math.max(cards.length, 3));

  // Skeleton Loading State
  if (loading) {
    if (effectiveLayout === 'grid2x2') {
      return (
        <View className={cn('flex-row flex-wrap gap-3', className)}>
          {Array.from({ length: count }).map((_, idx) => (
            <View key={idx} className="w-[48%] min-w-[140px]">
              <Skeleton variant="kpi" className="w-full h-28 rounded-xl" />
            </View>
          ))}
        </View>
      );
    }

    if (effectiveLayout === 'row3') {
      return (
        <View className={cn('flex-row gap-2.5 w-full', className)}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <View key={idx} className="flex-1 min-w-0">
              <Skeleton variant="kpi" className="w-full h-24 rounded-xl" />
            </View>
          ))}
        </View>
      );
    }

    if (effectiveLayout === 'row') {
      return (
        <View className={cn('flex-row gap-3', className)}>
          {Array.from({ length: count }).map((_, idx) => (
            <View key={idx} className="flex-1 min-w-[140px]">
              <Skeleton variant="kpi" className="w-full h-28 rounded-xl" />
            </View>
          ))}
        </View>
      );
    }

    // Carousel skeleton
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
        className={cn('w-full', className)}
        contentContainerClassName={cn('flex-row gap-3', contentContainerClassName)}
      >
        {Array.from({ length: count }).map((_, idx) => (
          <View key={idx} className="w-36">
            <Skeleton variant="kpi" className="w-full h-28 rounded-xl" />
          </View>
        ))}
      </ScrollView>
    );
  }

  // 1. 2x2 Grid Layout (for exactly 4 metrics)
  if (effectiveLayout === 'grid2x2') {
    return (
      <View className={cn('flex-row flex-wrap justify-between gap-y-3', className)}>
        {cards.map((card, idx) => (
          <View key={card.title || idx} className="w-[48.5%]">
            <KPICard {...card} className={cn('w-full min-w-0', card.className)} />
          </View>
        ))}
      </View>
    );
  }

  // 2. 3-Column Balanced Row Layout (for exactly 3 metrics)
  if (effectiveLayout === 'row3') {
    return (
      <View className={cn('flex-row gap-2.5 w-full', className)}>
        {cards.map((card, idx) => (
          <View key={card.title || idx} className="flex-1 min-w-0">
            <KPICard {...card} className={cn('w-full min-w-0 p-3', card.className)} />
          </View>
        ))}
      </View>
    );
  }

  // 3. 2-Column Balanced Row Layout (for 2 metrics)
  if (effectiveLayout === 'row') {
    return (
      <View className={cn('flex-row gap-3', className)}>
        {cards.map((card, idx) => (
          <View key={card.title || idx} className="flex-1 min-w-[140px]">
            <KPICard {...card} className={cn('w-full', card.className)} />
          </View>
        ))}
      </View>
    );
  }

  // 4. Horizontal Scrollable Carousel Layout (for 5+ metrics)
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled
      directionalLockEnabled
      keyboardShouldPersistTaps="handled"
      className={cn('w-full', className)}
      contentContainerClassName={cn('flex-row gap-3', contentContainerClassName)}
    >
      {cards.map((card, idx) => (
        <View key={card.title || idx} className="w-36">
          <KPICard {...card} className={cn('w-full min-w-[140px]', card.className)} />
        </View>
      ))}
    </ScrollView>
  );
}

export default KPIDashboardStrip;
