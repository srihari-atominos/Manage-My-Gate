import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { SearchBar } from '@/components/forms/SearchBar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/common/Button';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import {
  Wrench,
  FileText,
  Calendar,
  CheckCircle2,
  TrendingUp,
  MessageSquare
} from 'lucide-react-native';
import { useComplaints } from '../hooks/useComplaints';
import { useAmenity } from '@/src/features/amenities/hooks/useAmenity';
import { ComplaintQuickNavHub } from '../components/ComplaintQuickNavHub';
import { ComplaintLiveActivityWidget } from '../components/ComplaintLiveActivityWidget';

export function ComplaintDashboardScreen() {
  const router = useRouter();
  const { complaints, dashboardAnalytics, isLoading, error, fetchComplaints, fetchDashboardAnalytics, createComplaint, clearErrors } = useComplaints();
  const { amenities, fetchAmenities } = useAmenity();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFeedbackSheet, setShowFeedbackSheet] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const loadData = useCallback(() => {
    fetchComplaints();
    fetchDashboardAnalytics();
    if (fetchAmenities) {
      fetchAmenities();
    }
  }, [fetchComplaints, fetchDashboardAnalytics, fetchAmenities]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Comprehensive Maintenance Notices Engine
  const maintenanceNotices = useMemo(() => {
    const notices: Array<{ id: string; title: string; message: string; date: string; variant?: 'warning' | 'danger' | 'info' }> = [];

    if (dashboardAnalytics?.notices && Array.isArray(dashboardAnalytics.notices)) {
      dashboardAnalytics.notices.forEach((n: any) => {
        notices.push({
          id: `backend-${n.id || Math.random()}`,
          title: n.title || 'Scheduled Maintenance',
          message: n.message || n.description || 'System maintenance notice.',
          date: n.timestamp ? new Date(n.timestamp).toLocaleDateString() : 'Active Notice',
          variant: 'warning',
        });
      });
    }

    if (amenities && amenities.length > 0) {
      amenities.forEach((amenity: any) => {
        if (amenity.status === 'maintenance' || amenity.maintenanceSchedules?.length > 0) {
          const activeSchedules =
            amenity.maintenanceSchedules?.filter(
              (s: any) => s.status !== 'completed' && s.status !== 'cancelled'
            ) || [];

          if (amenity.status === 'maintenance' && activeSchedules.length === 0) {
            notices.push({
              id: `amn-${amenity._id}`,
              title: `${amenity.name} Temporarily Closed`,
              message: `The ${amenity.name} is currently undergoing maintenance.`,
              date: amenity.updatedAt ? new Date(amenity.updatedAt).toLocaleDateString() : 'Active',
              variant: 'warning',
            });
          }

          activeSchedules.forEach((schedule: any) => {
            notices.push({
              id: `amn-sch-${schedule._id}`,
              title: schedule.title || `${amenity.name} Maintenance`,
              message:
                schedule.description ||
                `Scheduled maintenance window for ${amenity.name}.`,
              date: schedule.startDate ? new Date(schedule.startDate).toLocaleDateString() : 'Scheduled',
              variant: 'info',
            });
          });
        }
      });
    }

    if (complaints && complaints.length > 0) {
      complaints.forEach((c: any) => {
        if ((c.priority === 'Critical' || c.status === 'Escalated') && !['Closed', 'Completed', 'Resolved', 'Cancelled'].includes(c.status)) {
          notices.push({
            id: `cmp-crit-${c._id}`,
            title: `Critical Alert: ${c.title}`,
            message: c.description
              ? `${c.description} (${c.location?.flat || c.location?.building || 'Common Area'})`
              : `Active emergency issue reported at ${c.location?.flat || c.location?.building || 'Common Area'}.`,
            date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Immediate',
            variant: 'danger',
          });
        }
      });
    }

    return notices;
  }, [dashboardAnalytics, amenities, complaints]);

  const handleFeedbackSubmit = async () => {
    if (!generalFeedback.trim()) {
      Alert.alert('Required Field', 'Please enter your feedback remarks before submitting.');
      return;
    }
    try {
      setIsSubmittingFeedback(true);
      await createComplaint({
        title: 'Resident Feedback & Suggestions',
        description: generalFeedback,
        category: 'Feedback',
        priority: 'Medium',
        department: 'Management',
        isEmergency: false,
      });
      Alert.alert('Feedback Submitted', 'Thank you! Your feedback has been sent to community management.');
      setGeneralFeedback('');
      setShowFeedbackSheet(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      Alert.alert('Error', err?.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const kpis = dashboardAnalytics?.kpis || {
    total: complaints.length || 0,
    today: complaints.filter((c: any) => {
      const d = c.createdAt ? new Date(c.createdAt) : null;
      return d && d.toDateString() === new Date().toDateString();
    }).length,
    open: complaints.filter((c: any) => ['Submitted', 'Open', 'Waiting For Assignment'].includes(c.status)).length,
    inProgress: complaints.filter((c: any) => ['Assigned', 'In Progress', 'Accepted'].includes(c.status)).length,
    resolved: complaints.filter((c: any) => ['Closed', 'Completed', 'Resolved'].includes(c.status)).length,
    closed: complaints.filter((c: any) => c.status === 'Closed').length,
    todayResolved: 0,
  };

  const totalReported = kpis.total || 0;
  const totalResolved = (kpis.resolved || 0) + (kpis.closed || 0);

  return (
    <ScreenShell
      title="Complaints & Maintenance"
      iconName="Wrench"
      loading={isLoading && !dashboardAnalytics && complaints.length === 0}
      error={error}
      onRetry={loadData}
    >
      <View className="flex-1 bg-background">
        {error ? (
          <View className="p-4 pb-0">
            <ErrorBanner message={error} onDismiss={clearErrors} />
          </View>
        ) : null}

        <ScrollView
          className="flex-1 px-4 pt-3"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#6366f1" />}
        >
          {/* Master Search Bar (matching Amenities Executive Dashboard pattern) */}
          <View className="mb-5">
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tickets, staff, features, or upkeep..."
            />
          </View>

          {/* Top KPI Row (3 Cards matching Amenities Dashboard layout) */}
          <View className="flex-row gap-3 mb-7">
            {/* KPI 1: Total Reported */}
            <View className="flex-1 bg-card p-3.5 rounded-2xl border border-border/60 shadow-xs justify-between">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide" numberOfLines={1}>Reported</Text>
                <View className="w-5.5 h-5.5 rounded-full bg-blue-500/15 items-center justify-center">
                  <FileText size={12} color="#3b82f6" />
                </View>
              </View>
              <Text className="text-base font-bold text-foreground my-0.5" numberOfLines={1}>
                {totalReported}
              </Text>
              <Text className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold" numberOfLines={1}>
                Total Tickets
              </Text>
            </View>

            {/* KPI 2: Today Complaints */}
            <View className="flex-1 bg-card p-3.5 rounded-2xl border border-border/60 shadow-xs justify-between">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide" numberOfLines={1}>Today New</Text>
                <View className="w-5.5 h-5.5 rounded-full bg-amber-500/15 items-center justify-center">
                  <Calendar size={12} color="#f59e0b" />
                </View>
              </View>
              <Text className="text-base font-bold text-foreground my-0.5" numberOfLines={1}>
                {kpis.today || 0}
              </Text>
              <Text className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold" numberOfLines={1}>
                Submissions
              </Text>
            </View>

            {/* KPI 3: Total Resolved */}
            <View className="flex-1 bg-card p-3.5 rounded-2xl border border-border/60 shadow-xs justify-between">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide" numberOfLines={1}>Resolved</Text>
                <View className="w-5.5 h-5.5 rounded-full bg-emerald-500/15 items-center justify-center">
                  <CheckCircle2 size={12} color="#10b981" />
                </View>
              </View>
              <Text className="text-base font-bold text-foreground my-0.5" numberOfLines={1}>
                {totalResolved}
              </Text>
              <Text className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold" numberOfLines={1}>
                Completed
              </Text>
            </View>
          </View>

          {/* Sub-Navigation Quick Hub (Matching MobileQuickNavHub) */}
          <ComplaintQuickNavHub
            searchQuery={searchQuery}
            badgeCounts={{
              myTickets: complaints.length,
              openTickets: kpis.open,
              unassigned: kpis.open,
              activeMaintenance: maintenanceNotices.length,
            }}
            onFeedbackPress={() => setShowFeedbackSheet(true)}
          />

          {/* Live Activity & Notices Feed (Matching MobileLiveActivityWidget) */}
          <ComplaintLiveActivityWidget
            complaints={complaints}
            maintenanceNotices={maintenanceNotices}
          />
        </ScrollView>
      </View>

      {/* Resident Feedback Bottom Sheet Modal */}
      <BottomSheet
        visible={showFeedbackSheet}
        onClose={() => setShowFeedbackSheet(false)}
        title="Provide Feedback & Suggestions"
      >
        <View className="p-4">
          <Text className="text-xs text-muted-foreground mb-4">
            Share your experience, feature requests, or general community suggestions directly with society management.
          </Text>

          <TextInput
            label="Feedback & Suggestion Remarks *"
            placeholder="Type your feedback message here..."
            value={generalFeedback}
            onChangeText={setGeneralFeedback}
            multiline
            numberOfLines={4}
            className="mb-4"
          />

          <View className="flex-row justify-end gap-3 mt-2">
            <Button
              variant="outline"
              onPress={() => setShowFeedbackSheet(false)}
              disabled={isSubmittingFeedback}
            >
              Cancel
            </Button>
            <Button
              onPress={handleFeedbackSubmit}
              loading={isSubmittingFeedback}
            >
              Submit Feedback
            </Button>
          </View>
        </View>
      </BottomSheet>
    </ScreenShell>
  );
}

export default ComplaintDashboardScreen;
