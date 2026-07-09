import React from 'react';

const StatusBadge = ({ status }) => {
  let badgeClass = 'badge-info'; // Default for things like Draft, Submitted

  switch (status) {
    case 'Resolved':
    case 'Completed':
    case 'Closed':
      badgeClass = 'badge-success';
      break;
    case 'In Progress':
    case 'Accepted':
    case 'Waiting for Resident':
      badgeClass = 'badge-warning';
      break;
    case 'Escalated':
    case 'Rejected':
    case 'Cancelled':
      badgeClass = 'badge-danger'; // Assuming badge-danger is defined in global CSS
      break;
    case 'Assigned':
    case 'Reopened':
      badgeClass = 'badge-primary'; // Assuming badge-primary is defined
      break;
    default:
      badgeClass = 'badge-info';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
