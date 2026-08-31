import React from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonProps } from '@/components/ui/Skeleton';

export interface SkeletonLoaderProps extends SkeletonProps {
  lines?: number;
}

export function SkeletonLoader({
  variant = 'card',
  count = 1,
  lines,
  ...props
}: SkeletonLoaderProps) {
  const effectiveCount = lines || count;
  return <Skeleton variant={variant} count={effectiveCount} {...props} />;
}

export default SkeletonLoader;
