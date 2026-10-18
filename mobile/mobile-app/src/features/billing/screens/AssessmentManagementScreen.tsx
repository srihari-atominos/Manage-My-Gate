import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { HeaderActionButton } from '@/components/ui/HeaderActionButton';
import {
  SlidersHorizontal,
  Play,
  Send,
  ShieldAlert,
  Landmark,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Pencil,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';
import billingService from '../services/billingService';
import { AssessmentWizardModal } from '../components/wizard';
import { AssessmentRuleCard } from '../components/AssessmentRuleCard';
import { AssessmentDetailModal } from '../components/AssessmentDetailModal';
import { checkIsAdmin } from '@/src/utils/rbac';

function extractPeriodFromTitle(title?: string, billingCycle?: string): string | null {
  if (!title) return null;
  const t = title.toLowerCase();

  const months: Record<string, string> = {
    january: '01',
    jan: '01',
    february: '02',
    feb: '02',
    march: '03',
    mar: '03',
    april: '04',
    apr: '04',
    may: '05',
    june: '06',
    jun: '06',
    july: '07',
    jul: '07',
    august: '08',
    aug: '08',
    september: '09',
    sep: '09',
    sept: '09',
    october: '10',
    oct: '10',
    november: '11',
    nov: '11',
    december: '12',
    dec: '12',
  };

  const yearMatch = title.match(/\b(20\d{2})\b/);
  const currentYear = new Date().getUTCFullYear();
  const year = yearMatch ? yearMatch[1] : String(currentYear);

  if (billingCycle === 'MONTHLY' || !billingCycle || billingCycle === 'RECURRING') {
    for (const [mName, mNum] of Object.entries(months)) {
      if (new RegExp(`\\b${mName}\\b`, 'i').test(t)) {
        return `${year}-${mNum}`;
      }
    }
  }

  const quarterMatch = title.match(/\bQ([1-4])\b/i);
  if (quarterMatch) {
    return `${year}-Q${quarterMatch[1]}`;
  }

  const weekMatch = title.match(/\bW([0-5]?\d)\b/i);
  if (weekMatch) {
    return `${year}-W${weekMatch[1].padStart(2, '0')}`;
  }

  return null;
}

function shiftPeriod(current: string, billingCycle: string, delta: number): string {
  if (billingCycle === 'WEEKLY' && /^(\d{4})-W(\d{2})$/.test(current)) {
    const match = current.match(/^(\d{4})-W(\d{2})$/);
    if (match) {
      let yr = parseInt(match[1], 10);
      let wk = parseInt(match[2], 10) + delta;
      if (wk < 1) {
        yr -= 1;
        wk = 52;
      } else if (wk > 52) {
        yr += 1;
        wk = 1;
      }
      return `${yr}-W${String(wk).padStart(2, '0')}`;
    }
  }

  if (billingCycle === 'QUARTERLY' && /^(\d{4})-Q([1-4])$/.test(current)) {
    const match = current.match(/^(\d{4})-Q([1-4])$/);
    if (match) {
      let yr = parseInt(match[1], 10);
      let qtr = parseInt(match[2], 10) + delta;
      if (qtr < 1) {
        yr -= 1;
        qtr = 4;
      } else if (qtr > 4) {
        yr += 1;
        qtr = 1;
      }
      return `${yr}-Q${qtr}`;
    }
  }

  if (/^(\d{4})-(\d{2})$/.test(current)) {
    const match = current.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      let yr = parseInt(match[1], 10);
      let mo = parseInt(match[2], 10) + delta;
      if (mo < 1) {
        yr -= 1;
        mo = 12;
      } else if (mo > 12) {
        yr += 1;
        mo = 1;
      }
      return `${yr}-${String(mo).padStart(2, '0')}`;
    }
  }

  return current;
}

