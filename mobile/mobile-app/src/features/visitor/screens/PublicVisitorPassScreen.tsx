import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Share, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { TextInput } from '@/components/forms/TextInput';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { VisitorQRCode } from '../components/shared/VisitorQRCode';
import {
  ShieldCheck,
  Building,
  Calendar,
  Clock,
  Car,
  User,
  Share2,
  Copy,
  Check,
  Search,
  Key,
  AlertTriangle,
  Info,
  ShieldAlert,
} from 'lucide-react-native';
import apiClient from '@/src/services/apiClient';

interface PublicVisitorPassData {
  _id?: string;
  code?: string;
  shortKey?: string;
  visitorName?: string;
  phone?: string;
  purpose?: string;
  status?: string;
  validFrom?: string;
  validUntil?: string;
  expiresAt?: string;
  vehicleNumber?: string;
  unitNumber?: string;
  hostName?: string;
  organizationName?: string;
  allowedGates?: string[];
  unitInfo?: {
    unitNumber?: string;
    block?: string;
    floor?: number;
  };
  hostInfo?: {
    name?: string;
    phone?: string;
  };
}

const mapPassStatusVariant = (status: string = ''): StatusVariant => {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'APPROVED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REVOKED':
      return 'danger';
    case 'EXPIRED':
    case 'CHECKED_OUT':
      return 'neutral';
    default:
      return 'neutral';
  }
};

