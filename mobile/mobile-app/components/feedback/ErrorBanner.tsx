import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Text } from '../ui/text';
import { AlertTriangle, CloudOff, X, Mail } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { isConnectivityErrorMessage } from '@/src/services/networkStatus';
import { openSupportMail, useSupportEmail } from '@/src/services/supportContact';
import { useNetworkStatus, useIsNetworkBannerVisible } from '@/src/features/network/NetworkRecoveryProvider';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner = ({
  title = 'Error',
  message,
  onDismiss,
  onRetry,
  className,
}: ErrorBannerProps) => {
  const network = useNetworkStatus();
  const globalBannerVisible = useIsNetworkBannerVisible();
  const supportEmail = useSupportEmail();
  const isConnectivityIssue = !network.isOnline || Boolean(network.issue) || isConnectivityErrorMessage(message);
  // The global banner already says this; repeating it inline just stacks two identical notices.
  if (isConnectivityIssue && globalBannerVisible && !onRetry) return null;

  const displayTitle = isConnectivityIssue ? 'Connection unavailable' : title;
  const displayMessage = isConnectivityIssue
    ? 'Your information is safe. Check your connection and try again when you are back online.'
    : message;

  const handleContactDev = () => {
    void openSupportMail(
      `Nahom App Error: ${title}`,
      `Error message: ${message}
Platform: ${Platform.OS}
Timestamp: ${new Date().toISOString()}`
    );
  };

  return (
    <View
      className={cn(
        `flex-row items-start rounded-xl border p-3.5 ${isConnectivityIssue ? 'border-[#FFD6B0] bg-[#FFF1E3]' : 'border-destructive/20 bg-destructive/10'}`,
        className
      )}
    >
      {isConnectivityIssue ? (
        <CloudOff size={18} color="#E8590C" className="me-2.5 mt-0.5" />
      ) : (
        <AlertTriangle size={18} className="me-2.5 mt-0.5 text-destructive" />
      )}
      <View className="flex-1">
        <Text className={`text-sm font-bold font-sans ${isConnectivityIssue ? 'text-[#7A3A0E]' : 'text-destructive'}`}>
          {displayTitle}
        </Text>
        <Text className={`mt-0.5 text-xs font-sans ${isConnectivityIssue ? 'text-[#7A3A0E]/80' : 'text-destructive/90'}`}>
          {displayMessage}
        </Text>
        <View className="mt-2.5 flex-row items-center gap-2">
          {onRetry && (
            <Pressable onPress={onRetry} className={`rounded-lg px-3 py-1 ${isConnectivityIssue ? 'bg-[#E8590C]' : 'bg-destructive'}`}>
              <Text className="text-xs font-bold font-sans text-white">Retry</Text>
            </Pressable>
          )}
          {!isConnectivityIssue && !!supportEmail && (
            <Pressable
              onPress={handleContactDev}
              className="flex-row items-center gap-1 rounded-lg bg-destructive/15 border border-destructive/30 px-2.5 py-1 active:opacity-75"
              accessibilityRole="button"
              accessibilityLabel="Email App Developer"
            >
              <Mail size={12} className="text-destructive" />
              <Text className="text-xs font-semibold font-sans text-destructive">Contact Dev</Text>
            </Pressable>
          )}
        </View>
      </View>
      {onDismiss && (
        <Pressable onPress={onDismiss} className="ms-2 p-1">
          <X size={16} className={isConnectivityIssue ? 'text-[#E8590C]' : 'text-destructive'} />
        </Pressable>
      )}
    </View>
  );
};