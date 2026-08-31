import { KPICard, type KPICardProps } from './KPICard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, ScrollView, View } from 'react-native';

export const kpiRowVariants = cva(
  cn(
    'w-full',
    Platform.select({
      web: 'overflow-x-auto',
    })
  ),
  {
    variants: {
      layout: {
        scroll: 'flex-row',
        grid: 'flex-row flex-wrap',
      },
    },
    defaultVariants: {
      layout: 'scroll',
    },
  }
);

export interface KPIRowProps extends VariantProps<typeof kpiRowVariants> {
  cards: KPICardProps[];
  loading?: boolean;
  layout?: 'scroll' | 'grid';
  className?: string;
  contentContainerClassName?: string;
  skeletonCount?: number;
}

const KPIRow = React.forwardRef<ScrollView, KPIRowProps>(
  (
    {
      cards = [],
      loading = false,
      layout = 'scroll',
      className,
      contentContainerClassName,
      skeletonCount = 3,
    },
    ref
  ) => {
    if (loading) {
      if (layout === 'grid') {
        return (
          <View
            className={cn(
              'w-full flex-row flex-wrap ps-4 pe-4 gap-x-3 gap-y-3',
              className
            )}
          >
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <View key={index} className="flex-1 min-w-[140px]">
                <Skeleton variant="kpi" className="w-full h-24 rounded-xl" />
              </View>
            ))}
          </View>
        );
      }

      return (
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName={cn(
            'flex-row items-center ps-4 pe-4 gap-x-3',
            contentContainerClassName
          )}
          contentContainerStyle={{
            paddingStart: 16,
            paddingEnd: 16,
            columnGap: 12,
          }}
          className={cn(kpiRowVariants({ layout }), className)}
        >
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <Skeleton key={index} variant="kpi" className="w-[150px] h-24 rounded-xl" />
          ))}
        </ScrollView>
      );
    }

    if (layout === 'grid') {
      return (
        <View
          className={cn(
            'w-full flex-row flex-wrap ps-4 pe-4 gap-x-3 gap-y-3',
            className
          )}
        >
          {cards.map((card, index) => (
            <View key={index} className="flex-1 min-w-[140px]">
              <KPICard
                key={index}
                variant={card.variant || 'default'}
                {...card}
                className={cn('w-full', card.className)}
              />
            </View>
          ))}
        </View>
      );
    }

    return (
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={cn(
          'flex-row items-center ps-4 pe-4 gap-x-3',
          contentContainerClassName
        )}
        contentContainerStyle={{
          paddingStart: 16,
          paddingEnd: 16,
          columnGap: 12,
        }}
        className={cn(kpiRowVariants({ layout }), className)}
      >
        {cards.map((card, index) => (
          <KPICard
            key={index}
            variant={card.variant || 'default'}
            {...card}
          />
        ))}
      </ScrollView>
    );
  }
);

KPIRow.displayName = 'KPIRow';

export { KPIRow };
export default KPIRow;

