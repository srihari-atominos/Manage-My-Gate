import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { SearchBar } from '@/components/forms/SearchBar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/ui/button';
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
  const maintenanceList = useSelector((state: any) => state.amenities?.maintenanceList || []);

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

  // Comprehensive Amenity & Facility Maintenance Notices Engine (Excludes complaint tickets)
  const maintenanceNotices = useMemo(() => {
    const notices: Array<{ id: string; title: string; message: string; date: string; variant?: 'warning' | 'danger' | 'info' }> = [];

    // 1. Amenity Maintenance Tasks (Linked from Amenities & Booking Module)
    if (maintenanceList && Array.isArray(maintenanceList) && maintenanceList.length > 0) {
      maintenanceList.forEach((task: any) => {
        const rawStatus = String(task.status || 'scheduled').toLowerCase();
        if (rawStatus !== 'completed' && rawStatus !== 'cancelled') {
          const dateStr = task.startDate
            ? `${task.startDate}${task.startTime ? ` • ${task.startTime} - ${task.endTime || ''}` : ''}`
            : 'Scheduled';

          notices.push({
            id: `maint-task-${task._id || Math.random()}`,
            title: task.title ? `${task.amenityName || 'Facility'} • ${task.title}` : `Scheduled ${task.amenityName || 'Facility'} Maintenance`,
            message: task.description || `Facility upkeep window scheduled for ${task.amenityName || 'community facility'}.`,
            date: dateStr,
            variant: rawStatus === 'in_progress' ? 'warning' : 'info',
          });
        }
      });
    }

    // 2. Active Amenity Maintenance Statuses & Temporary Outages
    if (amenities && Array.isArray(amenities) && amenities.length > 0) {
      amenities.forEach((amenity: any) => {
        const statusRaw = String(amenity.status || amenity.currentStatus || '').toLowerCase();
        if (statusRaw === 'maintenance') {
          const alreadyExists = notices.some((n) => n.title.includes(amenity.name));
          if (!alreadyExists) {
            notices.push({
              id: `amn-maint-${amenity._id}`,
              title: `${amenity.name} Under Maintenance`,
              message: `The ${amenity.name} is currently undergoing scheduled upkeep and temporary blackout.`,
              date: 'Active',
              variant: 'warning',
            });
          }
        }
      });
    }

    // 3. Backend System Facility Notices
    if (dashboardAnalytics?.notices && Array.isArray(dashboardAnalytics.notices)) {
      dashboardAnalytics.notices.forEach((n: any) => {
        notices.push({
          id: `backend-${n.id || Math.random()}`,
          title: n.title || 'Facility Maintenance Notice',
          message: n.message || n.description || 'Scheduled facility maintenance notice.',
          date: n.timestamp ? new Date(n.timestamp).toLocaleDateString() : 'Active Notice',
          variant: 'info',
        });
      });
    }

    return notices;
  }, [maintenanceList, amenities, dashboardAnalytics]);

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
          {/* Master Search Bar */}
          <View className="mb-5">
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tickets, staff, features, or upkeep..."
            />
          </View>

          {/* 3 Executive KPI Cards */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-card p-3 rounded-2xl border border-border shadow-xs">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase">REPORTED</Text>
                <FileText size={14} className="text-blue-500" />
              </View>
              <Text className="text-xl font-black text-foreground mb-0.5">{totalReported}</Text>
              <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Total Tickets</Text>
            </View>

            <View className="flex-1 bg-card p-3 rounded-2xl border border-border shadow-xs">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase" numberOfLines={1}>TODAY NEW</Text>
                <Calendar size={14} className="text-amber-500" />
              </View>
              <Text className="text-xl font-black text-foreground mb-0.5">{kpis.today || 0}</Text>
              <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400" numberOfLines={1}>Submissions</Text>
            </View>

            <View className="flex-1 bg-card p-3 rounded-2xl border border-border shadow-xs">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase">RESOLVED</Text>
                <CheckCircle2 size={14} className="text-emerald-500" />
              </View>
              <Text className="text-xl font-black text-foreground mb-0.5">{totalResolved}</Text>
              <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Completed</Text>
            </View>
          </View>

          {/* Sub-Navigation Feature Shortcuts Hub */}
          <ComplaintQuickNavHub
            searchQuery={searchQuery}
            onFeedbackPress={() => setShowFeedbackSheet(true)}
          />

          {/* Real-Time Maintenance & Ticket Feed Widget */}
          <ComplaintLiveActivityWidget
            complaints={complaints}
            maintenanceNotices={maintenanceNotices}
          />
        </ScrollView>

        {/* General Feedback & Suggestion Sheet */}
        <BottomSheet
          visible={showFeedbackSheet}
          onClose={() => setShowFeedbackSheet(false)}
          title="Community Feedback & Suggestions"
        >
          <View className="px-4 py-2 gap-4">
            <View className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex-row items-center">
              <View className="p-2 bg-rose-500/20 rounded-xl me-3">
                <MessageSquare size={20} color="#f43f5e" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-foreground">Share Your Thoughts</Text>
                <Text className="text-[11px] text-muted-foreground">
                  Send feedback or suggestions directly to facility management.
                </Text>
              </View>
            </View>

            <TextInput
              label="Your Message / Feedback *"
              placeholder="Tell us what we can improve or suggest a new feature..."
              multiline
              numberOfLines={4}
              value={generalFeedback}
              onChangeText={setGeneralFeedback}
            />

            <Button
              variant="default"
              onPress={handleFeedbackSubmit}
              disabled={isSubmittingFeedback}
              className="bg-primary py-3.5 rounded-2xl items-center mb-6"
            >
              <Text className="text-sm font-bold text-white">
                {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </Button>
          </View>
        </BottomSheet>
      </View>
    </ScreenShell>
  );
}

export default ComplaintDashboardScreen;
