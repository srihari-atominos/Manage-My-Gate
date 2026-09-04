import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

let LegacyFileSystem: any = null;
try {
  LegacyFileSystem = require('expo-file-system/legacy');
} catch (e) {
  try {
    LegacyFileSystem = require('expo-file-system');
  } catch (err) {
    LegacyFileSystem = null;
  }
}

export const exportNoticeReport = async (dashboardStats: any): Promise<void> => {
  try {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Notice Board Summary Report'],
      [],
      ['Metric', 'Count'],
      ['Active Notices', dashboardStats?.kpis?.activeNotices || 0],
      ['Draft Notices', dashboardStats?.kpis?.draftNotices || 0],
      ['Scheduled Notices', dashboardStats?.kpis?.scheduledNotices || 0],
      ['Archived Notices', dashboardStats?.kpis?.archivedNotices || 0],
      ['Expired Notices', dashboardStats?.kpis?.expiredNotices || 0],
      ['Urgent/Critical Notices', dashboardStats?.kpis?.urgentNotices || 0],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Categories Sheet
    const categoriesData = [['Category', 'Notice Count']];
    if (dashboardStats?.categories) {
      Object.entries(dashboardStats.categories).forEach(([category, count]) => {
        categoriesData.push([category, String(count)]);
      });
    }
    const categoriesWs = XLSX.utils.aoa_to_sheet(categoriesData);
    XLSX.utils.book_append_sheet(wb, categoriesWs, 'Categories');

    // Activity Sheet
    if (
      dashboardStats?.recentActivity &&
      Array.isArray(dashboardStats.recentActivity) &&
      dashboardStats.recentActivity.length > 0
    ) {
      const activityData = [
        ['Title', 'Category', 'Priority', 'Status', 'Creator', 'Created At'],
      ];
      dashboardStats.recentActivity.forEach((item: any) => {
        activityData.push([
          item?.title || 'N/A',
          item?.category || 'N/A',
          item?.priority || 'N/A',
          item?.status || 'N/A',
          item?.creatorName || 'N/A',
          item?.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A',
        ]);
      });
      const activityWs = XLSX.utils.aoa_to_sheet(activityData);
      XLSX.utils.book_append_sheet(wb, activityWs, 'Recent Notices');
    }

    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, 'notice_board_report.xlsx');
      return;
    }

    // Generate Base64 string for Excel file
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Define temporary local file path
    const fs = LegacyFileSystem || {};
    const docDir = fs.documentDirectory || fs.cacheDirectory || '';
    const fileUri = docDir + 'notice_board_report.xlsx';

    if (fs.writeAsStringAsync) {
      await fs.writeAsStringAsync(fileUri, wbout, {
        encoding: 'base64',
      });
    }

    // Check if sharing is available
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Notice Board Report',
        UTI: 'com.microsoft.excel.xlsx',
      });
    }
  } catch (error) {
    console.error('Failed to export report:', error);
    throw error;
  }
};
