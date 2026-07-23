import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Info, AlertTriangle, CheckCircle, XCircle, Check, Trash2 } from 'lucide-react';

const formatRelativeTime = (dateString, locale = 'en') => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (isNaN(diffInSeconds)) return '';

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-Math.max(1, diffInSeconds), 'second');
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return rtf.format(-diffInMinutes, 'minute');
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return rtf.format(-diffInHours, 'hour');
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return rtf.format(-diffInDays, 'day');
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return rtf.format(-diffInMonths, 'month');
  }
  const diffInYears = Math.floor(diffInMonths / 12);
  return rtf.format(-diffInYears, 'year');
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'SUCCESS':
      return CheckCircle;
    case 'WARNING':
      return AlertTriangle;
    case 'ERROR':
      return XCircle;
    case 'INFO':
    default:
      return Info;
  }
};

const getIconColorClass = (type) => {
  switch (type) {
    case 'SUCCESS':
      return 'text-green-500 bg-green-50 dark:bg-green-950/20';
    case 'WARNING':
      return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20';
    case 'ERROR':
      return 'text-red-500 bg-red-50 dark:bg-red-950/20';
    case 'INFO':
    default:
      return 'text-blue-500 bg-blue-50 dark:bg-blue-950/20';
  }
};

export const NotificationItem = ({ notification, onMarkAsRead, onDelete, onClose }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { _id, id, title, body, type, isRead, createdAt, actionUrl } = notification;
  const notificationId = id || _id;

  const handleMarkAsReadClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onMarkAsRead && !isRead) {
      onMarkAsRead(notificationId);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      onDelete(notificationId);
    }
  };

  const IconComponent = getNotificationIcon(type);
  const iconColorClass = getIconColorClass(type);

  const containerClassNames = `flex gap-4 p-4 border-b border-stroke dark:border-strokedark transition-colors relative cursor-pointer ${
    isRead ? 'bg-white dark:bg-boxdark hover:bg-slate-50 dark:hover:bg-meta-4/5' : 'bg-slate-50/50 dark:bg-meta-4/5 hover:bg-slate-50 dark:hover:bg-meta-4/10'
  }`;

  const renderedContent = (
    <div className="flex w-full gap-3">
      {/* Unread Blue Dot */}
      {!isRead && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
      )}
      
      {/* Icon */}
      <div className={`shrink-0 rounded-full p-2 flex items-center justify-center self-start ${iconColorClass}`}>
        <IconComponent className="h-5 w-5" />
      </div>

      {/* Text Body */}
      <div className="flex-1 min-w-0">
        <h6 className={`text-sm text-black dark:text-white mb-0.5 ${!isRead ? 'font-bold' : 'font-medium'}`}>
          {title}
        </h6>
        <p className="text-gray-500 dark:text-gray-400 text-xs leading-normal">
          {body}
        </p>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 block">
          {formatRelativeTime(createdAt, i18n.language)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 self-center shrink-0">
        {!isRead && (
          <button
            type="button"
            className="flex items-center justify-center h-8 w-8 rounded-full border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-primary hover:border-primary dark:hover:text-primary dark:hover:border-primary bg-white dark:bg-meta-4"
            onClick={handleMarkAsReadClick}
            title={t('notification.markAsRead')}
            aria-label={t('notification.markAsRead')}
          >
            <Check className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          className="flex items-center justify-center h-8 w-8 rounded-full border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-danger hover:border-danger dark:hover:text-danger dark:hover:border-danger bg-white dark:bg-meta-4"
          onClick={handleDeleteClick}
          title={t('notification.clear')}
          aria-label={t('notification.clear')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  if (actionUrl) {
    let finalActionUrl = actionUrl;
    
    if (finalActionUrl.startsWith('/complaints/')) {
      finalActionUrl = '/complaints';
    } else if (finalActionUrl.startsWith('/admin/complaints')) {
      finalActionUrl = '/complaints';
    } else if (finalActionUrl === '/assignee') {
      finalActionUrl = '/admin/complaints/assignee';
    } else if (finalActionUrl.startsWith('#/')) {
      finalActionUrl = finalActionUrl.replace('#', '');
    }

    const handleClick = () => {
      if (onClose) onClose();
      navigate(finalActionUrl);
    };

    return (
      <div className={containerClassNames} onClick={handleClick}>
        {renderedContent}
      </div>
    );
  }

  return (
    <div className={containerClassNames} onClick={() => { if (onClose) onClose(); }}>
      {renderedContent}
    </div>
  );
};

NotificationItem.propTypes = {
  notification: PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    body: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['INFO', 'WARNING', 'SUCCESS', 'ERROR']).isRequired,
    isRead: PropTypes.bool.isRequired,
    createdAt: PropTypes.string.isRequired,
    actionUrl: PropTypes.string,
  }).isRequired,
  onMarkAsRead: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func,
};

export default NotificationItem;
