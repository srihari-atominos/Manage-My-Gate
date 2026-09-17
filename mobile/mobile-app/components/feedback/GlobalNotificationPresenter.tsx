import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/src/store/store';
import { useNotifications } from '@/src/features/notification/hooks/useNotifications';
import { RealtimeNotificationToast } from './RealtimeNotificationToast';
import {
  InvitationDetailModal,
  extractInvitationToken,
} from '@/src/features/notification/components/InvitationDetailModal';
import { resolveNotificationRoute } from '@/src/features/notification/utils/notificationNavigation';
import { NotificationItemData } from '@/src/features/notification/services/notificationService';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import {
  acceptInviteThunk,
  rejectInviteThunk,
  switchWorkspaceContextThunk,
} from '@/src/features/auth/store/authSlice';
import { useTranslation } from '@/src/utils/i18n';

/**
 * GlobalNotificationPresenter Component
 *
 * Mounts at the root level (_layout.tsx) inside the Redux Provider tree.
 * 1. Guarantees the real-time Socket.io and push notification listener stays permanently active.
 * 2. Renders an interactive heads-up toast banner whenever `latestNotification` arrives.
 * 3. Immediately opens the Invitation decision modal with Accept/Decline actions if the notification is an invitation.
 * 4. Navigates to the appropriate domain screen for any other notification type.
 */
export const GlobalNotificationPresenter: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const { t } = useTranslation();

  const {
    latestNotification,
    dismissLatestNotification,
    markAsRead,
    fetchNotifications,
  } = useNotifications();

  const [selectedInviteNotification, setSelectedInviteNotification] = useState<NotificationItemData | null>(null);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);

  // Helper to determine whether a notification represents an invitation
  const isInvitation = useCallback((notification?: NotificationItemData | null): boolean => {
    if (!notification) return false;
    if (notification.type === 'INVITATION') return true;
    const title = (notification.title || '').toLowerCase();
    const body = (notification.body || '').toLowerCase();
    const url = (notification.actionUrl || '').toLowerCase();
    return (
      title.includes('invitation') ||
      body.includes('invited') ||
      url.includes('/invite/') ||
      url.includes('accept-invite') ||
      !!notification.metadata?.invitationToken ||
      !!notification.metadata?.token
    );
  }, []);

  const handlePressBanner = useCallback((notification: NotificationItemData) => {
    const notifId = notification.id || notification._id;
    if (notifId) {
      markAsRead(notifId);
    }

    if (isInvitation(notification)) {
      setSelectedInviteNotification(notification);
      setIsInviteModalVisible(true);
    } else {
      const targetRoute = resolveNotificationRoute({
        notificationId: notifId,
        type: notification.type,
        actionUrl: notification.actionUrl,
        title: notification.title,
        body: notification.body,
        orgId: notification.orgId,
        ...(notification.metadata || {}),
      });

      try {
        router.push(targetRoute as any);
      } catch {
        router.push('/(resident)/notifications' as any);
      }
    }
  }, [isInvitation, markAsRead, router]);

  const handleAcceptInvitation = useCallback(
    async (token: string, orgId?: string, orgName?: string) => {
      try {
        const actionResult: any = await dispatch(
          acceptInviteThunk({ token, email: user?.email })
        ).unwrap();

        const targetOrg = orgId || actionResult?.orgId || actionResult?.user?.orgId;
        if (targetOrg) {
          try {
            await dispatch(switchWorkspaceContextThunk({ targetOrgId: targetOrg })).unwrap();
          } catch (_) {}
        }

        const notifId = selectedInviteNotification?.id || selectedInviteNotification?._id;
        if (notifId) {
          markAsRead(notifId);
        }

        setIsInviteModalVisible(false);
        setSelectedInviteNotification(null);
        await fetchNotifications(1, 10);

        Alert.alert(
          t('invitation_accepted', 'Welcome!'),
          `${t('invitation_accepted_desc', 'You are now a member of')} ${orgName || 'the community'}.`
        );

        router.replace('/(resident)/dashboard' as any);
      } catch (err: any) {
        const msg = err?.message || err || 'Failed to accept invitation';
        Alert.alert(t('invitation_error', 'Invitation Error'), msg);
        throw err;
      }
    },
    [dispatch, user?.email, selectedInviteNotification, markAsRead, fetchNotifications, router, t]
  );

  const handleRejectInvitation = useCallback(
    async (token: string, orgName?: string) => {
      try {
        await dispatch(rejectInviteThunk({ token, email: user?.email })).unwrap();

        const notifId = selectedInviteNotification?.id || selectedInviteNotification?._id;
        if (notifId) {
          markAsRead(notifId);
        }

        setIsInviteModalVisible(false);
        setSelectedInviteNotification(null);
        await fetchNotifications(1, 10);

        Alert.alert(
          t('invitation_declined', 'Invitation Declined'),
          `${t('declined_success', 'You have declined the invitation to join')} ${orgName || 'the workspace'}.`
        );
      } catch (err: any) {
        const msg = err?.message || err || 'Failed to reject invitation';
        Alert.alert(t('error', 'Error'), msg);
        throw err;
      }
    },
    [dispatch, user?.email, selectedInviteNotification, markAsRead, fetchNotifications, t]
  );

  return (
    <>
      {latestNotification && (
        <View
          pointerEvents="box-none"
          style={[
            styles.toastContainer,
            { top: insets.top > 0 ? insets.top + 4 : 12 },
          ]}
        >
          <RealtimeNotificationToast
            notification={latestNotification}
            onDismiss={dismissLatestNotification}
            onPressBanner={handlePressBanner}
            autoDismissDuration={6000}
          />
        </View>
      )}

      {selectedInviteNotification && (
        <InvitationDetailModal
          visible={isInviteModalVisible}
          notification={selectedInviteNotification}
          onClose={() => {
            setIsInviteModalVisible(false);
            setSelectedInviteNotification(null);
          }}
          onAccept={handleAcceptInvitation}
          onReject={handleRejectInvitation}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
  },
});

export default GlobalNotificationPresenter;
