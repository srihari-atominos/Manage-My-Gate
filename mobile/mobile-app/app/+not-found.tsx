import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { EmptyState } from '@/components/feedback/EmptyState';
import { AlertCircle } from 'lucide-react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <ScreenShell title="Page Not Found" showBackButton={true}>
      <View className="flex-1 justify-center px-4">
        <EmptyState
          icon={AlertCircle}
          title="Screen Not Found"
          description="The screen or resource you are looking for does not exist or has been moved."
          actionLabel="Return to Dashboard"
          onAction={() => router.replace('/(resident)/dashboard' as any)}
        />
      </View>
    </ScreenShell>
  );
}
