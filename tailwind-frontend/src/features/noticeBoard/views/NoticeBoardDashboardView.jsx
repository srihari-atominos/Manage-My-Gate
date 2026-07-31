import React, { useEffect } from 'react'
import useNoticeBoard from '../hooks/useNoticeBoard.js'
import useNoticeSocket from '../hooks/useNoticeSocket.js'
import NoticeBoardTopNav from '../components/NoticeBoardTopNav.jsx'
import * as XLSX from 'xlsx'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { saveAs } from 'file-saver'
import {
  ListChecks,
  CheckCircle2,
  PencilRuler,
  Clock,
  Ban,
  Pin,
  AlertTriangle,
  Download,
  Info,
  TrendingUp
} from 'lucide-react'
import PageHeader from 'src/components/common/PageHeader'
import { Button } from 'src/components/ui/button'
import '../styles/_noticeBoard.scss'

const NoticeBoardDashboardView = () => {
  useNoticeSocket()
  const { dashboardStats, dashboardLoading, dashboardError, loadNoticeStats } = useNoticeBoard()

  useEffect(() => {
    loadNoticeStats()
  }, [loadNoticeStats])

  const handleExport = () => {
    const wb = XLSX.utils.book_new()

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
    ]
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

    // Categories Sheet
    const categoriesData = [
      ['Category', 'Notice Count'],
      ['General', dashboardStats?.categories?.General || 0],
      ['Maintenance', dashboardStats?.categories?.Maintenance || 0],
      ['Events', dashboardStats?.categories?.Events || 0],
      ['Emergency', dashboardStats?.categories?.Emergency || 0],
      ['Meetings', dashboardStats?.categories?.Meetings || 0],
    ]
    const categoriesWs = XLSX.utils.aoa_to_sheet(categoriesData)
    XLSX.utils.book_append_sheet(wb, categoriesWs, 'Categories')

    // Activity Sheet
    if (dashboardStats?.recentActivity && dashboardStats.recentActivity.length > 0) {
      const activityData = [['Title', 'Category', 'Priority', 'Status', 'Creator', 'Created At']]
      dashboardStats.recentActivity.forEach((item) => {
        activityData.push([
          item.title || 'N/A',
          item.category || 'N/A',
          item.priority || 'N/A',
          item.status || 'N/A',
          item.creatorName || 'N/A',
          item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A',
        ])
      })
      const activityWs = XLSX.utils.aoa_to_sheet(activityData)
      XLSX.utils.book_append_sheet(wb, activityWs, 'Recent Notices')
    }

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, 'notice_board_report.xlsx')
  }

  const totalCount = dashboardStats?.kpis?.totalNotices || 0
  const activeCount = dashboardStats?.kpis?.activeNotices || 0
  const urgentCount = dashboardStats?.kpis?.urgentNotices || 0
  const draftCount = dashboardStats?.kpis?.draftNotices || 0
  const expiredCount = dashboardStats?.kpis?.expiredNotices || 0
  const scheduledCount = dashboardStats?.kpis?.scheduledNotices || 0
  const pinnedCount = dashboardStats?.kpis?.pinnedNotices || 0

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 notice-board-module-wrapper">
      <PageHeader
        title="Notice Board Admin"
        subtitle="Manage Announcements, Alerts, Events, and review overview activity KPIs."
      />

      <NoticeBoardTopNav />

      {dashboardError && (
        <div className="p-4 mb-4 rounded-lg bg-red-50/10 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold">
          {dashboardError}
        </div>
      )}

      {dashboardLoading && !dashboardStats ? (
        <div className="flex justify-center items-center py-20">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header section */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-black dark:text-white">
                Management Overview
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-semibold">
                Real-time metrics and notice board overview.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              className="text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </Button>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col justify-between hover:shadow-md transition-all duration-200">
              <div className="text-gray-500 dark:text-gray-400 text-2xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ListChecks className="h-4.5 w-4.5 text-primary shrink-0" />
                <span>Total Notices</span>
              </div>
              <div className="text-3xl font-extrabold text-black dark:text-white mt-4">{totalCount}</div>
              <div className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit mt-3">All statuses</div>
            </div>

            <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col justify-between hover:shadow-md transition-all duration-200">
              <div className="text-gray-500 dark:text-gray-400 text-2xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-success shrink-0" />
                <span>Active Notices</span>
              </div>
              <div className="text-3xl font-extrabold text-black dark:text-white mt-4">{activeCount}</div>
              <div className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full w-fit mt-3">Published</div>
            </div>

            <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col justify-between hover:shadow-md transition-all duration-200">
              <div className="text-gray-500 dark:text-gray-400 text-2xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <PencilRuler className="h-4.5 w-4.5 text-warning shrink-0" />
                <span>Drafts</span>
              </div>
              <div className="text-3xl font-extrabold text-black dark:text-white mt-4">{draftCount}</div>
              <div className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full w-fit mt-3">Unpublished</div>
            </div>

            <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col justify-between hover:shadow-md transition-all duration-200">
              <div className="text-gray-500 dark:text-gray-400 text-2xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                <span>Scheduled</span>
              </div>
              <div className="text-3xl font-extrabold text-black dark:text-white mt-4">{scheduledCount}</div>
              <div className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full w-fit mt-3">To be published</div>
            </div>

            <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col justify-between hover:shadow-md transition-all duration-200">
              <div className="text-gray-500 dark:text-gray-400 text-2xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Ban className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                <span>Expired Notices</span>
              </div>
              <div className="text-3xl font-extrabold text-black dark:text-white mt-4">{expiredCount}</div>
              <div className="text-[10px] font-bold text-gray-400 bg-slate-100 dark:bg-meta-4 px-2 py-0.5 rounded-full w-fit mt-3">Past Due</div>
            </div>

            <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col justify-between hover:shadow-md transition-all duration-200">
              <div className="text-gray-500 dark:text-gray-400 text-2xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Pin className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                <span>Pinned</span>
              </div>
              <div className="text-3xl font-extrabold text-black dark:text-white mt-4">{pinnedCount}</div>
              <div className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full w-fit mt-3">Featured</div>
            </div>

            <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col justify-between hover:shadow-md transition-all duration-200 sm:col-span-2">
              <div className="text-gray-500 dark:text-gray-400 text-2xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5 text-danger shrink-0" />
                <span>Urgent & Critical Notices</span>
              </div>
              <div className="text-3xl font-extrabold text-black dark:text-white mt-4">{urgentCount}</div>
              <div className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full w-fit mt-3">Priority High+</div>
            </div>
          </div>

          {/* Charts & Activity Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col">
              <h4 className="font-bold text-sm text-black dark:text-white mb-6 flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-primary shrink-0" />
                <span>Notices by Category</span>
              </h4>
              <div className="h-48 flex items-end gap-3 border-b border-l border-stroke dark:border-strokedark pb-1.5 pl-1.5">
                {Object.entries(dashboardStats?.categories || {}).map(([category, count]) => {
                  const counts = Object.values(dashboardStats?.categories || {})
                  const maxCount = Math.max(...counts, 1)
                  const heightPercent = `${Math.min(100, Math.max(10, (count / maxCount) * 100))}%`

                  return (
                    <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer" key={category}>
                      <div className="w-full bg-slate-100 dark:bg-meta-4 group-hover:bg-primary/20 rounded-t h-36 flex items-end">
                        <div
                          className="w-full bg-primary rounded-t transition-all group-hover:bg-primary-hover"
                          style={{ height: heightPercent }}
                          title={`${count} notices`}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold truncate max-w-full">
                        {category}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Activity Logs */}
            <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-sm text-black dark:text-white">
                    Live Activity Log
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-success/15 border border-success/30 px-2 py-0.5 rounded-full text-success font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" />
                    <span>LIVE</span>
                  </span>
                </div>

                <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
                  {dashboardStats?.recentActivity && dashboardStats.recentActivity.length > 0 ? (
                    dashboardStats.recentActivity.map((activity, index) => (
                      <div className="flex justify-between items-center p-3 border border-stroke dark:border-strokedark rounded-lg bg-slate-50 dark:bg-meta-4/10 hover:bg-slate-100 transition-colors" key={activity.id || index}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {activity.category === 'Emergency' ? (
                              <AlertTriangle className="h-4.5 w-4.5 text-danger" />
                            ) : (
                              <Info className="h-4.5 w-4.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-black dark:text-white truncate">
                              {activity.title}
                            </h5>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-normal font-semibold">
                              {activity.category} &bull; {activity.priority} Priority &bull; {activity.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap pl-2">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 dark:text-gray-500 text-xs text-center py-6 font-semibold">
                      No recent activity
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NoticeBoardDashboardView
