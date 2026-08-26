import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';

export interface ProviderItem {
  id: string;
  name: string;
  icon: string;
}

export interface IntegrationConnection {
  id: string;
  provider: string;
  accountLabel: string;
  status: 'connected' | 'error' | 'disabled';
}

export const PROVIDERS: ProviderItem[] = [
  { id: 'smtp', name: 'SMTP Email', icon: '✉️' },
  { id: 'twilio', name: 'Twilio SMS', icon: '📱' },
  { id: 'openai', name: 'OpenAI (AI)', icon: '🤖' },
  { id: 'resend', name: 'Resend Email', icon: '✉️' },
  { id: 'firebase', name: 'Firebase', icon: '🔥' },
  { id: 'messagecentral', name: 'Message Central', icon: '💬' },
  { id: 'banking', name: 'Bank Details', icon: '🏦' },
  { id: 'razorpay', name: 'Razorpay', icon: '💳' },
];

export const MOCK_CONNECTIONS: IntegrationConnection[] = [
  { id: 'smtp_conn_prod', provider: 'smtp', accountLabel: 'Primary Community Mailer (SMTP)', status: 'connected' },
  { id: 'twilio_conn_main', provider: 'twilio', accountLabel: 'Gate OTP SMS Gateway (Twilio)', status: 'connected' },
  { id: 'openai_conn_v1', provider: 'openai', accountLabel: 'Resident Assistant Assistant (OpenAI)', status: 'connected' },
  { id: 'razorpay_conn_main', provider: 'razorpay', accountLabel: 'Main Society Gateway (Razorpay)', status: 'connected' },
  { id: 'firebase_conn_push', provider: 'firebase', accountLabel: 'FCM Mobile Notifications', status: 'connected' },
  { id: 'resend_conn_billing', provider: 'resend', accountLabel: 'Billing Invoices Dispatch (Resend)', status: 'connected' },
  { id: 'banking_conn_hdfc', provider: 'banking', accountLabel: 'Society HDFC Escrow Account', status: 'connected' },
];

export const useRoleIntegrationConfigurator = (
  isOpen: boolean,
  mappings: Record<string, string> = {},
  onApply: (mappings: Record<string, string>) => void,
  onClose: () => void
) => {
  const storeConnections = useSelector((state: RootState) => (state as any).integrationHub?.connections || []);
  const isLoadingStore = useSelector((state: RootState) => (state as any).integrationHub?.isLoading || false);

  const [selectedProvider, setSelectedProvider] = useState<string>('smtp');
  const [tempMappings, setTempMappings] = useState<Record<string, string>>({});

  const connections: IntegrationConnection[] =
    storeConnections && storeConnections.length > 0 ? storeConnections : MOCK_CONNECTIONS;

  useEffect(() => {
    if (isOpen) {
      setTempMappings(mappings || {});
    }
  }, [mappings, isOpen]);

  const filteredConnections = connections.filter((conn) => conn.provider === selectedProvider);

  const handleSelectConnection = (connectionId: string | null) => {
    setTempMappings((prev) => {
      const next = { ...prev };
      if (!connectionId) {
        delete next[selectedProvider];
      } else {
        next[selectedProvider] = connectionId;
      }
      return next;
    });
  };

  const handleApply = () => {
    const cleaned: Record<string, string> = {};
    Object.entries(tempMappings).forEach(([key, val]) => {
      if (val) cleaned[key] = val;
    });
    onApply(cleaned);
    onClose();
  };

  return {
    isLoading: isLoadingStore,
    selectedProvider,
    setSelectedProvider,
    tempMappings,
    filteredConnections,
    handleSelectConnection,
    handleApply,
  };
};

export default useRoleIntegrationConfigurator;
