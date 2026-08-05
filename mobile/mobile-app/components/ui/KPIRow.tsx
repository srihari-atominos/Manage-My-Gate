import { KPICard, type KPICardProps } from './KPICard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import * as React from 'react';
import { Platform, ScrollView } from 'react-native';

export interface KPIRowProps {
  cards: KPICardProps[];
  loading?: boolean;
  className?: string;
}

const kpiRowVariants = cva(
  cn(
    'w-full flex-row',
    Platform.select({
      web: 'overflow-x-auto',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const KPIRow = React.forwardRef<ScrollView, KPIRowProps>(
  ({ cards = [], loading = false, className }, ref) => {
    if (loading) {
      return (
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          className={cn(kpiRowVariants(), className)}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="kpi" />
          ))}
        </ScrollView>
      );
    }

    return (
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        className={cn(kpiRowVariants(), className)}
      >
        {cards.map((card, index) => (
          <KPICard key={index} {...card} />
        ))}
      </ScrollView>
    );
  }
);

KPIRow.displayName = 'KPIRow';

export { KPIRow, kpiRowVariants };
