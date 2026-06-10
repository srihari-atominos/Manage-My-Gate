import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilBell } from '@coreui/icons';
import useNotifications from '../hooks/useNotifications.js';
import NotificationItem from './NotificationItem.jsx';
import '../styles/_notification.scss';

/**
 * Dropdown Popover rendering notification list for desktop layouts.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls the visibility of the popover
 * @param {Function} props.onClose - Callback to close the popover
 */
export const NotificationPopover = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const popoverRef = useRef(null);

  const {
    notifications,
    status,
    hasMore,
    fetchNextPage,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
  } = useNotifications();

  // Handle click outside to close popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        !event.target.closest('.notification-bell-container')
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMarkAllClick = (e) => {
    e.preventDefault();
    handleMarkAllAsRead();
  };

  const handleLoadMoreClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    fetchNextPage();
  };

  return (
    <div className="notification-popover" ref={popoverRef} role="dialog" aria-label={t('notification.panelTitle')}>
      {/* Popover Header */}
      <div className="popover-header">
        <h6>{t('notification.title')}</h6>
        {notifications.some(n => !n.isRead) && (
          <button
            type="button"
            className="mark-all-btn"
            onClick={handleMarkAllClick}
            id="mark-all-notifications-read-popover"
          >
            {t('notification.markAllRead')}
          </button>
        )}
      </div>

      {/* Popover Body (List container) */}
      <div className="popover-body">
        {notifications.length === 0 ? (
          <div className="notification-empty-state">
            <CIcon icon={cilBell} size="xl" className="empty-icon" />
            <p>{t('notification.empty')}</p>
          </div>
        ) : (
          <div className="notification-list-container">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id || notification._id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Load More/Spinner section */}
        {status === 'loading' && (
          <div className="d-flex justify-content-center p-3">
            <CSpinner color="primary" size="sm" />
          </div>
        )}

        {status !== 'loading' && hasMore && (
          <div className="notification-load-more-container">
            <button
              type="button"
              className="load-more-btn"
              onClick={handleLoadMoreClick}
              id="load-more-notifications-popover"
            >
              {t('notification.loadMore')}
            </button>
          </div>
        )}
      </div>

      {/* Popover Footer */}
      <div className="popover-footer">
        <Link to="/notifications" className="view-all-link" onClick={onClose}>
          {t('notification.viewAll')}
        </Link>
      </div>
    </div>
  );
};

NotificationPopover.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default NotificationPopover;
