import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
// @ts-ignore
import useNotifications from '../hooks/useNotifications.js';
import NotificationItem from '../components/NotificationItem.jsx';
import PageHeader from '../../../components/common/PageHeader.jsx';
import { Button } from 'src/components/ui/button';
import { Alert, AlertDescription } from 'src/components/ui/alert';

export const NotificationView = () => {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    status,
    pagination,
    error,
    fetchNotifications,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
  } = useNotifications();

  const { currentPage, totalPages, totalRecords } = pagination;
  const limit = 10;

  // On initial mount, fetch the first page
  useEffect(() => {
    fetchNotifications(1, limit);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchNotifications(currentPage - 1, limit);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchNotifications(currentPage + 1, limit);
    }
  };

  const handlePageClick = (pageNumber) => {
    fetchNotifications(pageNumber, limit);
  };

  // Generate page numbers array to render
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  const startIndex = (currentPage - 1) * limit;
  const currentPageNotifications = notifications.slice(startIndex, startIndex + limit);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('notification.fullViewTitle', 'Notifications')}
        subtitle={t('notification.fullViewSubtitle', 'Stay updated on community alerts, visits, and complaints.')}
        actionButtons={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              id="mark-all-notifications-read-view"
              className="text-xs font-semibold bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              {t('notification.markAllRead', 'Mark All Read')}
            </Button>
          ) : null
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Notifications Card */}
      <div className="rounded-xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-stroke dark:border-strokedark bg-slate-50 dark:bg-meta-4/20">
          <span className="font-semibold text-sm text-black dark:text-white">
            {t('notification.totalCount', 'Total: {{count}}', { count: totalRecords })}
          </span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-xs font-bold px-2.5 py-0.5">
              {t('notification.unreadCount', '{{count}} New', { count: unreadCount })}
            </span>
          )}
        </div>

        <div>
          {status === 'loading' && currentPageNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Loading notifications...</div>
            </div>
          ) : currentPageNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="h-10 w-10 text-gray-400 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('notification.empty', 'No notifications found.')}</p>
            </div>
          ) : (
            <div className="divide-y divide-stroke dark:divide-strokedark">
              {currentPageNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id || notification._id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Page-by-Page Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-stroke dark:border-strokedark bg-slate-50 dark:bg-meta-4/20">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('notification.paginationInfo', 'Showing {{start}} - {{end}} of {{total}}', {
                start: startIndex + 1,
                end: Math.min(startIndex + limit, totalRecords),
                total: totalRecords,
              })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1 || status === 'loading'}
                aria-label={t('notification.prevPage', 'Previous Page')}
                className="h-8 w-8 p-0 bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {pageNumbers.map((num) => (
                <Button
                  key={num}
                  variant={num === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageClick(num)}
                  disabled={status === 'loading'}
                  className={`h-8 w-8 p-0 text-xs font-semibold ${
                    num === currentPage 
                      ? 'bg-primary text-white' 
                      : 'bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white'
                  }`}
                >
                  {num}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || status === 'loading'}
                aria-label={t('notification.nextPage', 'Next Page')}
                className="h-8 w-8 p-0 bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationView;
