import React from 'react';
import { AppUpdateGate } from '@/src/features/appUpdate/components/AppUpdateGate';

/**
 * Enhanced application update gate.
 * Manages NORMAL (optional), IMPORTANT (with grace period countdown),
 * and CRITICAL (mandatory blocking) update workflows via Google Play In-App Updates.
 */
export const ForceUpdateGate: React.FC = () => {
  return <AppUpdateGate />;
};

export default ForceUpdateGate;
