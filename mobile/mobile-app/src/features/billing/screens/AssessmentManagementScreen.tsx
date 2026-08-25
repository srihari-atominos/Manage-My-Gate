import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl, TextInput, Alert, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { SearchBar } from '@/components/forms/SearchBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Landmark, Plus, ShieldAlert } from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';
import billingService from '../services/billingService';
import { AssessmentWizardModal } from '../components/wizard/AssessmentWizardModal';
import { AssessmentRuleCard } from '../components/AssessmentRuleCard';

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
        iconName="Sliders"
        loading={isLoading && assessments.length === 0}
        headerRight={
          <Button
            variant="default"
            size="sm"
            className="flex-row items-center px-3 h-9 rounded-full"
            onPress={() => {
              setAssessmentToEdit(null);
              setShowCreateModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Create New Assessment Rule"
          >
            <Icon as={Plus} size={14} className="text-primary-foreground me-1" />
            <Text className="font-bold text-xs text-primary-foreground">Create Rule</Text>
          </Button>
        }
      >
        <View className="flex-1 bg-background">
          <PaginatedList<any>
            data={filteredAssessments}
            renderItem={(rule) => {
              const ruleId = rule._id || rule.id;
              return (
                <AssessmentRuleCard
                  key={ruleId}
                  rule={rule}
                  onRun={handleOpenRunModal}
                  onEdit={(r) => {
                    setAssessmentToEdit(r);
                    setShowCreateModal(true);
                  }}
                  onDelete={(r) => {
                    setAssessmentToDelete(r);
                    setShowDeleteConfirmModal(true);
                  }}
                  className="mb-3"
                />
              );
            }}
            pagination={{
              currentPage: 1,
              totalPages: 1,
              totalRecords: filteredAssessments.length,
              limit: 50,
            }}
            onLoadMore={() => {}}
            onRefresh={fetchAssessments}
            loading={isLoading}
            ListHeaderComponent={
              <View className="gap-2.5 mb-3">
                {/* Error Banner */}
                {error ? (
                  <ErrorBanner message={error} onDismiss={resetBillingError} />
                ) : null}

                {/* Search Input Box */}
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search rule..."
                />

                {/* Type Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full">
                  <View className="flex-row gap-1.5 pe-4">
                    {[
                      { label: 'All', value: 'ALL' },
                      { label: 'Recurring', value: 'RECURRING' },
                      { label: 'One-Time', value: 'ONE_TIME' },
                      { label: 'Capital Repair', value: 'CAPITAL_REPAIR' },
                    ].map((tab) => {
                      const isSelected = typeFilter === tab.value;
                      return (
                        <TouchableOpacity
                          key={tab.value}
                          onPress={() => setTypeFilter(tab.value)}
                          activeOpacity={0.7}
                          className={`px-3 py-1.5 rounded-full border ${
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-border bg-card'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              isSelected ? 'text-primary-foreground' : 'text-foreground'
                            }`}
                          >
                            {tab.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Rule Count Header */}
                <View className="flex-row items-center justify-between pt-1">
                  <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Assessment Rules ({filteredAssessments.length} of {assessments.length})
                  </Text>
                </View>
              </View>
            }
            emptyIcon="Sliders"
            emptyTitle={searchQuery || typeFilter !== 'ALL' ? 'No Matching Rules Found' : 'No Assessment Rules Found'}
            emptySubtitle={
              searchQuery || typeFilter !== 'ALL'
                ? `No rules match "${searchQuery}" with filter "${typeFilter}". Try resetting your search.`
                : 'No active maintenance assessment calculation formulas exist for this community.'
            }
            contentContainerClassName="px-4 pt-3 pb-28"
          />
        </View>
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
