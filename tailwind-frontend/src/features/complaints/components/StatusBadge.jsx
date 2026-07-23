import React from 'react';

const getStatusClasses = (status) => {
  switch (status) {
    case 'Resolved':
    case 'Completed':
    case 'Closed':
      return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
    case 'In Progress':
    case 'Accepted':
    case 'Waiting for Resident':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
    case 'Escalated':
    case 'Rejected':
    case 'Cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
    case 'Assigned':
    case 'Reopened':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400';
  }
};

const StatusBadge = ({ status }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(status)}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
