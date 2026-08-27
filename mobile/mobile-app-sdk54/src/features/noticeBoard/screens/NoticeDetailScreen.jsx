import React, { useEffect } from 'react';
import { View, Share, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { ScrollContainer } from '@/components/layout/ScrollContainer';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/common/Badge';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { ActionBar } from '@/components/ui/ActionBar';

import { useNoticeBoard } from '../hooks/useNoticeBoard';
import { NoticeImageGallery, ErrorBoundary } from '../components';
import { Heart, Share2, Pin } from 'lucide-react-native';

function NoticeDetailContent() {
  const { id } = useLocalSearchParams();

  const {
    selectedNotice,
    loading,
    error,
    loadNoticeById,
    readNotice,
    toggleBookmark,
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
            {selectedNotice.isPinned && (
              <View className="flex-row items-center bg-primary/10 px-2 py-1 rounded-md">
                <Icon as={Pin} size={12} className="text-primary mr-1" />
                <Text className="text-primary text-xs font-semibold">Pinned</Text>
              </View>
            )}
            <Badge label={selectedNotice.category || 'General'} variant="outline" size="sm" />
            <StatusBadge label={selectedNotice.priority || 'Medium'} variant={getStatusVariant(selectedNotice.priority || 'Medium')} size="sm" />
            <StatusBadge label={selectedNotice.status || 'Published'} variant={getStatusVariant(selectedNotice.status || 'Published')} size="sm" />
          </View>

          {/* Notice Title */}
          <Text className="text-foreground text-2xl font-bold mb-4 text-start">
            {selectedNotice.title}
          </Text>

          {/* Metadata Cards */}
          <DetailSection title="Notice Details" iconName="Info">
            <DetailRow label="Posted by" value={creatorName} iconName="User" />
            <DetailRow label="Posted On" value={formattedPostedDate || 'N/A'} iconName="Calendar" />
            <DetailRow label="Expiry" value={formattedExpiryDate || 'N/A'} iconName="CalendarOff" isLast />
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
  return (
    <ErrorBoundary>
      <ScreenShell title="Notice Detail">
        <NoticeDetailContent />
      </ScreenShell>
    </ErrorBoundary>
  );
}
