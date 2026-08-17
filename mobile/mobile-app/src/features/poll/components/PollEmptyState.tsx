import React from 'react';
import { EmptyState } from '@/components';

interface PollEmptyStateProps {
  tab: 'active' | 'closed' | 'my';
}

export default function PollEmptyState({ tab }: PollEmptyStateProps) {
  let title = 'No Polls Found';
  let description = 'There are currently no polls to display.';

  if (tab === 'active') {
    title = 'No Active Polls';
    description = 'There are no active polls requiring your vote right now.';
  } else if (tab === 'closed') {
    title = 'No Closed Polls';
    description = 'There are no past polls to review.';
  } else if (tab === 'my') {
    title = 'No Polls Created';
    description = "You haven't created any polls yet.";
  }

  return (
    <EmptyState
      title={title}
      description={description}
    />
  );
}
