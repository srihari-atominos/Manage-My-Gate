import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import {
  Bell,
  CheckCheck,
  Trash2,
  QrCode,
  CreditCard,
  AlertCircle,
  BellRing,
  Search,
  Info,
  ChevronRight,
  RotateCcw,
} from 'lucide-react-native';
import { useNotifications } from '@/src/features/notification/hooks/useNotifications';
import { NotificationItemData } from '@/src/features/notification/services/notificationService';
import { mapActionUrlToMobileRoute } from '@/src/features/notification/utils/notificationNavigation';
import { getStatusTabStyle } from '@/components/ui/statusTabColors';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/src/utils/i18n';

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    items,
    unreadCount,
    pagination,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Filter items based on active tab
  const filteredItems = React.useMemo(() => {
    if (activeTab === 'unread') {
      return items.filter((item) => !item.isRead);
    }
    return items;
  }, [items, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchNotifications(1, 15);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (
      !loading &&
      pagination &&
      pagination.currentPage < pagination.totalPages
    ) {
      fetchNotifications(pagination.currentPage + 1, 15);
    }
  };

  const handleNotificationPress = (notification: NotificationItemData) => {
    const id = notification.id || notification._id;
    if (id && !notification.isRead) {
      markAsRead(id);
    }
    if (notification.actionUrl) {
      const route = mapActionUrlToMobileRoute(
        notification.actionUrl,
        notification.type
      );
      router.push(route as any);
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'VISITOR':
        return <QrCode size={20} color="#2563EB" />;
      case 'BILLING':
      case 'FINANCIAL':
        return <CreditCard size={20} color="#16A34A" />;
      case 'COMPLAINT':
      case 'WARNING':
      case 'ERROR':
        return <AlertCircle size={20} color="#DC2626" />;
      case 'NOTICE':
      case 'COMMUNITY':
        return <BellRing size={20} color="#DB2777" />;
      case 'AMENITY':
        return <Search size={20} color="#7C3AED" />;
      default:
        return <Info size={20} color="#2563EB" />;
    }
  };

  const formatTimeAgo = (createdAtString?: string) => {
    if (!createdAtString) return t('just_now', 'Just now');
    const date = new Date(createdAtString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return t('just_now', 'Just now');
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderNotificationCard = (notification: NotificationItemData) => {
    const notifId =
      notification.id || notification._id || Math.random().toString();
    const isUnread = !notification.isRead;

    return (
      <TouchableOpacity
        key={notifId}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.8}
        className={`p-4 rounded-2xl border flex-row items-start gap-3.5 mb-2.5 shadow-xs ${
          isUnread
            ? 'bg-primary/10 border-primary/30'
            : 'bg-card border-border/80'
        }`}
      >
        {/* Unread Amber/Gold Dot */}
        {isUnread && (
          <View className="size-2 rounded-full bg-primary absolute top-3.5 right-3.5" />
        )}

        {/* Notification Type Icon Wrapper */}
        <View className="p-3 rounded-2xl bg-secondary border border-border/60 shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </View>

        {/* Content Section */}
        <View className="flex-1 pr-3 justify-center">
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-[13px] tracking-tight ${
                isUnread
                  ? 'text-foreground font-black'
                  : 'text-foreground/90 font-bold'
              }`}
              numberOfLines={1}
            >
              {notification.title || t('system_notification', 'System Notification')}
            </Text>
            <Text className="text-[10px] text-muted-foreground font-medium">
              {formatTimeAgo(notification.createdAt)}
            </Text>
          </View>

          <Text
            className="text-[12px] text-muted-foreground mt-1 leading-[17px]"
            numberOfLines={3}
          >
            {notification.body || ''}
          </Text>

          {/* Action Link Tag */}
          {notification.actionUrl && (
            <View className="flex-row items-center gap-1 mt-2.5">
              <Text className="text-[11px] font-bold text-primary">
                {t('view_details', 'View details')}
              </Text>
              <ChevronRight size={12} color="#FF6A00" />
            </View>
          )}
        </View>

        {/* Delete Action Button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            deleteNotification(notifId);
          }}
          activeOpacity={0.7}
          className="p-1.5 self-center shrink-0 rounded-full bg-secondary/80 border border-border/40"
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
        >
          <Trash2 size={14} className="text-muted-foreground" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenShell
      title={t('notifications', 'Notifications')}
      subtitle={
        unreadCount > 0
          ? `${unreadCount} ${t('unread_notifications', 'unread alerts')}`
          : t('all_caught_up', 'All notifications and activity logs')
      }
      iconName="Bell"
      showBackButton={true}
      headerRight={
        unreadCount > 0 ? (
          <TouchableOpacity
            onPress={markAllAsRead}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 bg-primary/10 border border-primary/25 px-2.5 py-1.5 rounded-full shadow-xs"
          >
            <CheckCheck size={13} color="#FF6A00" />
            <Text className="text-[11px] font-bold text-primary font-sans">
              {t('mark_all_read', 'Read all')}
            </Text>
          </TouchableOpacity>
        ) : null
      }
    >
      <View className="flex-1 px-4 pt-3">
        {/* Filter Tabs (All / Unread) */}
        <View className="flex-row items-center gap-2 mb-3 pb-1">
          <TouchableOpacity
            onPress={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-full border ${
              getStatusTabStyle('all', activeTab === 'all').containerClass
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                getStatusTabStyle('all', activeTab === 'all').textClass
              }`}
            >
              {t('all', 'All')} ({items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('unread')}
            className={`px-4 py-1.5 rounded-full border ${
              getStatusTabStyle('warning', activeTab === 'unread').containerClass
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                getStatusTabStyle('warning', activeTab === 'unread').textClass
              }`}
            >
              {t('unread', 'Unread')} ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Full-Page Paginated List with Infinity Scroll & Pull to Refresh */}
        <PaginatedList<NotificationItemData>
          data={filteredItems}
          renderItem={(item) => renderNotificationCard(item)}
          pagination={{
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            totalRecords: pagination.totalRecords,
            limit: 15,
          }}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          loading={loading}
          refreshing={refreshing}
          emptyIcon="Bell"
          emptyTitle={
            activeTab === 'unread'
              ? t('no_unread_notifications', 'No Unread Notifications')
              : t('no_notifications', 'No Notifications')
          }
          emptySubtitle={
            activeTab === 'unread'
              ? t('caught_up_subtitle', 'You have caught up with all unread notifications!')
              : t('no_notifications_desc', 'Gate alerts, booking updates and broadcasts will appear here.')
          }
          contentContainerClassName="pb-16"
        />
      </View>
    </ScreenShell>
  );
}
