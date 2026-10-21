import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';
import { isFeatureAllowedForUser } from '@/src/utils/rbac';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useStaffManagement } from '../hooks/useStaffManagement';
import { StaffAttendanceCard } from '../components/StaffAttendanceCard';
import { StaffMemberAttendanceModal } from '../components/StaffMemberAttendanceModal';
import { StaffAttendanceFilterSheet } from '../components/StaffAttendanceFilterSheet';
import { StaffMember, staffService } from '../services/staffService';
import {
  ShieldAlert,
  CalendarClock,
  FileDown,
  Filter,
  FileSpreadsheet,
  FileText,
} from 'lucide-react-native';
import { downloadCSVFile, downloadExcelFile, downloadPDFFile } from '@/src/utils/downloadHelper';

export const StaffAttendanceScreen: React.FC = () => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const canAccess = useMemo(() => {
    return isFeatureAllowedForUser(
      { id: 'admin_staff_attendance', permission: 'staff:attendance', categoryKey: 'staff_management' },
      user
    );
  }, [user]);

  const {
    activeOrgId,
    staffList,
    attendanceStats,
    attendanceRecords,
    rawAttendanceCount,
    isAttendanceLoading,
    attendanceError,
    attendanceStatusFilter,
    setAttendanceStatusFilter,
    attendanceGateFilter,
    setAttendanceGateFilter,
    attendanceDepartmentFilter,
    setAttendanceDepartmentFilter,
    attendanceRoleFilter,
    setAttendanceRoleFilter,
    attendanceDepartmentOptions,
    attendanceRoleOptions,
    attendanceStaffFilter,
    setAttendanceStaffFilter,
    attendanceStartDate,
    setAttendanceStartDate,
    attendanceEndDate,
    setAttendanceEndDate,
    attendanceSearch,
    setAttendanceSearch,
    loadAttendance,
  } = useStaffManagement();

  // Load attendance logs on mount
  useEffect(() => {
    loadAttendance();
  }, []);

  const [showAttendanceFilterSheet, setShowAttendanceFilterSheet] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [attendanceReportMember, setAttendanceReportMember] = useState<{
    member: StaffMember | { name: string; department?: string; _id: string };
    records: any[];
  } | null>(null);

  // Active filter count for Attendance logs
  const activeAttendanceFilterCount = useMemo(() => {
    let count = 0;
    if (attendanceStatusFilter !== 'ALL') count++;
    if (attendanceGateFilter !== 'ALL') count++;
    if (attendanceDepartmentFilter !== 'ALL') count++;
    if (attendanceRoleFilter !== 'ALL') count++;
    if (attendanceStaffFilter !== 'ALL') count++;
    if (attendanceStartDate) count++;
    if (attendanceEndDate) count++;
    return count;
  }, [
    attendanceStatusFilter,
    attendanceGateFilter,
    attendanceDepartmentFilter,
    attendanceRoleFilter,
    attendanceStaffFilter,
    attendanceStartDate,
    attendanceEndDate,
  ]);

  const handleResetAttendanceFilters = () => {
    setAttendanceStatusFilter('ALL');
    setAttendanceGateFilter('ALL');
    setAttendanceDepartmentFilter('ALL');
    setAttendanceRoleFilter('ALL');
    setAttendanceStaffFilter('ALL');
    setAttendanceStartDate('');
    setAttendanceEndDate('');
    loadAttendance({
      status: 'ALL',
      department: 'ALL',
      staffCategory: 'ALL',
      startDate: '',
      endDate: '',
      search: attendanceSearch,
    });
  };

  const handleApplyAttendanceFilters = () => {
    loadAttendance({
      status: attendanceStatusFilter,
      department: attendanceDepartmentFilter,
      staffCategory: attendanceRoleFilter,
      startDate: attendanceStartDate,
      endDate: attendanceEndDate,
      search: attendanceSearch,
    });
  };

  // The server builds the file (readable dates/times, hours worked, absent days, summary sheets) from
  // the same filters shown on this screen, so the export always matches what the guard/admin sees.
  const buildExportQuery = () => {
    const query: Record<string, string> = {};
    if (attendanceStatusFilter !== 'ALL') query.status = attendanceStatusFilter;
    if (attendanceGateFilter !== 'ALL') query.gateId = attendanceGateFilter;
    if (attendanceDepartmentFilter !== 'ALL') {
      if (attendanceDepartmentFilter.startsWith('trade:')) query.departmentOther = attendanceDepartmentFilter.slice(6);
      else query.department = attendanceDepartmentFilter;
    }
    if (attendanceRoleFilter !== 'ALL') {
      if (attendanceRoleFilter.startsWith('role:')) query.roleId = attendanceRoleFilter.slice(5);
      else query.staffCategory = attendanceRoleFilter;
    }
    if (attendanceStaffFilter !== 'ALL') query.technicianId = attendanceStaffFilter;
    if (attendanceStartDate) query.startDate = attendanceStartDate;
    if (attendanceEndDate) query.endDate = attendanceEndDate;
    if (attendanceSearch.trim()) query.search = attendanceSearch.trim();
    return query;
  };

  const exportFileName = (ext: 'csv' | 'xlsx' | 'pdf') => {
    const today = new Date().toISOString().split('T')[0];
    const period =
      attendanceStartDate && attendanceEndDate && attendanceStartDate !== attendanceEndDate
        ? `${attendanceStartDate}_to_${attendanceEndDate}`
        : attendanceStartDate || today;
    return `staff_attendance_${period}.${ext}`;
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const blob = await staffService.exportAttendanceReport(buildExportQuery(), 'csv');
      const text = typeof (blob as any)?.text === 'function' ? await blob.text() : String(blob || '');
      // Blob.text() drops the UTF-8 BOM; put it back so Excel shows non-English names correctly.
      await downloadCSVFile(text.startsWith('\uFEFF') ? text : `\uFEFF${text}`, exportFileName('csv'));
    } catch (err: any) {
      Alert.alert('Export Failed', err?.response?.data?.message || err?.message || 'Could not export attendance records.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const blob = await staffService.exportAttendanceReport(buildExportQuery(), 'pdf');
      await downloadPDFFile(blob, exportFileName('pdf'));
      Alert.alert('Export Successful', 'Attendance PDF downloaded successfully.');
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export attendance PDF.');
    } finally {
      setIsExporting(false);
    }
  };
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await staffService.exportAttendanceReport(buildExportQuery(), 'xlsx');
      await downloadExcelFile(blob, exportFileName('xlsx'));
    } catch (err: any) {
      Alert.alert('Export Failed', err?.response?.data?.message || err?.message || 'Could not export attendance records.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    loadAttendance();
  };

  // RBAC Guard
  if (!canAccess) {
    return (
      <ScreenShell title="Staff Attendance" subtitle="Staff Management">
        <View className="flex-1 items-center justify-center p-6">
          <EmptyState
            title="Access Restricted"
            description="You do not have the required staff:attendance permissions to view attendance logs."
            icon={ShieldAlert}
            actionLabel="Return"
            onAction={() => router.back()}
          />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Staff Attendance"
      subtitle="Gate Attendance & Reports"
    >
      {/* Attendance Summary Metrics */}
      <View className="flex-row gap-2 px-4 py-2">
        <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
          <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
            Total
          </Text>
          <Text className="text-sm font-bold text-foreground mt-0.5" numberOfLines={1}>
            {attendanceStats?.totalSessions ?? 0}
          </Text>
        </View>
        <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
          <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
            On-Site
          </Text>
          <Text className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5" numberOfLines={1}>
            {attendanceStats?.openSessions ?? 0}
          </Text>
        </View>
        <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
          <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
            Completed
          </Text>
          <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5" numberOfLines={1}>
            {attendanceStats?.closedSessions ?? 0}
          </Text>
        </View>
        <View
          className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center min-w-0 ${
            (attendanceStats?.missingCheckoutSessions ?? 0) > 0
              ? 'bg-destructive/10 border-destructive/30'
              : 'bg-card border-border'
          }`}
        >
          <Text
            className={`text-[11px] font-medium text-center ${
              (attendanceStats?.missingCheckoutSessions ?? 0) > 0
                ? 'text-destructive font-semibold'
                : 'text-muted-foreground'
            }`}
            numberOfLines={1}
          >
            Exceptions
          </Text>
          <Text
            className={`text-sm font-bold mt-0.5 ${
              (attendanceStats?.missingCheckoutSessions ?? 0) > 0
                ? 'text-destructive'
                : 'text-foreground'
            }`}
          >
            {attendanceStats?.missingCheckoutSessions ?? 0}
          </Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <SearchFilterBar
        searchValue={attendanceSearch}
        onSearchChange={setAttendanceSearch}
        searchPlaceholder="Search logs by staff name or code..."
        onFilterPress={() => setShowAttendanceFilterSheet(true)}
        activeFilterCount={activeAttendanceFilterCount}
      />

      {/* Export Toolbar & Quick Actions */}
      <View className="flex-row items-center justify-between px-4 mb-2">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs text-muted-foreground font-medium">
            {attendanceRecords.length} record{attendanceRecords.length === 1 ? '' : 's'} displayed
          </Text>
          {activeAttendanceFilterCount > 0 ? (
            <View className="px-2 py-0.5 rounded-full bg-primary/10">
              <Text className="text-[10px] font-bold text-primary">
                {activeAttendanceFilterCount} filter{activeAttendanceFilterCount === 1 ? '' : 's'} active
              </Text>
            </View>
          ) : null}
        </View>

        {/* Single Export Button with CSV & Excel Options */}
        <TouchableOpacity
          onPress={() => setShowExportSheet(true)}
          disabled={isExporting}
          className="h-9 px-3 rounded-xl border border-border bg-card flex-row items-center justify-center gap-1.5 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Export Attendance Records"
        >
          <FileDown size={15} className="text-primary" />
          <Text className="text-xs font-semibold text-foreground">Export</Text>
        </TouchableOpacity>
      </View>

      {/* Main Attendance Record List */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pt-1 gap-3 pb-24"
        refreshControl={
          <RefreshControl
            refreshing={isAttendanceLoading}
            onRefresh={handleRefresh}
            tintColor="#2563EB"
            colors={['#2563EB']}
          />
        }
      >
        {/* Error Banner */}
        {attendanceError ? (
          <View className="mb-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex-row items-center justify-between">
            <Text className="text-xs text-destructive font-medium flex-1 mr-2">{attendanceError}</Text>
          </View>
        ) : null}

        {/* Loading Skeletons */}
        {isAttendanceLoading && attendanceRecords.length === 0 ? (
          <SkeletonLoader count={4} />
        ) : attendanceRecords.length === 0 ? (
          <EmptyState
            title="No Attendance Records"
            description={
              activeAttendanceFilterCount > 0
                ? 'No attendance records match your active filter criteria.'
                : 'No staff gate attendance records have been registered for this community yet.'
            }
            icon={CalendarClock}
            actionLabel={activeAttendanceFilterCount > 0 ? 'Clear All Filters' : undefined}
            onAction={activeAttendanceFilterCount > 0 ? handleResetAttendanceFilters : undefined}
          />
        ) : (
          attendanceRecords.map((record) => {
            const staffObj = typeof record.technicianId === 'object' && record.technicianId ? record.technicianId : null;
            const sName = staffObj?.name || record.staffCode || 'Staff Member';
            const sDept = staffObj?.department || 'General';
            const sId = staffObj?._id || String(record.technicianId);

            return (
              <TouchableOpacity
                key={record._id}
                onPress={() => {
                  const memberRecords = attendanceRecords.filter((r) => {
                    const targetId = typeof r.technicianId === 'object' && r.technicianId ? r.technicianId._id : String(r.technicianId);
                    return targetId === sId;
                  });
                  setAttendanceReportMember({
                    member: { _id: sId, name: sName, department: sDept },
                    records: memberRecords,
                  });
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`View full attendance dossier for ${sName}`}
              >
                <StaffAttendanceCard record={record} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Filter Sheet & Dossier Modal */}
      <StaffAttendanceFilterSheet
        visible={showAttendanceFilterSheet}
        selectedStatus={attendanceStatusFilter}
        selectedDepartment={attendanceDepartmentFilter}
        selectedRole={attendanceRoleFilter}
        departmentOptions={attendanceDepartmentOptions}
        roleOptions={attendanceRoleOptions}
        startDate={attendanceStartDate}
        endDate={attendanceEndDate}
        onSelectStatus={setAttendanceStatusFilter}
        onSelectDepartment={setAttendanceDepartmentFilter}
        onSelectRole={setAttendanceRoleFilter}
        onChangeStartDate={setAttendanceStartDate}
        onChangeEndDate={setAttendanceEndDate}
        onApplyFilters={handleApplyAttendanceFilters}
        onReset={handleResetAttendanceFilters}
        onClose={() => setShowAttendanceFilterSheet(false)}
      />

      {/* Export Options Sheet */}
      <BottomSheet
        visible={showExportSheet}
        onClose={() => setShowExportSheet(false)}
        title="Export Attendance Records"
      >
        <View className="p-4 gap-3">
          <Text className="text-xs text-muted-foreground mb-1">
            Choose your preferred format to download the filtered staff gate attendance records:
          </Text>

          {/* CSV Option Card */}
          <TouchableOpacity
            onPress={() => {
              setShowExportSheet(false);
              handleExportCSV();
            }}
            disabled={isExporting}
            className="p-3.5 rounded-2xl border border-border bg-card flex-row items-center gap-3 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Download CSV report"
          >
            <View className="h-10 w-10 rounded-xl bg-primary/10 items-center justify-center">
              <FileDown size={20} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">CSV Spreadsheet (.csv)</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Comma-separated file suitable for imports, text editors, and data pipelines.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Excel Option Card */}
          <TouchableOpacity
            onPress={() => {
              setShowExportSheet(false);
              handleExportExcel();
            }}
            disabled={isExporting}
            className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 flex-row items-center gap-3 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Download Excel workbook"
          >
            <View className="h-10 w-10 rounded-xl bg-emerald-500/10 items-center justify-center">
              <FileSpreadsheet size={20} className="text-emerald-600 dark:text-emerald-400" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">Microsoft Excel (.xlsx)</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Formatted workbook with styled columns for Excel, Numbers, and Google Sheets.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setShowExportSheet(false); handleExportPDF(); }}
            disabled={isExporting}
            className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 flex-row items-center gap-3 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Download PDF report"
          >
            <View className="h-10 w-10 rounded-xl bg-rose-500/10 items-center justify-center"><FileText size={20} className="text-rose-600 dark:text-rose-400" /></View>
            <View className="flex-1"><Text className="text-sm font-bold text-foreground">PDF Document (.pdf)</Text><Text className="text-xs text-muted-foreground mt-0.5">Printable attendance report using the selected filters.</Text></View>
          </TouchableOpacity>
          <Button
            variant="outline"
            className="mt-2 w-full"
            onPress={() => setShowExportSheet(false)}
          >
            Cancel
          </Button>
        </View>
      </BottomSheet>

      <StaffMemberAttendanceModal
        visible={Boolean(attendanceReportMember)}
        onClose={() => setAttendanceReportMember(null)}
        staffName={attendanceReportMember?.member?.name || 'Staff Member'}
        department={attendanceReportMember?.member?.department}
        records={attendanceReportMember?.records || []}
      />
    </ScreenShell>
  );
};

export default StaffAttendanceScreen;




