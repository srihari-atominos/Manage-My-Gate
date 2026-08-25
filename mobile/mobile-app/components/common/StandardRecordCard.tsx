import React from 'react';
import { View } from 'react-native';
import {
  ListCard,
  type ListCardProps,
  type ListCardDateSquare,
  formatRelativeTime,
} from '@/components/ui/ListCard';

/**
 * @deprecated StandardRecordCard is deprecated in favor of the canonical `ListCard` primitive (`@/components/ui/ListCard`).
 * Please import and use `ListCard` directly.
 */
export type StandardRecordCardDateSquare = ListCardDateSquare;

/**
 * @deprecated Use `ListCardProps` from `@/components/ui/ListCard`.
 */
export interface StandardRecordCardProps extends ListCardProps {
  statusBadge?: React.ReactNode;
}

/**
 * @deprecated Use `formatRelativeTime` from `@/components/ui/ListCard`.
 */
export const formatCardTimestamp = formatRelativeTime;

/**
 * @deprecated StandardRecordCard is deprecated in favor of `ListCard` (`@/components/ui/ListCard`).
 * This component is maintained as a temporary backwards-compatibility wrapper and will be removed in a future release.
 */
export const StandardRecordCard = React.forwardRef<View, StandardRecordCardProps>(
  ({ statusBadge, rightContent, ...props }, ref) => {
    const combinedRightContent = statusBadge ? (
      <>
        {statusBadge}
        {rightContent}
      </>
    ) : (
      rightContent
    );

    return <ListCard ref={ref} rightContent={combinedRightContent} {...props} />;
  }
);

StandardRecordCard.displayName = 'StandardRecordCard';

export default StandardRecordCard;