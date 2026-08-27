import React from 'react';
import { Skeleton, SkeletonProps } from '@/components/ui/Skeleton';

export interface SkeletonLoaderProps extends SkeletonProps {
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className, ...props }) => {
  return <Skeleton className={className} {...props} />;
};

export default SkeletonLoader;

