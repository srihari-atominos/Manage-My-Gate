import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { CommunityEngagementWizard } from '../components/CommunityEngagementWizard';
import { EngagementContentType } from '../types/communityEngagement.types';

export default function CommunityEngagementWizardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    mode?: 'create' | 'edit';
    id?: string;
  }>();

  const isEdit = params.mode === 'edit' || Boolean(params.id);
  const initialType: EngagementContentType =
    params.type?.toUpperCase() === 'POLL' ? 'POLL' : 'NOTICE';

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(resident)/community-engagement/ledger' as any);
    }
  };

  const handleSuccess = (_result: any) => {
    router.replace('/(resident)/community-engagement/ledger' as any);
  };

  return (
    <SafeAreaWrapper edges={['top', 'bottom']} className="flex-1 bg-background">
      <CommunityEngagementWizard
        initialType={initialType}
        mode={isEdit ? 'edit' : 'create'}
        editId={params.id}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </SafeAreaWrapper>
  );
}
