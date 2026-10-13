import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CFormInput,
  CFormSelect,
  CBadge,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPeople,
  cilCloudDownload,
  cilReload,
  cilFilter,
  cilCheckCircle,
  cilClock,
  cilWarning,
} from '@coreui/icons'
import ComplaintTopNav from '../components/ComplaintTopNav'
import { staffAttendanceService } from '../services/staffAttendance.service'
import { technicianService } from '../services/technician.service'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import '../styles/_complaints.scss'

const DEPARTMENTS = [
  'Electrical',
  'Plumbing',
  'Housekeeping',
  'Security',
  'Carpentry',
  'Others',
]

const GATES = ['Main Gate', 'North Gate', 'South Gate', 'Service Gate']

export const StaffAttendanceView = () => {
  const [records, setRecords] = useState([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    openSessions: 0,
    closedSessions: 0,
    missingCheckoutExceptions: 0,
    distinctStaffCount: 0,
  })
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [technicians, setTechnicians] = useState([])

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [gateFilter, setGateFilter] = useState('ALL')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [staffFilter, setStaffFilter] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ totalRecords: 0, totalPages: 1 })

  // Detail Modal
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Fetch Technicians for dropdown
  useEffect(() => {
    technicianService.getAll().then((res) => {
      const list = res?.data?.data || res?.data || []
      if (Array.isArray(list)) setTechnicians(list)
    }).catch(() => {})
  }, [])

  // Fetch Attendance Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const query = { page, limit: 20 }
      if (statusFilter !== 'ALL' && statusFilter !== 'Missing Checkout') query.status = statusFilter
      if (gateFilter !== 'ALL') query.gateId = gateFilter
      if (departmentFilter !== 'ALL') query.department = departmentFilter
      if (staffFilter !== 'ALL') query.technicianId = staffFilter
      if (startDate) query.startDate = startDate
      if (endDate) query.endDate = endDate
      if (search.trim()) query.search = search.trim()

      const [historyRes, statsRes] = await Promise.all([
        staffAttendanceService.getHistory(query),
        staffAttendanceService.getStats(query),
      ])

      const fetchedRecords = historyRes?.records || []
      setRecords(fetchedRecords)
      if (historyRes?.pagination) {
        setPagination(historyRes.pagination)
      }
      if (statsRes) {
        setStats({
          totalSessions: statsRes.totalSessions || 0,
          openSessions: statsRes.openSessions || 0,
          closedSessions: statsRes.closedSessions || 0,
          missingCheckoutExceptions: statsRes.missingCheckoutExceptions || 0,
          distinctStaffCount: statsRes.distinctStaffCount || 0,
        })
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load attendance records')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, gateFilter, departmentFilter, staffFilter, startDate, endDate, search])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Presets
  const handleApplyPreset = (preset) => {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    if (preset === 'today') {
      const today = toYMD(now)
      setStartDate(today)
      setEndDate(today)
    } else if (preset === 'week') {
      const day = now.getDay()
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(now.setDate(diffToMonday))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      setStartDate(toYMD(monday))
      setEndDate(toYMD(sunday))
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setStartDate(toYMD(firstDay))
      setEndDate(toYMD(lastDay))
    } else {
      setStartDate('')
      setEndDate('')
    }
    setPage(1)
  }

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setGateFilter('ALL')
    setDepartmentFilter('ALL')
    setStaffFilter('ALL')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  // Formula injection sanitizer
  const sanitizeField = (val) => {
    if (val === null || val === undefined) return ''
    const str = String(val).trim()
    if (/^[=+@\-\t\r]/.test(str)) {
      return `'${str}`
    }
    return str
  }

  // Export handlers
  const getFullExportDataset = async () => {
    const fullQuery = { limit: 1000, page: 1 }
    if (statusFilter !== 'ALL' && statusFilter !== 'Missing Checkout') fullQuery.status = statusFilter
    if (gateFilter !== 'ALL') fullQuery.gateId = gateFilter
    if (departmentFilter !== 'ALL') fullQuery.department = departmentFilter
    if (staffFilter !== 'ALL') fullQuery.technicianId = staffFilter
    if (startDate) fullQuery.startDate = startDate
    if (endDate) fullQuery.endDate = endDate
    if (search.trim()) fullQuery.search = search.trim()

    const res = await staffAttendanceService.getHistory(fullQuery)
    return res?.records?.length > 0 ? res.records : records
  }

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      const dataset = await getFullExportDataset()
      if (dataset.length === 0) {
        toast.error('No attendance records to export under current filters')
        return
      }

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
      ]

      const rows = dataset.map((r) => {
        const staffObj = r.technician || (typeof r.technicianId === 'object' ? r.technicianId : null)
        const orgId = sanitizeField(r.orgId || '').replace(/"/g, '""')
        const name = sanitizeField(staffObj?.name || r.staffCode || 'Staff Member').replace(/"/g, '""')
        const dept = sanitizeField(staffObj?.department || 'General').replace(/"/g, '""')
        const code = sanitizeField(r.staffCode || staffObj?.staffCode || '').replace(/"/g, '""')
        const attDate = r.checkInTime ? new Date(r.checkInTime).toISOString().split('T')[0] : ''
        const status = r.status || 'Open'
        const inTime = r.checkInTime ? new Date(r.checkInTime).toLocaleString() : ''
        const inGate = sanitizeField(r.checkInGate || 'Main Gate').replace(/"/g, '""')
        const outTime = r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : 'In Progress'
        const outGate = sanitizeField(r.exitGate || (r.status === 'Open' ? 'On-Site' : 'Main Gate')).replace(/"/g, '""')
        const duration = r.durationMinutes !== undefined && r.durationMinutes !== null ? String(r.durationMinutes) : '0'
        const exception = r.isMissingCheckout ? 'Missing Checkout' : 'Normal'
        const notes = sanitizeField(r.notes || '').replace(/"/g, '""')

        return `"${orgId}","${name}","${dept}","${code}","${attDate}","${status}","${inTime}","${inGate}","${outTime}","${outGate}","${duration}","${exception}","${notes}"`
      })

      const csvContent = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const timestamp = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `Staff_Attendance_Report_${timestamp}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${dataset.length} attendance records to CSV`)
    } catch (err) {
      toast.error('Failed to export CSV: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setExporting(true)
      const dataset = await getFullExportDataset()
      if (dataset.length === 0) {
        toast.error('No attendance records to export under current filters')
        return
      }

      const rows = dataset.map((r) => {
        const staffObj = r.technician || (typeof r.technicianId === 'object' ? r.technicianId : null)
        return {
          'Community ID': sanitizeField(r.orgId || ''),
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
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(rows)
      worksheet['!cols'] = [
        { wch: 24 },
        { wch: 20 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 12 },
        { wch: 22 },
        { wch: 14 },
        { wch: 22 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 24 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Logs')
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const timestamp = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `Staff_Attendance_Report_${timestamp}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${dataset.length} attendance records to Excel (.xlsx)`)
    } catch (err) {
      toast.error('Failed to export Excel: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleOpenDetail = (record) => {
    setSelectedRecord(record)
    setDetailModalOpen(true)
  }

  return (
    <div className="complaints-module-wrapper complaints-os-theme">
      <ComplaintTopNav />
      <div className="view-container">
        <div className="view active" id="staff-attendance">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h2 className="fs-2 m-0">Staff Gate Attendance & Reports</h2>
              <p className="text-muted m-0 fw-medium">
                Monitor real-time security gate check-in/out records, exceptions, and analytics
              </p>
            </div>
            <div className="d-flex gap-2">
              <CButton
                color="secondary"
                variant="outline"
                onClick={handleExportCSV}
                disabled={exporting || records.length === 0}
              >
                <CIcon icon={cilCloudDownload} className="me-1" /> Export CSV
              </CButton>
              <CButton
                color="success"
                variant="outline"
                onClick={handleExportExcel}
                disabled={exporting || records.length === 0}
              >
                <CIcon icon={cilCloudDownload} className="me-1" /> Export Excel
              </CButton>
              <CButton color="primary" onClick={loadData} disabled={loading}>
                <CIcon icon={cilReload} className={`me-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </CButton>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <CRow className="g-3 mb-4">
            <CCol xs={12} sm={6} md={3}>
              <CCard className="h-100 border-0 shadow-sm bg-body">
                <CCardBody className="p-3">
                  <div className="text-muted text-uppercase fw-semibold fs-7 mb-1">Total Sessions</div>
                  <div className="fs-3 fw-bold text-body">{stats.totalSessions}</div>
                  <div className="fs-8 text-muted mt-1">{stats.distinctStaffCount} distinct staff members</div>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={12} sm={6} md={3}>
              <CCard className="h-100 border-0 shadow-sm bg-body">
                <CCardBody className="p-3">
                  <div className="text-muted text-uppercase fw-semibold fs-7 mb-1">Currently On-Site</div>
                  <div className="fs-3 fw-bold text-warning">{stats.openSessions}</div>
                  <div className="fs-8 text-muted mt-1">Active in community</div>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={12} sm={6} md={3}>
              <CCard className="h-100 border-0 shadow-sm bg-body">
                <CCardBody className="p-3">
                  <div className="text-muted text-uppercase fw-semibold fs-7 mb-1">Completed Shifts</div>
                  <div className="fs-3 fw-bold text-success">{stats.closedSessions}</div>
                  <div className="fs-8 text-muted mt-1">Exited via gate scan</div>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={12} sm={6} md={3}>
              <CCard
                className={`h-100 border-0 shadow-sm ${
                  stats.missingCheckoutExceptions > 0 ? 'bg-danger-subtle text-danger' : 'bg-body'
                }`}
              >
                <CCardBody className="p-3">
                  <div className="text-uppercase fw-semibold fs-7 mb-1">Missing Checkouts</div>
                  <div className="fs-3 fw-bold text-danger">{stats.missingCheckoutExceptions}</div>
                  <div className="fs-8 mt-1 text-muted">Open sessions &gt; 12 hours</div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {/* Filters Bar */}
          <CCard className="border-0 shadow-sm mb-4">
            <CCardHeader className="bg-transparent border-0 py-3">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <CIcon icon={cilFilter} className="text-primary" />
                  <span className="fw-bold">Advanced Filters</span>
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <span className="fs-7 text-muted me-2">Presets:</span>
                  <CButton size="sm" variant="ghost" onClick={() => handleApplyPreset('today')}>
                    Today
                  </CButton>
                  <CButton size="sm" variant="ghost" onClick={() => handleApplyPreset('week')}>
                    This Week
                  </CButton>
                  <CButton size="sm" variant="ghost" onClick={() => handleApplyPreset('month')}>
                    This Month
                  </CButton>
                  <CButton size="sm" color="secondary" variant="outline" onClick={handleResetFilters}>
                    Clear Filters
                  </CButton>
                </div>
              </div>
            </CCardHeader>
            <CCardBody className="pt-0">
              <CRow className="g-3">
                <CCol xs={12} md={3}>
                  <label className="form-label fs-7 fw-semibold text-muted">Search Personnel</label>
                  <CFormInput
                    placeholder="Name, staff code, gate..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </CCol>
                <CCol xs={12} sm={6} md={2}>
                  <label className="form-label fs-7 fw-semibold text-muted">Status</label>
                  <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">All Statuses</option>
                    <option value="Open">Currently On-Site</option>
                    <option value="Closed">Completed</option>
                  </CFormSelect>
                </CCol>
                <CCol xs={12} sm={6} md={2}>
                  <label className="form-label fs-7 fw-semibold text-muted">Department</label>
                  <CFormSelect
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <option value="ALL">All Departments</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} sm={6} md={2}>
                  <label className="form-label fs-7 fw-semibold text-muted">Gate</label>
                  <CFormSelect value={gateFilter} onChange={(e) => setGateFilter(e.target.value)}>
                    <option value="ALL">All Gates</option>
                    {GATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} sm={6} md={3}>
                  <label className="form-label fs-7 fw-semibold text-muted">Specific Staff Member</label>
                  <CFormSelect value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
                    <option value="ALL">All Staff Members</option>
                    {technicians.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} {t.staffCode ? `(${t.staffCode})` : ''} - {t.department}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} sm={6} md={3}>
                  <label className="form-label fs-7 fw-semibold text-muted">From Date</label>
                  <CFormInput
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </CCol>
                <CCol xs={12} sm={6} md={3}>
                  <label className="form-label fs-7 fw-semibold text-muted">To Date</label>
                  <CFormInput
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          {/* Table View */}
          <CCard className="border-0 shadow-sm">
            <CCardBody className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                  <div className="mt-2 text-muted fs-7">Loading attendance sessions...</div>
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-5">
                  <CIcon icon={cilClock} size="xxl" className="text-muted mb-2" />
                  <h5 className="text-body fw-bold">No Attendance Records Found</h5>
                  <p className="text-muted fs-7">No gate attendance records matched the active filter criteria.</p>
                  <CButton color="primary" variant="outline" size="sm" onClick={handleResetFilters}>
                    Reset Filter Criteria
                  </CButton>
                </div>
              ) : (
                <div className="table-responsive">
                  <CTable hover align="middle" className="mb-0">
                    <CTableHead color="light">
                      <CTableRow>
                        <CTableHeaderCell>Staff Member</CTableHeaderCell>
                        <CTableHeaderCell>Department / Trade</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                        <CTableHeaderCell>Check-In</CTableHeaderCell>
                        <CTableHeaderCell>Check-Out</CTableHeaderCell>
                        <CTableHeaderCell>Duration</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {records.map((r) => {
                        const staffObj =
                          r.technician || (typeof r.technicianId === 'object' ? r.technicianId : null)
                        const isOpen = r.status === 'Open'
                        const isExc = Boolean(r.isMissingCheckout)

                        return (
                          <CTableRow key={r._id} style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(r)}>
                            <CTableDataCell>
                              <div className="fw-bold text-body">
                                {staffObj?.name || r.staffCode || 'Staff Member'}
                              </div>
                              <div className="fs-8 text-muted">{r.staffCode || staffObj?.staffCode || 'N/A'}</div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color="info" className="text-capitalize">
                                {staffObj?.department || 'General'}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="fs-7">
                                {r.checkInTime ? new Date(r.checkInTime).toLocaleDateString() : 'N/A'}
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="fw-semibold fs-7">
                                {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </div>
                              <div className="fs-8 text-muted">{r.checkInGate || 'Main Gate'}</div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="fw-semibold fs-7">
                                {isOpen
                                  ? 'In Progress'
                                  : r.checkOutTime
                                  ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : '--:--'}
                              </div>
                              <div className="fs-8 text-muted">{isOpen ? 'On-Site' : r.exitGate || 'Main Gate'}</div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="fw-bold fs-7">
                                {r.durationMinutes !== null && r.durationMinutes !== undefined
                                  ? `${Math.floor(r.durationMinutes / 60)}h ${r.durationMinutes % 60}m`
                                  : isOpen
                                  ? 'Active'
                                  : '0m'}
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              {isExc ? (
                                <CBadge color="danger">Missing Checkout</CBadge>
                              ) : isOpen ? (
                                <CBadge color="warning">On-Site</CBadge>
                              ) : (
                                <CBadge color="success">Completed</CBadge>
                              )}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CButton
                                size="sm"
                                color="primary"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenDetail(r)
                                }}
                              >
                                View Dossier
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                </div>
              )}
            </CCardBody>
          </CCard>
        </div>
      </div>

      {/* Record Detail Modal */}
      <CModal visible={detailModalOpen} onClose={() => setDetailModalOpen(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Attendance Session Details</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedRecord && (
            <div className="p-2">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h4 className="m-0">
                    {selectedRecord.technician?.name || selectedRecord.staffCode || 'Staff Member'}
                  </h4>
                  <div className="text-muted fs-7">
                    {selectedRecord.technician?.department || 'General'} • Code:{' '}
                    {selectedRecord.staffCode || selectedRecord.technician?.staffCode || 'N/A'}
                  </div>
                </div>
                <div>
                  {selectedRecord.isMissingCheckout ? (
                    <CBadge color="danger">Missing Checkout Exception</CBadge>
                  ) : selectedRecord.status === 'Open' ? (
                    <CBadge color="warning">Currently On-Site</CBadge>
                  ) : (
                    <CBadge color="success">Completed Session</CBadge>
                  )}
                </div>
              </div>

              <CRow className="g-3 pt-2 border-top">
                <CCol xs={6}>
                  <div className="fs-8 text-muted text-uppercase">Check-In Time</div>
                  <div className="fw-bold fs-6">
                    {selectedRecord.checkInTime ? new Date(selectedRecord.checkInTime).toLocaleString() : 'N/A'}
                  </div>
                  <div className="fs-7 text-muted">Gate: {selectedRecord.checkInGate || 'Main Gate'}</div>
                </CCol>
                <CCol xs={6}>
                  <div className="fs-8 text-muted text-uppercase">Check-Out Time</div>
                  <div className="fw-bold fs-6">
                    {selectedRecord.status === 'Open'
                      ? 'In Progress (Active)'
                      : selectedRecord.checkOutTime
                      ? new Date(selectedRecord.checkOutTime).toLocaleString()
                      : 'N/A'}
                  </div>
                  <div className="fs-7 text-muted">
                    Gate: {selectedRecord.status === 'Open' ? 'On-Site' : selectedRecord.exitGate || 'Main Gate'}
                  </div>
                </CCol>
                <CCol xs={6}>
                  <div className="fs-8 text-muted text-uppercase">Duration</div>
                  <div className="fw-bold fs-6">
                    {selectedRecord.durationMinutes !== null && selectedRecord.durationMinutes !== undefined
                      ? `${selectedRecord.durationMinutes} minutes (${(selectedRecord.durationMinutes / 60).toFixed(1)} hrs)`
                      : selectedRecord.status === 'Open'
                      ? 'Currently In Progress'
                      : '0 minutes'}
                  </div>
                </CCol>
                <CCol xs={6}>
                  <div className="fs-8 text-muted text-uppercase">Audit Notes</div>
                  <div className="fs-7 text-body">{selectedRecord.notes || 'None logged.'}</div>
                </CCol>
              </CRow>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDetailModalOpen(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default StaffAttendanceView