export function PublicVisitorPassScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; code?: string; id?: string }>();
  
  const initialToken = params?.token || params?.code || params?.id || '';

  const [searchCode, setSearchCode] = useState(initialToken);
  const [activeCode, setActiveCode] = useState(initialToken);
  const [passData, setPassData] = useState<PublicVisitorPassData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchPass = useCallback(async (lookupCode: string) => {
    if (!lookupCode || !lookupCode.trim()) return;
    const cleanCode = lookupCode.trim();

    try {
      setLoading(true);
      setError(null);

      // Attempt public fetch from API endpoints
      let response: any = null;
      try {
        response = await apiClient.get(`/visitor-pass/public/${cleanCode}`);
      } catch (err) {
        // Fallback to code lookup endpoint
        try {
          response = await apiClient.get(`/visitor-pass/code/${cleanCode}`);
        } catch (innerErr) {
          response = await apiClient.get(`/visitor-pass/${cleanCode}`);
        }
      }

      const data = response?.data || response?.success !== undefined ? (response.data || response) : response;
      if (data) {
        setPassData(data);
      } else {
        setPassData(null);
        setError('Visitor pass not found. Please check your passcode.');
      }
    } catch (err: any) {
      console.log('Error fetching visitor pass', err);
      setPassData(null);
      setError(
        err.response?.data?.message ||
        'Unable to load visitor pass. The entry code may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeCode) {
      fetchPass(activeCode);
    }
  }, [activeCode, fetchPass]);

  const handleSearchSubmit = () => {
    if (searchCode.trim()) {
      setActiveCode(searchCode.trim());
    }
  };

  const passCode =
    passData?.code ||
    passData?.shortKey ||
    (passData?._id ? passData._id.slice(-6).toUpperCase() : activeCode || '849201');

  const unitString =
    passData?.unitNumber ||
    passData?.unitInfo?.unitNumber
      ? `Villa ${passData.unitNumber || passData.unitInfo?.unitNumber}${
          passData.unitInfo?.block ? ` (Block ${passData.unitInfo.block})` : ''
        }`
      : 'Villa Unit';

  const hostString =
    passData?.hostName || passData?.hostInfo?.name || 'Resident Host';

  const status = passData?.status || 'ACTIVE';
  const statusVariant = mapPassStatusVariant(status);

  const validFromFormatted = passData?.validFrom
    ? new Date(passData.validFrom).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
      })
    : 'Immediate Entry';

  const validUntilFormatted = passData?.validUntil || passData?.expiresAt
    ? new Date(passData.validUntil || passData.expiresAt!).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
      })
    : 'End of Day';

  const handleCopyCode = () => {
    if (!passCode) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSharePass = async () => {
    const shareMessage =
      `*Official Manage-My-Gate Visitor Pass*\n\n` +
      `Host Unit: ${unitString}\n` +
      `Host: ${hostString}\n` +
      `Visitor Name: ${passData?.visitorName || 'Guest'}\n` +
      `Entry Pass Code: ${passCode}\n` +
      `Valid Window: ${validFromFormatted} - ${validUntilFormatted}\n\n` +
      `Show this QR code or 6-digit passcode to the security officer at the gate.`;

    try {
      await Share.share({
        title: 'Visitor Entry Pass',
        message: shareMessage,
      });
    } catch (err) {
      console.log('Error sharing pass', err);
    }
  };

  return (
    <ScreenShell
      title="Visitor Security Pass"
      subtitle={passData ? unitString : 'Guest Verification Portal'}
      iconName="ShieldCheck"
      headerRight={
        passData ? (
          <StatusBadge label={status} variant={statusVariant} dot />
        ) : null
      }
    >
      <View className="flex-1 bg-background">
        {/* Search / Entry Code Bar (Active if no pass or code mismatch) */}
        {!passData && !loading ? (
          <View className="p-4 bg-card border-b border-border gap-3">
            <Text className="text-sm font-semibold text-foreground">
              Enter 6-Digit Pass Code
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <TextInput
                  value={searchCode}
                  onChangeText={setSearchCode}
                  placeholder="e.g. 849201"
                  leftIcon={Key}
                  keyboardType="numeric"
                  maxLength={12}
                />
              </View>
              <Button
                variant="default"
                onPress={handleSearchSubmit}
                className="h-11 px-4 items-center justify-center"
              >
                <Icon as={Search} size={16} className="text-primary-foreground" />
              </Button>
            </View>
          </View>
        ) : null}

        {/* Error Notification Banner */}
        {error ? (
          <View className="p-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </View>
        ) : null}

        {loading ? (
          <View className="p-4">
            <SkeletonLoader count={3} />
          </View>
        ) : passData ? (
          <ScrollView
            className="flex-1 px-4 pt-2"
            contentContainerClassName="gap-4 pb-28"
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={() => fetchPass(activeCode)}
              />
            }
          >
            {/* Hero Verified Pass Card */}
            <View className="bg-card border border-border rounded-3xl p-5 shadow-sm items-center">
              {/* Community Branding Header */}
              <View className="w-full flex-row items-center justify-between pb-4 mb-4 border-b border-border">
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center me-2.5">
                    <Icon as={ShieldCheck} size={20} className="text-primary" />
                  </View>
                  <View>
                    <Text className="text-foreground font-bold text-sm">
                      {passData.organizationName || 'ManageMyGate'}
                    </Text>
                    <Text className="text-muted-foreground text-[11px]">
                      Official Verified Guest Pass
                    </Text>
                  </View>
                </View>

                <StatusBadge label={status} variant={statusVariant} dot />
              </View>

              {/* Dynamic ISO QR Code Matrix */}
              <View className="my-2">
                <VisitorQRCode
                  code={passCode}
                  size={190}
                  validityText="Scan at Gate Security Scanner"
                />
              </View>

              {/* 6-Digit Passcode Box with Copy */}
              <View className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-4 items-center justify-center gap-1.5 mt-3">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Entry Passcode
                </Text>
                <Text className="text-3xl font-extrabold text-primary font-mono tracking-widest">
                  {passCode}
                </Text>

                <TouchableOpacity
                  onPress={handleCopyCode}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-1.5 bg-card px-3 py-1.5 rounded-full border border-border mt-1"
                >
                  <Icon
                    as={copied ? Check : Copy}
                    size={13}
                    className={copied ? 'text-emerald-600' : 'text-muted-foreground'}
                  />
                  <Text className="text-xs font-semibold text-foreground">
                    {copied ? 'Passcode Copied' : 'Copy Passcode'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quick Share CTA Row */}
              <View className="w-full flex-row gap-2 mt-4 pt-3 border-t border-border">
                <Button
                  variant="default"
                  size="sm"
                  onPress={handleSharePass}
                  className="flex-1 flex-row items-center justify-center gap-2 h-11"
                >
                  <Icon as={Share2} size={15} className="text-primary-foreground" />
                  <Text className="text-xs font-bold text-primary-foreground">
                    Share Pass Link
                  </Text>
                </Button>
              </View>
            </View>

            {/* Host & Visit Details Breakdown */}
            <DetailSection title="Host & Destination Information">
              <DetailRow label="Destination Unit" value={unitString} />
              <DetailRow label="Host Resident" value={hostString} />
              <DetailRow label="Visitor Name" value={passData.visitorName || 'Guest'} />
              {passData.purpose ? (
                <DetailRow label="Purpose of Visit" value={passData.purpose} />
              ) : null}
              {passData.vehicleNumber ? (
                <DetailRow label="Vehicle Registration" value={passData.vehicleNumber} />
              ) : null}
              <DetailRow label="Valid From" value={validFromFormatted} />
              <DetailRow label="Valid Until" value={validUntilFormatted} />
              {passData.allowedGates && passData.allowedGates.length > 0 ? (
                <DetailRow
                  label="Authorized Gates"
                  value={passData.allowedGates.join(', ')}
                />
              ) : null}
            </DetailSection>

            {/* Security Entry Instructions */}
            <View className="bg-muted/40 border border-border rounded-2xl p-4 flex-row items-start gap-3">
              <Icon as={Info} size={18} className="text-primary mt-0.5" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-foreground mb-1">
                  Gate Security Guidelines
                </Text>
                <Text className="text-xs text-muted-foreground leading-relaxed">
                  1. Present this QR code or 6-digit passcode to the gate security officer.
                  {'\n'}2. Please keep a valid government photo ID available for verification.
                  {'\n'}3. Follow posted community speed limits (15 km/h) and designated visitor parking bays.
                </Text>
              </View>
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center p-6">
            <EmptyState
              icon={ShieldAlert}
              title="No Pass Loaded"
              description="Enter your 6-digit visitor pass code above or open your unique visitor pass link."
            />
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

export default PublicVisitorPassScreen;
