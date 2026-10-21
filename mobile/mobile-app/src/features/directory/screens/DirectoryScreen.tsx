import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { DirectorySearch } from '../components/DirectorySearch';
import { DirectoryCategoryTabs } from '../components/DirectoryCategoryTabs';
import { DirectoryContactCard } from '../components/DirectoryContactCard';
import { useDirectory } from '../hooks/useDirectory';
import { useDirectorySocket } from '../hooks/useDirectorySocket';
import { useTranslation } from '@/src/utils/i18n';
import { DirectoryMember } from '../types/directoryTypes';
import { ContactPermissionPrompt } from '@/components/hardware/ContactPermissionPrompt';
import { useContactsPermissionFlow } from '@/src/hooks/useContactsPermissionFlow';

export function DirectoryScreen() {
  const { t } = useTranslation();
  const {
    promptVisible: contactsPromptVisible,
    settingsHint: contactsSettingsHint,
    permission: contactsPermission,
    requestContactsAccess,
    acceptContactsAccess,
    denyContactsAccess,
  } = useContactsPermissionFlow();
  const [pendingCallPhone, setPendingCallPhone] = useState<string | null>(null);

  // Real-time Socket Event Listener for messaging
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
    error,
    onRefresh,
    onLoadMore,
    onCall,
  } = useDirectory();

  const handleDirectoryCall = useCallback(async (phone: string) => {
    const granted = await requestContactsAccess();
    if (granted) {
      onCall(phone);
      return;
    }
    setPendingCallPhone(phone);
  }, [onCall, requestContactsAccess]);

  useEffect(() => {
    if (!pendingCallPhone || !contactsPermission?.granted) return;
    const phone = pendingCallPhone;
    setPendingCallPhone(null);
    onCall(phone);
  }, [contactsPermission?.granted, onCall, pendingCallPhone]);

  const renderHeader = (
    <View className="gap-3 pb-3">
      {/* Search Bar */}
      <DirectorySearch
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('search_residents', 'Search by name, unit, phone, or role...')}
      />

      {/* Category Tabs */}
      <DirectoryCategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  );

  return (
    <ScreenShell
      title={t('community_directory', 'Community Directory')}
      subtitle={t('nav_community_directory_sub', 'Find and contact residents, security & community staff')}
      iconName="Users"
      showBackButton={true}
      error={error && members.length === 0 ? error : null}
      onRetry={onRefresh}
    >
      <View className="flex-1 bg-background">
        {contactsSettingsHint ? (
          <Text className="px-4 pt-2 text-center text-xs text-muted-foreground">
            {contactsSettingsHint}
          </Text>
        ) : null}
        <PaginatedList<DirectoryMember>
          data={members}
          renderItem={(member) => (
            <DirectoryContactCard
              key={member.id || member.userId}
              member={member}
              onCall={handleDirectoryCall}
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
          emptyTitle={t('no_members_found', 'No Directory Members Found')}
          emptySubtitle={t('no_members_sub', 'No community records match your current search or filter.')}
          contentContainerClassName="px-4 pt-3 pb-28"
        />
      </View>
      <ContactPermissionPrompt
        visible={contactsPromptVisible}
        onDeny={denyContactsAccess}
        onAccept={() => void acceptContactsAccess()}
      />
    </ScreenShell>
  );
}

export default DirectoryScreen;
