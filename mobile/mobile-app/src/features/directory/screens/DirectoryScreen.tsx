import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { DirectorySearch } from '../components/DirectorySearch';
import { DirectoryCategoryTabs } from '../components/DirectoryCategoryTabs';
import { DirectoryContactCard } from '../components/DirectoryContactCard';
import { DirectoryNoteComposer } from '../components/DirectoryNoteComposer';
import { DirectoryQuickMessageSheet } from '../components/DirectoryQuickMessageSheet';
import { useDirectory } from '../hooks/useDirectory';
import { useCommunityNote } from '../hooks/useCommunityNote';
import { useDirectoryMessaging } from '../hooks/useDirectoryMessaging';
import { useDirectorySocket } from '../hooks/useDirectorySocket';
import { DirectoryMember } from '../types/directoryTypes';
import { PlusCircle, Sparkles } from 'lucide-react-native';

export function DirectoryScreen() {
  // Real-time Socket Event Listener
  useDirectorySocket();

  const {
    members,
    pagination,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    loading,
    refreshing,
    onRefresh,
    onLoadMore,
    onCall,
    onIntercom,
  } = useDirectory();

  const {
    myActiveNote,
    composerOpen,
    setComposerOpen,
    expirationFormatted,
  } = useCommunityNote();

  const {
    quickSheetOpen,
    setQuickSheetOpen,
    selectedMember,
    onOpenQuickMessage,
    onInterestedInNote,
    onOpenConversation,
  } = useDirectoryMessaging();

  const renderHeader = (
    <View className="gap-3 pb-3">
      {/* Top Banner for Note Creation / Management */}
      <View className="bg-primary/10 border border-primary/20 rounded-2xl p-3 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={14} className="text-primary" />
            <Text className="text-xs font-bold text-foreground">
              {myActiveNote ? 'Your Active Note' : 'Share what you are up to!'}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
            {myActiveNote ? `${myActiveNote.emoji} ${myActiveNote.text}` : 'Post a 24h note to let neighbors know.'}
          </Text>
          {myActiveNote && (
            <Text className="text-[10px] text-primary font-semibold mt-1">
              {expirationFormatted}
            </Text>
          )}
        </View>

        <Button
          variant="default"
          size="sm"
          onPress={() => setComposerOpen(true)}
          leftIcon={PlusCircle}
          className="rounded-xl px-3"
        >
          {myActiveNote ? 'Change' : 'Add Note'}
        </Button>
      </View>

      {/* Search Bar */}
      <DirectorySearch value={searchQuery} onChangeText={setSearchQuery} />

      {/* Category Segmented Control */}
      <DirectoryCategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  );

  return (
    <ScreenShell
      title="Community Directory"
      subtitle="Discover neighbors, active notes & security personnel"
      iconName="Users"
      showBackButton={true}
    >
      <View className="flex-1 bg-background">
        <PaginatedList<DirectoryMember>
          data={members}
          renderItem={(member) => (
            <DirectoryContactCard
              key={member.id || member.userId}
              member={member}
              onCall={onCall}
              onIntercom={onIntercom}
              onQuickMessage={onOpenQuickMessage}
              onInterestedInNote={onInterestedInNote}
              onOpenConversation={onOpenConversation}
            />
          )}
          keyExtractor={(member) => member.id || member.userId}
          pagination={pagination}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onLoadMore={onLoadMore}
          ListHeaderComponent={renderHeader}
          emptyIcon="Users"
          emptyTitle="No Directory Members Found"
          emptySubtitle="No community records match your current search or filter."
          contentContainerClassName="px-4 pt-3 pb-28"
        />
      </View>

      {/* Bottom Sheet Composers */}
      <DirectoryNoteComposer visible={composerOpen} onClose={() => setComposerOpen(false)} />
      <DirectoryQuickMessageSheet
        visible={quickSheetOpen}
        onClose={() => setQuickSheetOpen(false)}
        member={selectedMember}
      />
    </ScreenShell>
  );
}

export default DirectoryScreen;
