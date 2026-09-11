import React, { useEffect } from 'react';
import { View, Share, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { ScrollContainer } from '@/components/layout/ScrollContainer';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { ActionBar } from '@/components/ui/ActionBar';

import { useNoticeBoard } from '../hooks/useNoticeBoard';
import { NoticeImageGallery, NoticeAcknowledgementCard, ErrorBoundary } from '../components';
import { Heart, Share2, Pin, AlertTriangle, Users } from 'lucide-react-native';

function NoticeDetailContent() {
  const { id } = useLocalSearchParams();

  const {
    selectedNotice,
    loading,
    error,
    acknowledging,
    loadNoticeById,
    readNotice,
    toggleBookmark,
    acknowledgeNotice,
  } = useNoticeBoard();

  // Load notice details and record read status on mount
  useEffect(() => {
    if (id) {
      loadNoticeById(id);
      readNotice(id);
    }
  }, [id]);

  const handleBookmarkToggle = () => {
    if (selectedNotice) {
      toggleBookmark(selectedNotice._id, !selectedNotice.isBookmarkedByUser);
    }
  };

  const handleShare = async () => {
    if (!selectedNotice) return;
    try {
      await Share.share({
        title: selectedNotice.title,
        message: `${selectedNotice.title}\n\n${selectedNotice.description}`,
      });
    } catch (e) {
      console.error('Error sharing notice:', e);
    }
  };

  // Show loading spinner if actively loading, OR if we haven't fetched a notice yet and there is no error.
  // This prevents the "Notice not found" error from flashing on the initial render before useEffect triggers.
  const isFetching = loading || (!selectedNotice && !error);

  if (isFetching) {
    return (
      <View className="flex-1 items-center justify-center p-4 bg-background">
        <ActivityIndicator size="large" color="#171717" />
      </View>
    );
  }

  if (error || !selectedNotice || !selectedNotice._id) {
    return (
      <View className="flex-1 items-center justify-center p-4 bg-background">
        <Text className="text-destructive font-semibold text-center">
          {error || selectedNotice?.message || 'Notice not found.'}
        </Text>
      </View>
    );
  }

  const isBookmarked = selectedNotice.isBookmarkedByUser;
  const formattedPostedDate = selectedNotice.createdAt
    ? new Date(selectedNotice.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const formattedExpiryDate = selectedNotice.expiryDate
    ? new Date(selectedNotice.expiryDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const creatorName =
    selectedNotice.createdBy?.username || selectedNotice.createdBy?.name || 'Community Admin';

  const noticeImages = [];
  if (selectedNotice.image) {
    noticeImages.push(selectedNotice.image);
  }
  if (selectedNotice.images && Array.isArray(selectedNotice.images)) {
    noticeImages.push(...selectedNotice.images);
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollContainer contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="p-4">
          {/* Header Badges */}
          <View className="flex-row flex-wrap gap-2 mb-3">
            {selectedNotice.isCritical && (
              <StatusBadge label="CRITICAL" variant="danger" size="sm" />
            )}
            {selectedNotice.isPinned && (
              <View className="flex-row items-center bg-primary/10 px-2 py-1 rounded-md">
                <Icon as={Pin} size={12} className="text-primary me-1" />
                <Text className="text-primary text-xs font-semibold">Pinned</Text>
              </View>
            )}
            <StatusBadge label={selectedNotice.category || 'General'} variant="info" size="sm" />
            <StatusBadge label={selectedNotice.priority || 'Medium'} variant={getStatusVariant(selectedNotice.priority || 'Medium')} size="sm" />
            <StatusBadge label={selectedNotice.status || 'Published'} variant={getStatusVariant(selectedNotice.status || 'Published')} size="sm" />
          </View>

          {/* Critical Notice Warning Banner */}
          {selectedNotice.isCritical && (
            <View className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 flex-row items-center">
              <AlertTriangle size={20} color="#dc2626" className="me-2" />
              <Text className="text-destructive font-bold text-sm flex-1">
                Mandatory Critical Notice — Review required by all targeted community members.
              </Text>
            </View>
          )}

          {/* Notice Title */}
          <Text className="text-foreground text-2xl font-bold mb-4 text-start">
            {selectedNotice.title}
          </Text>

          {/* Notice Acknowledgement Action Container */}
          {selectedNotice.requiresAcknowledgement && (
            <NoticeAcknowledgementCard
              notice={selectedNotice}
              onAcknowledge={() => acknowledgeNotice(selectedNotice._id)}
              loading={acknowledging}
            />
          )}

          {/* Metadata Cards */}
          <DetailSection title="Notice Details" iconName="Info">
            <DetailRow label="Posted by" value={creatorName} iconName="User" />
            <DetailRow label="Posted On" value={formattedPostedDate || 'N/A'} iconName="Calendar" />
            <DetailRow label="Expiry" value={formattedExpiryDate || 'N/A'} iconName="CalendarOff" />
            <DetailRow
              label="Audience"
              value={
                selectedNotice.targetAudience?.type === 'ALL'
                  ? 'All Community Residents'
                  : selectedNotice.targetAudience?.type === 'ROLES'
                  ? `Roles: ${(selectedNotice.targetAudience?.roles || []).join(', ')}`
                  : 'Specific Units'
              }
              iconName="Users"
              isLast
            />
          </DetailSection>

          {/* Announcement Body */}
          <Text className="text-foreground text-base leading-relaxed text-start mb-6">
            {selectedNotice.description}
          </Text>

          {/* Images slide section using reusable component */}
          {noticeImages.length > 0 && (
            <View className="h-56 bg-muted border border-border rounded-xl overflow-hidden items-center justify-center py-4 mb-6">
              <NoticeImageGallery images={noticeImages} />
            </View>
          )}


        </View>
      </ScrollContainer>

      {/* Floating Actions Sticky Footer */}
      <View className="absolute bottom-0 left-0 right-0">
        <ActionBar
          primaryAction={{
            label: isBookmarked ? 'Bookmarked' : 'Add to Bookmarks',
            onPress: handleBookmarkToggle,
          }}
          secondaryAction={{
            label: 'Share',
            onPress: handleShare,
          }}
        />
      </View>
    </View>
  );
}

export default function NoticeDetailScreen() {
  const { canUpdate, isAdmin } = useNoticeBoard();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  return (
    <ErrorBoundary>
      <ScreenShell 
        title="Notice Detail"
        headerRight={
          (canUpdate || isAdmin) ? (
            <Button
              variant="outline"
              size="sm"
              onPress={() => router.push({
                pathname: '/(resident)/notices/create',
                params: { id }
              })}
              accessibilityLabel="Edit Notice"
            >
              Edit
            </Button>
          ) : null
        }
      >
        <NoticeDetailContent />
      </ScreenShell>
    </ErrorBoundary>
  );
}
