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
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  useStaffManagement,
  StaffAttendanceCard,
  StaffMemberAttendanceModal,
  StaffAttendanceFilterSheet,
  StaffMember,
  staffService,
} from '@/src/features/staff';
import {
  ShieldAlert,
  RotateCw,
  CalendarClock,
  FileDown,
  Filter,
  FileSpreadsheet,
} from 'lucide-react-native';
import { downloadCSVFile, downloadExcelFile } from '@/src/utils/downloadHelper';
import * as XLSX from 'xlsx';

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
    if (attendanceStaffFilter !== 'ALL') count++;
    if (attendanceStartDate) count++;
    if (attendanceEndDate) count++;
    return count;
  }, [
    attendanceStatusFilter,
    attendanceGateFilter,
    attendanceDepartmentFilter,
    attendanceStaffFilter,
    attendanceStartDate,
    attendanceEndDate,
  ]);

  const handleResetAttendanceFilters = () => {
    setAttendanceStatusFilter('ALL');
    setAttendanceGateFilter('ALL');
    setAttendanceDepartmentFilter('ALL');
    setAttendanceStaffFilter('ALL');
    setAttendanceStartDate('');
    setAttendanceEndDate('');
  };

  const sanitizeField = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).trim();
    if (/^[=+@\-\t\r]/.test(str)) {
      return `'${str}`;
    }
    return str;
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      const headers = [
        'Community ID',
        'Staff Name',
        'Department',
        'Staff Code',
        'Attendance Date',
        'Status',
        'Check-In Time',
        'Entry Gate',
        'Check-Out Time',
        'Exit Gate',
        'Duration (Mins)',
        'Exception Flag',
        'Notes',
      ];

      let exportDataset = attendanceRecords;
      try {
        const fullQuery: any = { limit: 1000, page: 1 };
        if (attendanceStartDate) fullQuery.startDate = attendanceStartDate;
        if (attendanceEndDate) fullQuery.endDate = attendanceEndDate;
        if (attendanceStatusFilter !== 'ALL' && attendanceStatusFilter !== 'Missing Checkout') {
          fullQuery.status = attendanceStatusFilter;
        }
        if (attendanceGateFilter !== 'ALL') fullQuery.gateId = attendanceGateFilter;
        if (attendanceDepartmentFilter !== 'ALL') fullQuery.department = attendanceDepartmentFilter;
        if (attendanceStaffFilter !== 'ALL') fullQuery.technicianId = attendanceStaffFilter;
        if (attendanceSearch.trim()) fullQuery.search = attendanceSearch.trim();

        const fullRes = await staffService.getAttendanceHistory(fullQuery);
        if (fullRes?.records && fullRes.records.length > 0) {
          exportDataset = fullRes.records;
        }
      } catch {
        exportDataset = attendanceRecords;
      }

      const rows = exportDataset.map((r) => {
        const staffObj = typeof r.technicianId === 'object' && r.technicianId ? (r.technicianId as any) : null;
        const orgStr = sanitizeField(r.orgId || activeOrgId || 'N/A').replace(/"/g, '""');
        const name = sanitizeField(staffObj?.name || r.staffCode || 'Staff Member').replace(/"/g, '""');
        const dept = sanitizeField(staffObj?.department || 'General').replace(/"/g, '""');
        const code = sanitizeField(r.staffCode || staffObj?.staffCode || '').replace(/"/g, '""');
        const attDate = r.checkInTime ? new Date(r.checkInTime).toISOString().split('T')[0] : '';
        const status = r.status || 'Open';
        const inTime = r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '';
        const inGate = sanitizeField(r.checkInGate || 'Main Gate').replace(/"/g, '""');
        const outTime = r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : 'In Progress';
        const outGate = sanitizeField(r.exitGate || (r.status === 'Open' ? 'On-Site' : 'Main Gate')).replace(/"/g, '""');
        const duration = r.durationMinutes !== undefined && r.durationMinutes !== null ? String(r.durationMinutes) : '0';
        const exceptionFlag = r.isMissingCheckout ? 'Missing Checkout' : 'Normal';
        const notes = sanitizeField(r.notes || '').replace(/"/g, '""');

        return `"${orgStr}","${name}","${dept}","${code}","${attDate}","${status}","${inTime}","${inGate}","${outTime}","${outGate}","${duration}","${exceptionFlag}","${notes}"`;
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const timestamp = new Date().toISOString().split('T')[0];
      await downloadCSVFile(csvContent, `Staff_Attendance_Report_${timestamp}.csv`);
      Alert.alert('Export Successful', `Exported ${exportDataset.length} staff attendance record(s) to CSV.`);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export attendance records.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      let exportDataset = attendanceRecords;
      try {
        const fullQuery: any = { limit: 1000, page: 1 };
        if (attendanceStartDate) fullQuery.startDate = attendanceStartDate;
        if (attendanceEndDate) fullQuery.endDate = attendanceEndDate;
        if (attendanceStatusFilter !== 'ALL' && attendanceStatusFilter !== 'Missing Checkout') {
          fullQuery.status = attendanceStatusFilter;
        }
        if (attendanceGateFilter !== 'ALL') fullQuery.gateId = attendanceGateFilter;
        if (attendanceDepartmentFilter !== 'ALL') fullQuery.department = attendanceDepartmentFilter;
        if (attendanceStaffFilter !== 'ALL') fullQuery.technicianId = attendanceStaffFilter;
        if (attendanceSearch.trim()) fullQuery.search = attendanceSearch.trim();

        const fullRes = await staffService.getAttendanceHistory(fullQuery);
        if (fullRes?.records && fullRes.records.length > 0) {
          exportDataset = fullRes.records;
        }
      } catch {
        exportDataset = attendanceRecords;
      }

      const rows = exportDataset.length > 0 ? exportDataset.map((r) => {
        const staffObj = typeof r.technicianId === 'object' && r.technicianId ? (r.technicianId as any) : null;
        return {
          'Community ID': sanitizeField(r.orgId || activeOrgId || 'N/A'),
          'Staff Name': sanitizeField(staffObj?.name || r.staffCode || 'Staff Member'),
          'Department': sanitizeField(staffObj?.department || 'General'),
          'Staff Code': sanitizeField(r.staffCode || staffObj?.staffCode || ''),
          'Attendance Date': r.checkInTime ? new Date(r.checkInTime).toISOString().split('T')[0] : '',
          'Status': r.status || 'Open',
          'Check-In Time': r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '',
          'Entry Gate': sanitizeField(r.checkInGate || 'Main Gate'),
          'Check-Out Time': r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : 'In Progress',
          'Exit Gate': sanitizeField(r.exitGate || (r.status === 'Open' ? 'On-Site' : 'Main Gate')),
          'Duration (Minutes)': r.durationMinutes ?? 0,
          'Exception Flag': r.isMissingCheckout ? 'Missing Checkout' : 'Normal',
          'Notes': sanitizeField(r.notes || ''),
        };
      }) : [
        {
          'Community ID': activeOrgId || 'N/A',
          'Staff Name': 'No records found',
          'Department': '-',
          'Staff Code': '-',
          'Attendance Date': new Date().toISOString().split('T')[0],
          'Status': '-',
          'Check-In Time': '-',
          'Entry Gate': '-',
          'Check-Out Time': '-',
          'Exit Gate': '-',
          'Duration (Minutes)': 0,
          'Exception Flag': '-',
          'Notes': 'Template exported with current active filters.',
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 24 },
        { wch: 20 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 12 },
        { wch: 20 },
        { wch: 16 },
        { wch: 20 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 30 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      const b64Data = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const timestamp = new Date().toISOString().split('T')[0];
      await downloadExcelFile(b64Data, `Staff_Attendance_Report_${timestamp}.xlsx`);
      Alert.alert('Export Successful', `Exported ${exportDataset.length} staff attendance record(s) to Excel.`);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export attendance records.');
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
      headerRight={
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-full"
          onPress={handleRefresh}
          disabled={isAttendanceLoading}
          accessibilityLabel="Refresh attendance"
        >
          <RotateCw size={18} className={`text-foreground ${isAttendanceLoading ? 'animate-spin' : ''}`} />
        </Button>
      }
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
        <Text className="text-xs text-muted-foreground font-medium">
          {attendanceRecords.length} record{attendanceRecords.length === 1 ? '' : 's'} displayed
        </Text>

        <View className="flex-row items-center gap-2">
          {/* CSV Export Button */}
          <TouchableOpacity
            onPress={handleExportCSV}
            disabled={isExporting}
            className="h-9 px-3 rounded-xl border border-border bg-card flex-row items-center justify-center gap-1.5 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Export Attendance CSV"
          >
            <FileDown size={14} className="text-muted-foreground" />
            <Text className="text-xs font-semibold text-foreground">CSV</Text>
          </TouchableOpacity>

          {/* Excel Export Button */}
          <TouchableOpacity
            onPress={handleExportExcel}
            disabled={isExporting}
            className="h-9 px-3 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 flex-row items-center justify-center gap-1.5 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Export Attendance Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
            <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Excel</Text>
          </TouchableOpacity>
        </View>
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
              attendanceStatusFilter !== 'ALL'
                ? `No attendance records match status "${attendanceStatusFilter}".`
                : 'No staff gate attendance records have been registered for this community yet.'
            }
            icon={CalendarClock}
            actionLabel={attendanceStatusFilter !== 'ALL' ? 'Clear Filter' : undefined}
            onAction={attendanceStatusFilter !== 'ALL' ? () => setAttendanceStatusFilter('ALL') : undefined}
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
        startDate={attendanceStartDate}
        endDate={attendanceEndDate}
        onSelectStatus={setAttendanceStatusFilter}
        onSelectDepartment={setAttendanceDepartmentFilter}
        onChangeStartDate={setAttendanceStartDate}
        onChangeEndDate={setAttendanceEndDate}
        onReset={handleResetAttendanceFilters}
        onClose={() => setShowAttendanceFilterSheet(false)}
      />

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
