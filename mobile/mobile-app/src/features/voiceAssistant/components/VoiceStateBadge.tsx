import React from 'react';
import { View } from 'react-native';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { VoiceAssistantStatus } from '../store/voiceAssistantSlice';

interface VoiceStateBadgeProps {
  status: VoiceAssistantStatus;
  testID?: string;
}

const STATUS_MAP: Record<VoiceAssistantStatus, { label: string; variant: StatusVariant; dot: boolean }> = {
  idle: { label: 'Ready', variant: 'neutral', dot: false },
  requesting_permission: { label: 'Checking Mic', variant: 'warning', dot: true },
  permission_denied: { label: 'Mic Denied', variant: 'danger', dot: false },
  connecting: { label: 'Connecting...', variant: 'info', dot: true },
  listening: { label: 'Listening', variant: 'success', dot: true },
  transcribing: { label: 'Transcribing...', variant: 'info', dot: true },
  processing: { label: 'Processing...', variant: 'info', dot: true },
  awaiting_confirmation: { label: 'Needs Confirmation', variant: 'warning', dot: true },
  thinking: { label: 'Thinking...', variant: 'info', dot: true },
  speaking: { label: 'Speaking', variant: 'info', dot: true },
  muted: { label: 'Muted', variant: 'neutral', dot: false },
  error: { label: 'Error', variant: 'danger', dot: false },
};

export const VoiceStateBadge: React.FC<VoiceStateBadgeProps> = ({ status, testID }) => {
  const config = STATUS_MAP[status] || STATUS_MAP.idle;

  return (
    <View testID={testID} className="items-center justify-center">
      <StatusBadge
        label={config.label}
        variant={config.variant}
        size="md"
        dot={config.dot}
      />
    </View>
  );
};

export default VoiceStateBadge;
