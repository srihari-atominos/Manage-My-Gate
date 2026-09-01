import React, { useEffect } from 'react';
import { View, Pressable, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import {
  Bell,
  X,
  QrCode,
  CreditCard,
  AlertCircle,
  BellRing,
  Search,
  Info,
} from 'lucide-react-native';
import { NotificationItemData } from '@/src/features/notification/services/notificationService';
import { cn } from '@/lib/utils';

export interface RealtimeNotificationToastProps {
  notification: NotificationItemData | null;
  onDismiss: () => void;
  onPressBanner?: (notification: NotificationItemData) => void;
  autoDismissDuration?: number;
  className?: string;
}

export const RealtimeNotificationToast: React.FC<RealtimeNotificationToastProps> = ({
  notification,
  onDismiss,
  onPressBanner,
  autoDismissDuration = 5000,
  className,
}) => {
  useEffect(() => {
    if (notification && autoDismissDuration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissDuration);
      return () => clearTimeout(timer);
    }
  }, [notification, autoDismissDuration, onDismiss]);

  if (!notification) return null;

  const getIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'VISITOR':
        return <QrCode size={18} color="#03A9F4" />;
      case 'BILLING':
      case 'FINANCIAL':
        return <CreditCard size={18} color="#10b981" />;
      case 'COMPLAINT':
      case 'WARNING':
      case 'ERROR':
        return <AlertCircle size={18} color="#f43f5e" />;
      case 'NOTICE':
      case 'COMMUNITY':
        return <BellRing size={18} color="#14b8a6" />;
      case 'AMENITY':
        return <Search size={18} color="#6366f1" />;
      default:
        return <Info size={18} color="#3b82f6" />;
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(350)}
      exiting={FadeOutUp.duration(250)}
      className={cn(
        'mx-4 my-2 rounded-2xl bg-card border border-primary/40 shadow-xl overflow-hidden',
        className
      )}
    >
      <TouchableOpacity
        onPress={() => {
          if (onPressBanner) {
            onPressBanner(notification);
          }
          onDismiss();
        }}
        activeOpacity={0.9}
        className="p-3.5 flex-row items-center gap-3 bg-card"
      >
        {/* Type Icon Badge Container */}
        <View className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center shrink-0">
          {getIcon(notification.type)}
        </View>

        {/* Text Content */}
        <View className="flex-1 pe-2">
          <View className="flex-row items-center justify-between gap-1">
            <Text
              className="text-xs font-black text-foreground tracking-tight"
              numberOfLines={1}
            >
              {notification.title || 'New Notification'}
            </Text>
            <View className="bg-primary/15 px-1.5 py-0.5 rounded-full">
              <Text className="text-[9px] font-bold text-primary">LIVE</Text>
            </View>
          </View>

          <Text
            className="text-[11px] text-muted-foreground mt-0.5 leading-snug"
            numberOfLines={2}
          >
            {notification.body || ''}
          </Text>
        </View>

        {/* Close Button */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1.5 rounded-full bg-secondary border border-border/60 active:opacity-70 shrink-0"
        >
          <X size={14} className="text-muted-foreground" />
        </Pressable>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default RealtimeNotificationToast;
