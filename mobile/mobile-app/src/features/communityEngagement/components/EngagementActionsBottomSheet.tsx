import React, { useState, useEffect } from 'react';
import { View, ScrollView, Share, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/common/Button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
  Pin,
  PinOff,
  Share2,
  Trash2,
  Users,
  CheckCircle2,
  CheckSquare,
  BarChart2,
  Download,
  AlertCircle,
  ExternalLink,
  Lock,
  RefreshCw,
  Clock,
  Shield,
  Edit3,
} from 'lucide-react-native';
import { EngagementCardItem } from './EngagementCard';
import * as noticeBoardService from '@/src/features/noticeBoard/services/noticeBoardService';
import { pollApi } from '@/src/features/poll/services/pollApi';
import { PollVotersModal } from '@/src/features/poll/components/PollVotersModal';

const VotersModal = PollVotersModal as React.ComponentType<any>;

export interface EngagementActionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  item: EngagementCardItem | null;
  onActionSuccess?: () => void;
}

export const EngagementActionsBottomSheet: React.FC<EngagementActionsBottomSheetProps> = ({
  visible,
  onClose,
  item,
  onActionSuccess,
}) => {
  const router = useRouter();

  // Pinning state
  const [isPinning, setIsPinning] = useState(false);
  const [pinnedLocal, setPinnedLocal] = useState(Boolean(item?.isPinned));

  // Poll live results state
  const [pollResults, setPollResults] = useState<any>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Poll voters modal state
  const [votersModalVisible, setVotersModalVisible] = useState(false);
  const [voters, setVoters] = useState<any[]>([]);
  const [loadingVoters, setLoadingVoters] = useState(false);

  // Confirmation Modals
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [closePollConfirmVisible, setClosePollConfirmVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible && item) {
      setPinnedLocal(Boolean(item.isPinned));

      if (item.type === 'POLL') {
        setLoadingResults(true);
        pollApi
          .getPollResults(item.id)
          .then((res: any) => {
            const data = res?.data?.data || res?.data || res;
            setPollResults(data);
          })
          .catch(() => {})
          .finally(() => setLoadingResults(false));
      }
    }
  }, [visible, item]);

  if (!item) return null;

  const isNotice = item.type === 'NOTICE';

  // Format date helper
  const formatDateDisplay = (d?: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  // 1. Notice Pin Toggle
  const handleTogglePin = async () => {
    try {
      setIsPinning(true);
      const nextPinState = !pinnedLocal;
      await noticeBoardService.togglePin(item.id, nextPinState);
      setPinnedLocal(nextPinState);
      onActionSuccess?.();
    } catch (e: any) {
      const msg = e?.message || 'Could not update pinned state.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Action Failed', msg);
    } finally {
      setIsPinning(false);
    }
  };

  // 2. Share
  const handleShare = async () => {
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n\n${item.subtitle || ''}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  // 3. Delete
  const handleConfirmDelete = async () => {
    try {
      setActionLoading(true);
      if (isNotice) {
        await noticeBoardService.deleteNotice(item.id);
      } else {
        await pollApi.deletePoll(item.id);
      }
      setDeleteConfirmVisible(false);
      onClose();
      onActionSuccess?.();
    } catch (e: any) {
      const msg = e?.message || 'Failed to delete item.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Delete Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Poll Close Early
  const handleConfirmClosePoll = async () => {
    try {
      setActionLoading(true);
      await pollApi.closePoll(item.id);
      setClosePollConfirmVisible(false);
      onClose();
      onActionSuccess?.();
    } catch (e: any) {
      const msg = e?.message || 'Failed to close poll.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Poll Reopen
  const handleReopenPoll = async () => {
    try {
      setActionLoading(true);
      await pollApi.reopenPoll(item.id);
      onClose();
      onActionSuccess?.();
    } catch (e: any) {
      const msg = e?.message || 'Failed to reopen poll.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. View Voters
  const handleOpenVoters = async () => {
    try {
      setLoadingVoters(true);
      setVotersModalVisible(true);
      const res = await pollApi.getPollVoters(item.id);
      const list = res?.data?.data || res?.data?.voters || res?.data || [];
      setVoters(Array.isArray(list) ? list : []);
    } catch {
      setVoters([]);
    } finally {
      setLoadingVoters(false);
    }
  };

  // 7. Export CSV
  const handleExportCSV = async () => {
    try {
      await pollApi.exportPollCSV(item.id);
      if (Platform.OS === 'web') window.alert('Export started.');
      else Alert.alert('Export Successful', 'Ballot CSV records exported.');
    } catch (e: any) {
      const msg = e?.message || 'Failed to export CSV.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Export Failed', msg);
    }
  };

  // 7b. Edit Content via Wizard
  const handleEdit = () => {
    onClose();
    router.push({
      pathname: '/(resident)/community-engagement/edit' as any,
      params: {
        mode: 'edit',
        id: item.id,
        type: isNotice ? 'NOTICE' : 'POLL',
      },
    });
  };

  // 8. Full Details Navigation
  const handleViewFullDetails = () => {
    onClose();
    router.push(item.route as any);
  };

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={isNotice ? 'Notice Overview & Actions' : 'Poll Overview & Actions'}
        snapPoints={['88%']}
      >
        <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
          <View className="gap-5 pb-16">
            {/* Header Preview Card */}
            <View className="bg-card border border-border rounded-2xl p-4 gap-2.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <StatusBadge
                    label={isNotice ? 'Notice' : 'Poll'}
                    variant={isNotice ? 'info' : 'gold'}
                    size="sm"
                  />
                  <StatusBadge
                    label={item.status}
                    variant={getStatusVariant(item.status)}
                    size="sm"
                  />
                </View>
                <Text variant="muted" className="text-xs">
                  {formatDateDisplay(item.createdAt)}
                </Text>
              </View>

              <Text className="text-base font-bold text-foreground">{item.title}</Text>
              <Text variant="muted" className="text-xs">
                {item.subtitle}
              </Text>
            </View>

            {/* Specifications Section */}
            <DetailSection title="Core Specifications">
              {isNotice ? (
                <>
                  <DetailRow label="Category" value={item.category || 'General'} />
                  <DetailRow label="Priority" value={item.priority || 'Medium'} />
                  <DetailRow
                    label="Sign-off Compliance"
                    value={item.requiresAcknowledgement ? 'Mandatory Sign-off' : 'Not Required'}
                  />
                  <DetailRow
                    label="Pinned Status"
                    value={pinnedLocal ? '📌 Pinned to Top' : 'Standard Feed'}
                  />
                  <DetailRow label="Expiry Date" value={formatDateDisplay(item.expiryDate)} />
                </>
              ) : (
                <>
                  <DetailRow
                    label="Voting Format"
                    value={item.votingMode === 'ANONYMOUS' ? 'Anonymous Ballot' : 'Public Vote'}
                  />
                  <DetailRow
                    label="Choice Type"
                    value={
                      item.choiceType === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Single Choice'
                    }
                  />
                  <DetailRow label="Voting Closes" value={formatDateDisplay(item.expiryDate)} />
                </>
              )}
            </DetailSection>

            {/* Live Poll Results & Quorum Section (Poll Only) */}
            {!isNotice && (
              <DetailSection title="Live Results & Quorum">
                {loadingResults ? (
                  <Text className="text-xs text-muted-foreground py-2">
                    Loading live ballot distribution...
                  </Text>
                ) : pollResults?.options && pollResults.options.length > 0 ? (
                  <View className="gap-2.5 pt-1">
                    {/* Quorum indicator if present */}
                    {pollResults.quorumPercentage ? (
                      <View className="p-2.5 bg-muted/30 border border-border/70 rounded-xl mb-1">
                        <Text className="text-xs font-semibold text-foreground">
                          Participation Quorum: {pollResults.quorumPercentage}% Required
                        </Text>
                        <Text variant="muted" className="text-[11px] mt-0.5">
                          {pollResults.totalVotes || 0} Total Votes Recorded
                        </Text>
                      </View>
                    ) : null}

                    {/* Option tallies */}
                    {pollResults.options.map((opt: any, idx: number) => {
                      const total = pollResults.totalVotes || 1;
                      const count = opt.votesCount || 0;
                      const pct = Math.round((count / (pollResults.totalVotes || 1)) * 100);

                      return (
                        <View key={opt._id || idx} className="gap-1">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-xs font-semibold text-foreground flex-1 me-2">
                              {opt.text}
                            </Text>
                            <Text className="text-xs font-bold text-primary">
                              {count} ({pct}%)
                            </Text>
                          </View>
                          <View className="h-2 rounded-full bg-secondary overflow-hidden">
                            <View
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-xs text-muted-foreground py-2">
                    {item.status.toUpperCase() === 'DRAFT'
                      ? 'Poll has not been published yet.'
                      : 'No votes recorded on this poll yet.'}
                  </Text>
                )}
              </DetailSection>
            )}

            {/* Administrative Actions */}
            <View className="gap-2.5">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Management Actions
              </Text>

              {/* Notice Actions */}
              {isNotice ? (
                <View className="gap-2">
                  <View className="flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onPress={handleEdit}
                      accessibilityLabel="Edit Notice"
                    >
                      <Icon as={Edit3} size={15} className="text-foreground me-1.5" />
                      <Text className="text-xs font-semibold text-foreground">Edit Notice</Text>
                    </Button>

                    <Button
                      variant={pinnedLocal ? 'secondary' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onPress={handleTogglePin}
                      disabled={isPinning}
                      accessibilityLabel="Toggle Pin"
                    >
                      <Icon
                        as={pinnedLocal ? PinOff : Pin}
                        size={15}
                        className={pinnedLocal ? 'text-amber-500 me-1.5' : 'text-foreground me-1.5'}
                      />
                      <Text className="text-xs font-semibold">
                        {pinnedLocal ? 'Unpin' : 'Pin to Top'}
                      </Text>
                    </Button>
                  </View>

                  <View className="flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onPress={handleShare}
                      accessibilityLabel="Share Notice"
                    >
                      <Icon as={Share2} size={15} className="text-foreground me-1.5" />
                      <Text className="text-xs font-semibold text-foreground">Share</Text>
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onPress={() => setDeleteConfirmVisible(true)}
                      accessibilityLabel="Delete Notice"
                    >
                      <Icon as={Trash2} size={15} className="text-destructive-foreground me-1.5" />
                      <Text className="text-xs font-semibold text-destructive-foreground">
                        Delete
                      </Text>
                    </Button>
                  </View>
                </View>
              ) : (
                /* Poll Actions */
                <View className="gap-2">
                  <View className="flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onPress={handleEdit}
                      accessibilityLabel="Edit Poll"
                    >
                      <Icon as={Edit3} size={15} className="text-foreground me-1.5" />
                      <Text className="text-xs font-semibold text-foreground">Edit Poll</Text>
                    </Button>

                    {item.status.toUpperCase() === 'ACTIVE' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onPress={() => setClosePollConfirmVisible(true)}
                        accessibilityLabel="Close Poll Early"
                      >
                        <Icon as={Lock} size={15} className="text-amber-500 me-1.5" />
                        <Text className="text-xs font-semibold text-foreground">Close Early</Text>
                      </Button>
                    ) : item.status.toUpperCase() === 'CLOSED' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onPress={handleReopenPoll}
                        disabled={actionLoading}
                        accessibilityLabel="Reopen Poll"
                      >
                        <Icon as={RefreshCw} size={15} className="text-primary me-1.5" />
                        <Text className="text-xs font-semibold text-foreground">Reopen Poll</Text>
                      </Button>
                    ) : null}
                  </View>

                  <View className="flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onPress={handleOpenVoters}
                      accessibilityLabel="Audit Voters"
                    >
                      <Icon as={Users} size={15} className="text-foreground me-1.5" />
                      <Text className="text-xs font-semibold text-foreground">Audit Voters</Text>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onPress={handleExportCSV}
                      accessibilityLabel="Export CSV"
                    >
                      <Icon as={Download} size={15} className="text-foreground me-1.5" />
                      <Text className="text-xs font-semibold text-foreground">Export CSV</Text>
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onPress={() => setDeleteConfirmVisible(true)}
                      accessibilityLabel="Delete Poll"
                    >
                      <Icon as={Trash2} size={15} className="text-destructive-foreground me-1.5" />
                      <Text className="text-xs font-semibold text-destructive-foreground">
                        Delete
                      </Text>
                    </Button>
                  </View>
                </View>
              )}
            </View>

            {/* Full View Navigation CTA */}
            <View className="pt-2 border-t border-border">
              <Button
                variant="default"
                size="lg"
                onPress={handleViewFullDetails}
                accessibilityLabel="View Full Screen Details"
              >
                <Text className="text-sm font-bold text-primary-foreground me-2">
                  {isNotice
                    ? 'View Full Notice & Discussion'
                    : 'View Full Ballot & Cast Vote'}
                </Text>
                <Icon as={ExternalLink} size={16} className="text-primary-foreground" />
              </Button>
            </View>
          </View>
        </ScrollView>
      </BottomSheet>

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        visible={deleteConfirmVisible}
        title={`Delete ${isNotice ? 'Notice' : 'Poll'}?`}
        message={`Are you sure you want to delete "${item.title}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        loading={actionLoading}
      />

      {/* Confirmation Modal for Closing Poll Early */}
      <ConfirmationModal
        visible={closePollConfirmVisible}
        title="Close Poll Early?"
        message="Closing this poll will prevent residents from submitting any further votes. The current results will be finalized."
        variant="warning"
        confirmLabel="Yes, Close Poll"
        cancelLabel="Cancel"
        onConfirm={handleConfirmClosePoll}
        onCancel={() => setClosePollConfirmVisible(false)}
        loading={actionLoading}
      />

      {/* Poll Voters Inspection Modal */}
      <VotersModal
        visible={votersModalVisible}
        onClose={() => setVotersModalVisible(false)}
        poll={item}
        voters={voters}
        loading={loadingVoters}
      />
    </>
  );
};

export default EngagementActionsBottomSheet;