export function AssessmentManagementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ create?: string; ruleId?: string }>();
  const { loadingStates, error, triggerManualRun, resetBillingError, activeOrgId } = useBilling();

  useBillingSocket();

  // Role Builder's canonical assessment permission is billing:assessments.
  // Keep the legacy assessment_manager value during the migration so existing roles continue working.
  // billing:dashboard alone only permits dashboard access and cannot run or modify assessments.
  const hasAssessmentPermission = useSelector((state: any) => {
    const user = state.auth?.user;
    if (!user) return false;
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    return (
      checkIsAdmin(user) ||
      user.isPlatform === true ||
      permissions.includes('*') ||
      permissions.includes('billing:assessments') ||
      permissions.includes('billing:assessment_manager')
    );
  });

  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [billingPeriodString, setBillingPeriodString] = useState<string>(
    new Date().toISOString().substring(0, 7) // YYYY-MM
  );
  const [showRunConfirmModal, setShowRunConfirmModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isExecutingRun, setIsExecutingRun] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<any | null>(null);
  const [assessmentToEdit, setAssessmentToEdit] = useState<any | null>(null);
  const [selectedDetailAssessment, setSelectedDetailAssessment] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Search & Type Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const isPeriodValid = useMemo(() => {
    return /^\d{4}-(?:[0-1]\d|Q[1-4]|W(?:0[1-9]|[1-4]\d|5[0-3]))$/.test(billingPeriodString.trim());
  }, [billingPeriodString]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((rule) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        (rule.name || '').toLowerCase().includes(query) ||
        (rule.type || '').toLowerCase().includes(query) ||
        (rule.billingCycle || '').toLowerCase().includes(query);

      const matchesType = typeFilter === 'ALL' || rule.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [assessments, searchQuery, typeFilter]);

  const fetchAssessments = useCallback(async () => {
    if (!hasAssessmentPermission) return;
    setIsLoading(true);
    try {
      const data = await billingService.getAssessments();
      const list = Array.isArray(data) ? data : data?.data || [];
      setAssessments(list);
    } catch (err: any) {
      console.warn('Failed to load assessment rules:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [hasAssessmentPermission]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Handle incoming deep link or query param to open Create Rule
  useEffect(() => {
    if (params.create === 'true') {
      setAssessmentToEdit(null);
      setShowCreateModal(true);
    }
  }, [params.create]);

  const handleOpenRunModal = (assessment: any) => {
    setSelectedAssessment(assessment);

    // 1. Smart Title Detection: If assessment title specifies a month/quarter/week, auto-prefill that
    const parsedFromTitle = extractPeriodFromTitle(assessment?.name, assessment?.billingCycle);
    if (parsedFromTitle) {
      setBillingPeriodString(parsedFromTitle);
      setShowRunConfirmModal(true);
      return;
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    if (assessment.billingCycle === 'WEEKLY') {
      const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const dayNr = (target.getUTCDay() + 6) % 7;
      target.setUTCDate(target.getUTCDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setUTCMonth(0, 1);
      if (target.getUTCDay() !== 4) {
        target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
      }
      const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
      const weekYear = new Date(firstThursday).getUTCFullYear();
      setBillingPeriodString(`${weekYear}-W${String(weekNum).padStart(2, '0')}`);
    } else if (assessment.billingCycle === 'QUARTERLY') {
      const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
      setBillingPeriodString(`${year}-Q${quarter}`);
    } else {
      setBillingPeriodString(`${year}-${month}`);
    }
    setShowRunConfirmModal(true);
  };

  const handleExecuteRun = async () => {
    if (!selectedAssessment || isExecutingRun) return;
    setIsExecutingRun(true);

    const targetId = selectedAssessment._id || selectedAssessment.id;
    const period = billingPeriodString.trim();

    try {
      const result = await triggerManualRun(targetId, period);
      setIsExecutingRun(false);
      setShowRunConfirmModal(false);

      const createdCount = result?.created ?? 0;
      const skippedCount = result?.duplicatesSkipped ?? 0;

      // Optimistic update of local assessment list so the card changes immediately
      setAssessments((prev) =>
        prev.map((item) => {
          if ((item._id || item.id) === targetId) {
            return {
              ...item,
              lastRunAt: new Date(),
              lastBilledPeriod: period,
              lastRunStats: {
                created: createdCount,
                duplicatesSkipped: skippedCount,
                totalTargeted: result?.totalTargeted ?? createdCount + skippedCount,
              },
            };
          }
          return item;
        })
      );

      // Trigger background sync
      fetchAssessments();

      if (createdCount > 0) {
        Alert.alert(
          'Billing Run Completed!',
          `Successfully generated ${createdCount} invoice${createdCount > 1 ? 's' : ''} for period ${period}.${skippedCount > 0 ? ` (${skippedCount} units were already invoiced and skipped)` : ''} Invoices have been dispatched to residents.`,
          [
            {
              text: 'View Ledger',
              onPress: () => router.navigate('/(resident)/admin/billing/ledger' as any),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert(
          'Cycle Already Invoiced',
          `All ${skippedCount > 0 ? skippedCount : 'targeted'} homes have already been billed for period ${period}. No duplicate invoices were created.`,
          [
            {
              text: 'View Ledger',
              onPress: () => router.navigate('/(resident)/admin/billing/ledger' as any),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (err: any) {
      setIsExecutingRun(false);
      setShowRunConfirmModal(false);
      const isConflict =
        err?.statusCode === 409 || String(err).includes('409') || String(err).includes('already');
      Alert.alert(
        isConflict ? 'Cycle Already Executed' : 'Billing Run Failed',
        isConflict
          ? `Billing cycle for period ${period} has already been generated for this assessment.`
          : err?.message || err || 'Could not execute billing run.'
      );
    }
  };

  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    setIsDeleting(true);
    try {
      const targetId = assessmentToDelete._id || assessmentToDelete.id;
      const res = await billingService.deleteAssessment(targetId);
      const message = res?.message || 'Assessment rule processed successfully.';
      Alert.alert('Assessment Rule Action', message);
      setShowDeleteConfirmModal(false);
      setAssessmentToDelete(null);
      fetchAssessments();
    } catch (err: any) {
      Alert.alert('Delete Failed', err?.message || err || 'Could not delete assessment rule.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View className="relative flex-1 bg-background">
      <ScreenShell
        title="Assessment Management"
        subtitle={
          !hasAssessmentPermission
            ? 'Access Restricted'
            : 'Maintenance calculation formulas & billing runs'
        }
        iconName="SlidersHorizontal"
        loading={hasAssessmentPermission && isLoading && assessments.length === 0}
        headerRight={
          !hasAssessmentPermission ? undefined : (
            <HeaderActionButton
              icon={Plus}
              label="Create Rule"
              onPress={() => {
                setAssessmentToEdit(null);
                setShowCreateModal(true);
              }}
              accessibilityLabel="Create New Assessment Rule"
            />
          )
        }>
        {!hasAssessmentPermission ? (
          <View className="flex-1 items-center justify-center bg-background p-6">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Icon as={ShieldAlert} size={32} className="text-destructive" />
            </View>
            <Text className="mb-2 text-center font-bold text-xl text-foreground">
              Access Denied
            </Text>
            <Text className="mb-6 px-4 text-center text-sm text-muted-foreground">
              You do not have the required administrative permission (
              <Text className="font-bold font-mono text-xs">billing:assessments</Text>) to manage
              assessment rules or execute billing runs.
            </Text>
            <Button
              variant="default"
              size="lg"
              onPress={() => router.navigate('/(resident)/billing/my-dues' as any)}
              accessibilityRole="button"
              accessibilityLabel="Return to My Dues">
              Return to My Dues
            </Button>
          </View>
        ) : (
          <>
            {/* CANONICAL SEARCH FILTER BAR WITH MOVEABLE STATUS SLIDE PILLS */}
            <View className="px-4 pb-1 pt-3">
              <SearchFilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search rule..."
                sortOptions={[
                  { label: 'All', value: 'ALL' },
                  { label: 'Recurring', value: 'RECURRING' },
                  { label: 'One-Time', value: 'ONE_TIME' },
                  { label: 'Capital Repair', value: 'CAPITAL_REPAIR' },
                ]}
                currentSort={typeFilter}
                onSortChange={(val: any) => setTypeFilter(val)}
                variant="default"
                className="border-0 px-0 py-0"
              />

              <View className="flex-row items-center pb-1 pt-2">
                <Text className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Assessment Rules ({filteredAssessments.length} of {assessments.length})
                </Text>
              </View>
            </View>

            {/* ── SCROLLABLE CARDS AREA ────────────────────────────────────────── */}
            <ScrollView
              className="flex-1 bg-background"
              contentContainerStyle={{
                paddingVertical: 16,
                paddingHorizontal: 16,
                paddingBottom: 120,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={fetchAssessments}
                  colors={['#6366f1']}
                />
              }>
              {/* Error Banner */}
              {error ? (
                <View className="mb-4">
                  <ErrorBanner message={error} onDismiss={resetBillingError} />
                </View>
              ) : null}

              {/* Assessments Rules List */}
              {filteredAssessments.length === 0 && !isLoading ? (
                <View className="my-4 items-center rounded-xl border border-border bg-card p-6">
                  <Icon as={Landmark} size={32} className="mb-2 text-muted-foreground" />
                  <Text className="mb-1 font-bold text-base text-foreground">
                    {searchQuery || typeFilter !== 'ALL'
                      ? 'No Matching Rules Found'
                      : 'No Assessment Rules Found'}
                  </Text>
                  <Text className="mb-4 text-center text-xs text-muted-foreground">
                    {searchQuery || typeFilter !== 'ALL'
                      ? `No rules match "${searchQuery}" with filter "${typeFilter}". Try resetting your search.`
                      : 'No active maintenance assessment calculation formulas exist for this community.'}
                  </Text>
                  {searchQuery || typeFilter !== 'ALL' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        setSearchQuery('');
                        setTypeFilter('ALL');
                      }}>
                      Reset Search & Filters
                    </Button>
                  ) : null}
                </View>
              ) : (
                filteredAssessments.map((rule) => {
                  const ruleId = rule._id || rule.id;
                  return (
                    <AssessmentRuleCard
                      key={ruleId}
                      rule={rule}
                      onPress={(r) => {
                        setSelectedDetailAssessment(r);
                        setShowDetailModal(true);
                      }}
                      onRun={(r) => handleOpenRunModal(r)}
                      onEdit={(r) => {
                        setAssessmentToEdit(r);
                        setShowCreateModal(true);
                      }}
                      onDelete={(r) => {
                        setAssessmentToDelete(r);
                        setShowDeleteConfirmModal(true);
                      }}
                    />
                  );
                })
              )}
            </ScrollView>
          </>
        )}
      </ScreenShell>

      {/* Assessment Rule Detail Bottom Sheet */}
      <AssessmentDetailModal
        visible={showDetailModal}
        assessment={selectedDetailAssessment}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedDetailAssessment(null);
        }}
        onRun={(r) => handleOpenRunModal(r)}
        onEdit={(r) => {
          setShowDetailModal(false);
          setAssessmentToEdit(r);
          setShowCreateModal(true);
        }}
        onDelete={(r) => {
          setShowDetailModal(false);
          setAssessmentToDelete(r);
          setShowDeleteConfirmModal(true);
        }}
        onViewLedger={() => router.navigate('/(resident)/admin/billing/ledger' as any)}
      />

      {/* 5-Step Assessment Wizard Modal */}
      <AssessmentWizardModal
        visible={showCreateModal}
        communityId={activeOrgId}
        assessment={assessmentToEdit}
        onClose={() => {
          setShowCreateModal(false);
          setAssessmentToEdit(null);
        }}
        onSuccess={() => {
          fetchAssessments();
        }}
      />

      {/* Interactive Modal for Manual Billing Run with Smart Pre-fill & Live Validation */}
      <Modal
        visible={showRunConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isExecutingRun && setShowRunConfirmModal(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 p-4"
          onPress={() => !isExecutingRun && setShowRunConfirmModal(false)}>
          <Pressable
            className="w-full max-w-md gap-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
            onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-border pb-3">
              <View className="me-2 flex-1">
                <Text className="font-extrabold text-base text-foreground">
                  Execute Manual Billing Run
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                  {selectedAssessment?.name || 'Assessment Rule'}
                </Text>
              </View>
              <StatusBadge
                label={selectedAssessment?.billingCycle || selectedAssessment?.type || 'ACTIVE'}
                variant="info"
              />
            </View>

            {/* Assessment Rule Details */}
            <View className="gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <Text className="font-bold text-xs text-primary">
                📊 Rule: {selectedAssessment?.name}
              </Text>
              <Text className="text-xs text-muted-foreground">
                This action will calculate and generate maintenance invoices for all targeted
                community units in the specified billing period.
              </Text>
            </View>

            {/* Period String Input with Steppers & Preset Quick Chips */}
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-xs text-foreground">Billing Period Code *</Text>
                {/* Stepper Buttons */}
                <View className="flex-row items-center gap-1.5">
                  <TouchableOpacity
                    onPress={() =>
                      setBillingPeriodString((prev) =>
                        shiftPeriod(prev, selectedAssessment?.billingCycle || 'MONTHLY', -1)
                      )
                    }
                    activeOpacity={0.7}
                    className="flex-row items-center gap-1 rounded-lg border border-border bg-muted/50 px-2 py-1 active:bg-muted"
                    accessibilityRole="button"
                    accessibilityLabel="Previous billing period">
                    <Icon as={ChevronLeft} size={14} className="text-foreground" />
                    <Text className="font-semibold text-[11px] text-foreground">Prev</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      setBillingPeriodString((prev) =>
                        shiftPeriod(prev, selectedAssessment?.billingCycle || 'MONTHLY', 1)
                      )
                    }
                    activeOpacity={0.7}
                    className="flex-row items-center gap-1 rounded-lg border border-border bg-muted/50 px-2 py-1 active:bg-muted"
                    accessibilityRole="button"
                    accessibilityLabel="Next billing period">
                    <Text className="font-semibold text-[11px] text-foreground">Next</Text>
                    <Icon as={ChevronRight} size={14} className="text-foreground" />
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                placeholder={
                  selectedAssessment?.billingCycle === 'WEEKLY'
                    ? 'e.g. 2026-W36'
                    : selectedAssessment?.billingCycle === 'QUARTERLY'
                      ? 'e.g. 2026-Q3'
                      : 'e.g. 2026-09'
                }
                value={billingPeriodString}
                onChangeText={setBillingPeriodString}
                autoCapitalize="characters"
                error={
                  !isPeriodValid && billingPeriodString.length > 0
                    ? 'Format must be YYYY-MM (e.g. 2026-09), YYYY-Qx (e.g. 2026-Q3), or YYYY-Wxx (e.g. 2026-W36).'
                    : undefined
                }
              />

              <Text className="ms-1 text-[11px] text-muted-foreground">
                {selectedAssessment?.billingCycle === 'WEEKLY'
                  ? '💡 Tip: ISO Week code format YYYY-Wxx (e.g. 2026-W36)'
                  : selectedAssessment?.billingCycle === 'QUARTERLY'
                    ? '💡 Tip: Quarter code format YYYY-Qx (e.g. 2026-Q3)'
                    : '💡 Tip: Use Prev/Next or type YYYY-MM directly (e.g. 2026-07 for July)'}
              </Text>
            </View>

            {/* Cycle Already Run Warning */}
            {selectedAssessment?.lastBilledPeriod === billingPeriodString.trim() ? (
              <View className="flex-row items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                <Icon as={Clock} size={16} className="mt-0.5 text-amber-600 dark:text-amber-400" />
                <View className="flex-1">
                  <Text className="font-bold text-xs text-amber-900 dark:text-amber-200">
                    Cycle {billingPeriodString.trim()} was already executed
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                    {selectedAssessment?.lastRunStats?.created !== undefined
                      ? `${selectedAssessment.lastRunStats.created} homes were already invoiced.`
                      : 'This cycle was already processed.'}{' '}
                    Re-running with this period will safely skip already-billed units.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View className="flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onPress={() => setShowRunConfirmModal(false)}
                disabled={isExecutingRun}
                accessibilityRole="button"
                accessibilityLabel="Cancel Billing Run">
                Cancel
              </Button>

              <Button
                variant="default"
                className="flex-1 bg-primary"
                onPress={handleExecuteRun}
                loading={isExecutingRun || loadingStates.triggerRun}
                disabled={!isPeriodValid || isExecutingRun}
                accessibilityRole="button"
                accessibilityLabel="Execute Billing Run">
                <Icon as={Play} size={14} className="me-1.5 text-white" />
                <Text className="font-bold text-xs text-white">
                  {selectedAssessment?.lastBilledPeriod === billingPeriodString.trim()
                    ? 'Re-run (Skip Existing)'
                    : 'Execute Run'}
                </Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmation Modal for Delete Assessment Rule */}
      <ConfirmationModal
        visible={showDeleteConfirmModal}
        title="Delete Assessment Rule?"
        message={`Are you sure you want to delete '${assessmentToDelete?.name || 'this assessment rule'}'? If invoices have not been generated yet, it will be permanently deleted. Otherwise, it will be safely archived.`}
        confirmLabel="Delete Rule"
        cancelLabel="Cancel"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDeleteAssessment}
        onCancel={() => {
          setShowDeleteConfirmModal(false);
          setAssessmentToDelete(null);
        }}
      />
    </View>
  );
}

export default AssessmentManagementScreen;
