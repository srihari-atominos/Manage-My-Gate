import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { CommunityEngagementWizard } from '../components/CommunityEngagementWizard';
import { EngagementContentType } from '../types/communityEngagement.types';

export default function CommunityEngagementWizardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();

  const initialType: EngagementContentType =
    params.type?.toUpperCase() === 'POLL' ? 'POLL' : 'NOTICE';

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(resident)/notices/manage');
    }
  };

  const handleSuccess = (_result: any) => {
    if (initialType === 'POLL') {
      router.replace('/(resident)/polls');
    } else {
      router.replace('/(resident)/notices/manage');
    }
  };

  return (
    <SafeAreaWrapper edges={['top', 'bottom']} className="flex-1 bg-background">
      <CommunityEngagementWizard
        initialType={initialType}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </SafeAreaWrapper>
  );
}
