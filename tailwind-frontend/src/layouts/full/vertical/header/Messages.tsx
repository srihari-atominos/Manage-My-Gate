import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu';
import { Badge } from 'src/components/ui/badge';
import { Button } from 'src/components/ui/button';
// @ts-ignore
import useNotifications from 'src/features/notification/hooks/useNotifications.js';

// Format relative time using native Intl API
const formatRelativeTime = (dateString: string, locale: string = 'en') => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((Number(now) - Number(date)) / 1000);

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
  return rtf.format(-diffInDays, 'day');
};

const getIconName = (type: string) => {
  switch (type) {
    case 'SUCCESS':
      return 'solar:check-circle-linear';
    case 'WARNING':
      return 'solar:danger-circle-linear';
    case 'ERROR':
      return 'solar:close-circle-linear';
    case 'INFO':
    default:
      return 'solar:info-circle-linear';
  }
};

const getIconColorClass = (type: string) => {
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

const Messages = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, fetchNotifications, handleMarkAsRead } = useNotifications();

  // Load first page of notifications on mount
  useEffect(() => {
    fetchNotifications(1, 10);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNotificationClick = async (notif: any) => {
    const id = notif.id || notif._id;
    if (!notif.isRead) {
      await handleMarkAsRead(id);
    }
    if (notif.actionUrl) {
      let url = notif.actionUrl;
      if (url.startsWith('/complaints/') || url.startsWith('/admin/complaints')) {
        url = '/complaints';
      } else if (url === '/assignee') {
        url = '/admin/complaints/assignee';
      } else if (url.startsWith('#/')) {
        url = url.replace('#', '');
      }
      navigate(url);
    }
  };

  const topNotifications = notifications.slice(0, 5);

  return (
    <div className="relative group/menu px-4 sm:px-15 ">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <span className="relative after:absolute after:w-10 after:h-10 after:rounded-full hover:text-primary after:-top-1/2 hover:after:bg-lightprimary text-foreground dark:text-muted-foreground rounded-full flex justify-center items-center cursor-pointer group-hover/menu:after:bg-lightprimary group-hover/menu:!text-primary">
              <Icon icon="tabler:bell-ringing" height={20} />
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full absolute -end-[6px] -top-[5px] text-[8px] h-4 w-4 bg-primary flex justify-center items-center text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-screen sm:w-[320px] py-6 rounded-md border border-stroke dark:border-strokedark bg-white dark:bg-boxdark"
        >
          <div className="flex items-center px-6 justify-between border-b border-stroke dark:border-strokedark pb-3">
            <h3 className="mb-0 text-sm font-bold text-black dark:text-white">Notifications</h3>
            {unreadCount > 0 && <Badge variant="lightPrimary" className="text-2xs font-semibold">{unreadCount} New</Badge>}
          </div>

          <SimpleBar className="max-h-80 mt-3">
            {topNotifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
                No new notifications
              </div>
            ) : (
              topNotifications.map((notif: any, index: number) => {
                const iconColorClass = getIconColorClass(notif.type);
                const iconName = getIconName(notif.type);
                return (
                  <DropdownMenuItem
                    className={`px-6 py-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-meta-4/10 group/link w-full border-b border-stroke/50 dark:border-strokedark/50 cursor-pointer ${
                      !notif.isRead ? 'bg-slate-50/50 dark:bg-meta-4/5' : ''
                    }`}
                    key={notif.id || notif._id || index}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start w-full gap-3">
                      <span className={`shrink-0 rounded-full p-2 flex items-center justify-center ${iconColorClass}`}>
                        <Icon icon={iconName} width="16" height="16" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h5 className={`mb-0.5 text-xs text-black dark:text-white truncate ${!notif.isRead ? 'font-bold' : 'font-medium'}`}>
                          {notif.title}
                        </h5>
                        <span className="text-[11px] block truncate text-gray-500 dark:text-gray-400">
                          {notif.body}
                        </span>
                        <span className="text-[9px] block text-gray-400 dark:text-gray-500 mt-1">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      {!notif.isRead && (
                        <span className="h-1.5 w-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })
            )}
          </SimpleBar>

          <div className="pt-4 px-6 border-t border-stroke dark:border-strokedark mt-3">
            <Button 
              variant="outline" 
              className="w-full text-xs h-9 bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white"
              onClick={() => navigate('/notifications')}
            >
              See All Notifications
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Messages;
