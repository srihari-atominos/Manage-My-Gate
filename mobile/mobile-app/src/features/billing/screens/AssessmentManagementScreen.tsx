import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl, TextInput, Alert, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/common/Button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { SearchBar } from '@/components/forms/SearchBar';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { SlidersHorizontal, Play, Send, ShieldAlert, Landmark, Calendar, Layers, CheckCircle2, Clock, Plus, Trash2, Pencil, Filter } from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';
import billingService from '../services/billingService';
import { AssessmentWizardModal } from '../components/wizard/AssessmentWizardModal';

export function AssessmentManagementScreen() {
  const router = useRouter();
  const { loadingStates, error, triggerManualRun, resetBillingError, activeOrgId } = useBilling();

  useBillingSocket();

  // Permission check from auth state
  const permissions: string[] = useSelector((state: any) => state.auth?.user?.permissions || []);
  const userRole: string = useSelector((state: any) => state.auth?.user?.role || '');
  const isSuperAdmin = userRole === 'SuperAdmin' || userRole === 'Admin';
  const hasAssessmentPermission = isSuperAdmin || permissions.includes('billing:assessment_manager') || permissions.includes('*');

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
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Search & Type Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

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

  // Permission Denied View
  if (!hasAssessmentPermission) {
    return (
      <ScreenShell title="Assessment Management" subtitle="Access Restricted" iconName="Sliders">
        <View className="flex-1 bg-background p-6 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-destructive/10 items-center justify-center mb-4">
            <Icon as={ShieldAlert} size={32} className="text-destructive" />
          </View>
          <Text className="text-xl font-bold text-foreground text-center mb-2">Access Denied</Text>
          <Text className="text-sm text-muted-foreground text-center mb-6 px-4">
            You do not have the required administrative permission (<Text className="font-mono text-xs font-bold">billing:assessment_manager</Text>) to manage assessment rules or execute billing runs.
          </Text>
          <Button
            variant="default"
            size="lg"
            onPress={() => router.push('/(resident)/billing/my-dues' as any)}
            accessibilityRole="button"
            accessibilityLabel="Return to My Dues"
          >
            Return to My Dues
          </Button>
        </View>
      </ScreenShell>
    );
  }

  const handleOpenRunModal = (assessment: any) => {
    setSelectedAssessment(assessment);
    setShowRunConfirmModal(true);
  };

  const handleExecuteRun = async () => {
    if (!selectedAssessment || isExecutingRun) return;
    setIsExecutingRun(true);

    const targetId = selectedAssessment._id || selectedAssessment.id;
    try {
      const result = await triggerManualRun(targetId, billingPeriodString.trim());
      setIsExecutingRun(false);
      setShowRunConfirmModal(false);

      Alert.alert(
        'Billing Run Executed!',
        `Manual billing run completed for period ${billingPeriodString.trim()}. Generated invoices have been dispatched to residents.`,
        [
          { text: 'View Ledger', onPress: () => router.push('/(resident)/admin/billing/ledger' as any) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      setIsExecutingRun(false);
      setShowRunConfirmModal(false);
      const isConflict = err?.statusCode === 409 || String(err).includes('409') || String(err).includes('already');
      Alert.alert(
        isConflict ? 'Cycle Already Executed' : 'Billing Run Failed',
        isConflict
          ? `Billing cycle for period ${billingPeriodString.trim()} has already been generated for this assessment.`
          : (err?.message || err || 'Could not execute billing run.')
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
    <>
      <ScreenShell
        title="Assessment Management"
        subtitle="Maintenance calculation formulas & billing runs"
        iconName="SlidersHorizontal"
        loading={isLoading && assessments.length === 0}
        headerRight={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAssessmentToEdit(null);
              setShowCreateModal(true);
            }}
            className="h-9 px-3 rounded-xl bg-emerald-600 active:bg-emerald-700 flex-row items-center justify-center gap-1.5 shadow-sm"
            accessibilityRole="button"
            accessibilityLabel="Create New Assessment Rule"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={15} color="#ffffff" strokeWidth={2.5} />
            <Text className="text-xs font-bold text-white">Create Rule</Text>
          </TouchableOpacity>
        }
      >
        {/* CANONICAL SEARCH FILTER BAR WITH MOVEABLE STATUS SLIDE PILLS */}
        <View className="px-4 pt-3 pb-1">
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
            onSortChange={(val) => setTypeFilter(val as any)}
            variant="default"
            className="px-0 py-0 border-0"
          />

          <View className="flex-row items-center justify-between pt-2 pb-1">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Assessment Rules ({filteredAssessments.length} of {assessments.length})
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setAssessmentToEdit(null);
                setShowCreateModal(true);
              }}
              className="flex-row items-center gap-1 bg-emerald-600/10 border border-emerald-600/25 px-2.5 py-1 rounded-lg"
              accessibilityRole="button"
              accessibilityLabel="New Rule"
            >
              <Plus size={13} className="text-emerald-600 dark:text-emerald-400" />
              <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                + New Rule
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SCROLLABLE CARDS AREA ────────────────────────────────────────── */}
        <ScrollView
          className="flex-1 bg-background"
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchAssessments} colors={['#6366f1']} />
          }
        >
          {/* Error Banner */}
          {error ? (
            <View className="mb-4">
              <ErrorBanner message={error} onDismiss={resetBillingError} />
            </View>
          ) : null}

          {/* Assessments Rules List */}
          {filteredAssessments.length === 0 && !isLoading ? (
            <View className="bg-card border border-border rounded-xl p-6 items-center my-4">
              <Icon as={Landmark} size={32} className="text-muted-foreground mb-2" />
              <Text className="font-bold text-foreground text-base mb-1">
                {searchQuery || typeFilter !== 'ALL' ? 'No Matching Rules Found' : 'No Assessment Rules Found'}
              </Text>
              <Text className="text-xs text-muted-foreground text-center mb-4">
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
                  }}
                >
                  Reset Search & Filters
                </Button>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setAssessmentToEdit(null);
                    setShowCreateModal(true);
                  }}
                  className="bg-emerald-600 active:bg-emerald-700 px-4 py-2.5 rounded-xl flex-row items-center gap-2 shadow-sm"
                  accessibilityRole="button"
                  accessibilityLabel="Create First Assessment Rule"
                >
                  <Plus size={16} color="#ffffff" strokeWidth={2.5} />
                  <Text className="text-xs font-bold text-white">Create First Assessment Rule</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredAssessments.map((rule) => {
              const ruleId = rule._id || rule.id;
              const calcType = rule.calculationMethod?.type || 'FLAT_RATE';
              const rateDisplay =
                calcType === 'PER_SQ_FT'
                  ? `₹${rule.calculationMethod?.ratePerSqFt || 0} / sq.ft`
                  : `₹${(rule.calculationMethod?.flatAmount || 0).toLocaleString('en-IN')} Flat`;

              return (
                <View key={ruleId} className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 me-2">
                      <Text className="font-extrabold text-base text-foreground">{rule.name}</Text>
                      <Text className="text-xs text-muted-foreground">
                        {rule.billingCycle || 'MONTHLY'} • {rule.type || 'RECURRING'}
                      </Text>
                    </View>
                    <StatusBadge label={rule.isActive !== false ? 'ACTIVE' : 'INACTIVE'} variant={rule.isActive !== false ? 'success' : 'neutral'} dot />
                  </View>

                  {/* Calculation Details */}
                  <View className="bg-muted/50 rounded-lg p-3 my-2 gap-1.5">
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-muted-foreground font-semibold">Calculation Method:</Text>
                      <Text className="text-xs font-bold text-foreground">{calcType.replace(/_/g, ' ')}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-muted-foreground font-semibold">Assessment Rate:</Text>
                      <Text className="text-xs font-extrabold text-primary">{rateDisplay}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-muted-foreground font-semibold">Generation Day:</Text>
                      <Text className="text-xs font-bold text-foreground">{rule.generationDay || '1'}</Text>
                    </View>
                  </View>

                  {/* Action CTAs */}
                  <View className="flex-row gap-2 mt-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-emerald-600 active:bg-emerald-700"
                      onPress={() => handleOpenRunModal(rule)}
                      accessibilityRole="button"
                      accessibilityLabel={`Run billing for ${rule.name}`}
                    >
                      <Icon as={Play} size={14} className="text-white me-1.5" />
                      <Text className="font-bold text-xs text-white">Run Billing</Text>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border bg-card px-3"
                      onPress={() => {
                        setAssessmentToEdit(rule);
                        setShowCreateModal(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit assessment rule ${rule.name}`}
                    >
                      <Icon as={Pencil} size={14} className="text-foreground" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 px-3"
                      onPress={() => {
                        setAssessmentToDelete(rule);
                        setShowDeleteConfirmModal(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete assessment rule ${rule.name}`}
                    >
                      <Icon as={Trash2} size={14} className="text-red-600 dark:text-red-400" />
                    </Button>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </ScreenShell>

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

      {/* Confirmation Modal for Billing Run */}
      <ConfirmationModal
        visible={showRunConfirmModal}
        title="Execute Manual Billing Run?"
        message={`Are you sure you want to trigger billing generation for '${selectedAssessment?.name || 'Assessment'}' for period '${billingPeriodString.trim()}'? This action will generate maintenance invoices across target units in the community.`}
        confirmLabel="Execute Billing Run"
        cancelLabel="Cancel"
        variant="info"
        loading={isExecutingRun || loadingStates.triggerRun}
        onConfirm={handleExecuteRun}
        onCancel={() => setShowRunConfirmModal(false)}
      />

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
    </>
  );
}

export default AssessmentManagementScreen;
