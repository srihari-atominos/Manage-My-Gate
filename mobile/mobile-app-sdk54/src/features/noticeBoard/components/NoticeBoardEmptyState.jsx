import React from 'react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { AlertTriangle } from 'lucide-react-native';

/**
 * @deprecated Use canonical `EmptyState` from `@/components/feedback/EmptyState`.
 */
export const NoticeBoardEmptyState = ({ title, description }) => {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title || "No Notices Available"}
      description={description || "Check back later for community updates and announcements."}
    />
  );
};

export default NoticeBoardEmptyState;
