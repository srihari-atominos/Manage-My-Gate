import React from 'react';
import { Button } from 'src/components/ui/button';

const InviteUserButton = ({ onClick }) => {
  return (
    <Button
      id="um-invite-btn"
      variant="default"
      size="sm"
      onClick={onClick}
      className="text-xs font-semibold text-nowrap rounded"
    >
      + Invite User
    </Button>
  );
};

export default InviteUserButton;
