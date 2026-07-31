import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CIcon from '@coreui/icons-react';
import { cilBell } from '@coreui/icons';
import useNotifications from '../hooks/useNotifications.js';
import useMediaQuery from '../../../hooks/useMediaQuery.js';
import NotificationPopover from './NotificationPopover.jsx';
import '../styles/_notification.scss';

/**
 * Global Header Trigger component representing the notifications bell icon.
 * Dynamically handles layout changes (dropdown on desktop vs redirect on mobile).
 *
 * @component
 */
export const NotificationBell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { unreadCount, fetchNotifications } = useNotifications();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Responsive breakpoint check (mobile if viewport < 768px)
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Load initial page of notifications on mount
  useEffect(() => {
    fetchNotifications(1, 10);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBellClick = (e) => {
    e.preventDefault();
    if (isMobile) {
      setIsPopoverOpen(false);
      navigate('/notifications');
    } else {
      setIsPopoverOpen((prev) => !prev);
    }
  };

  const handleClosePopover = () => {
    setIsPopoverOpen(false);
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="notification-bell-container">
      <button
        type="button"
        className="btn btn-link nav-link p-0 d-flex align-items-center"
        onClick={handleBellClick}
        title={t('notification.bellTitle')}
        aria-label={t('notification.bellTitle')}
        aria-haspopup={!isMobile}
        aria-expanded={isPopoverOpen}
        id="notification-bell-trigger-btn"
      >
        <CIcon icon={cilBell} size="lg" className="bell-icon" />
        {unreadCount > 0 && (
          <span className="unread-badge" id="unread-notifications-badge-count">
            {displayCount}
          </span>
        )}
      </button>

      {/* Render Popover only on desktop layouts */}
      {!isMobile && (
        <NotificationPopover
          isOpen={isPopoverOpen}
          onClose={handleClosePopover}
        />
      )}
    </div>
  );
};

export default NotificationBell;
