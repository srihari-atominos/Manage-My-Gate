/**
 * @deprecated Badge from `@/components/common/Badge` is deprecated.
 * Please import canonical `StatusBadge` from `@/components/ui/StatusBadge` or `@/components`.
 */
import React from 'react';
import { StatusBadge, type StatusBadgeProps, type StatusVariant } from '@/components/ui/StatusBadge';

export interface BadgeProps extends Omit<StatusBadgeProps, 'variant'> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'danger' | 'info' | 'neutral' | 'critical' | 'outline';
}

const mapLegacyVariant = (variant?: string): StatusVariant => {
  switch (variant) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
    case 'danger':
      return 'danger';
    case 'info':
    case 'primary':
      return 'info';
    case 'critical':
      return 'critical';
    case 'default':
    case 'outline':
    case 'neutral':
    default:
      return 'neutral';
  }
};

export const Badge = ({ variant = 'neutral', ...props }: BadgeProps) => {
  return <StatusBadge variant={mapLegacyVariant(variant)} {...props} />;
};

export { StatusBadge };
export default Badge;
