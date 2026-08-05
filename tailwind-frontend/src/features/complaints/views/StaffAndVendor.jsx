import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchStaffVendorsAnalytics } from '../store/complaintSlice'
import ComplaintTopNav from '../components/ComplaintTopNav'
import TechnicianModal from '../components/TechnicianModal'
import { technicianService } from '../services/technician.service'
import { toast } from 'react-hot-toast'
import { Button } from 'src/components/ui/button'
import { Badge } from 'src/components/ui/badge'
import { Input } from 'src/components/ui/input'
import { Plus, Search, Users, UserCheck, Clock, CheckCircle } from 'lucide-react'
import '../styles/_complaints.scss'

const StaffAndVendor = () => {
  const dispatch = useDispatch()
  const { staffVendors, status } = useSelector((state) => state.complaints)

  const [filter, setFilter] = useState('All Departments')
  const [search, setSearch] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTechnician, setSelectedTechnician] = useState(null)

  useEffect(() => {
    dispatch(fetchStaffVendorsAnalytics({}))
  }, [dispatch])

  const technicians = staffVendors?.technicians || []
  const summary = staffVendors?.summary || {}

  const filteredStaff = technicians.filter((s) => {
    if (filter !== 'All Departments' && s.department !== filter) return false
    if (
      search &&
      !s.name.toLowerCase().includes(search.toLowerCase()) &&
      !s.phone.includes(search)
    )
      return false
    return true
  })

  const handleAddNew = () => {
    setSelectedTechnician(null)
    setIsModalOpen(true)
  }

  const handleEdit = (technician) => {
    setSelectedTechnician(technician)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTechnician(null)
    dispatch(fetchStaffVendorsAnalytics({})) // Refresh data after update
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff/vendor?')) return
    try {
      await technicianService.delete(id)
      toast.success('Deleted successfully')
      dispatch(fetchStaffVendorsAnalytics({}))
    } catch (error) {
      toast.error(error?.message || 'Failed to delete')
    }
  }

  const StatCard = ({ icon: Icon, value, label, iconBg, iconColor }) => (
    <div className="rounded-xl border border-stroke bg-white p-5 shadow-default transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-strokedark dark:bg-boxdark flex items-center gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-black dark:text-white">
          {status === 'loading' && !staffVendors ? '...' : value}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-0.5">
          {label}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <ComplaintTopNav />
      <div className="mx-auto max-w-screen-2xl p-4 sm:p-6">
        {/* Title and Add Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white">
              Staff & Vendors Directory
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
              Manage technicians and monitor active workloads
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleAddNew}
            className="text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
          >
            <Plus className="h-4.5 w-4.5" />
            Add New Staff/Vendor
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users} value={summary.activeStaff || 0} label="Active Staff" iconBg="bg-primary/10" iconColor="text-primary" />
          <StatCard icon={UserCheck} value={summary.availableStaff || 0} label="Available Staff" iconBg="bg-success/10" iconColor="text-success" />
          <StatCard icon={Clock} value={summary.busyStaff || 0} label="Busy Staff" iconBg="bg-warning/10" iconColor="text-warning" />
          <StatCard icon={CheckCircle} value={summary.completedToday || 0} label="Jobs Completed Today" iconBg="bg-primary/10" iconColor="text-primary" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:max-w-xs">
            <Input
              type="text"
              placeholder="Search by name, phone or trade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white pr-8 py-1.5"
            />
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
          </div>

          <select
            className="rounded-lg border border-stroke bg-transparent py-2 px-4 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white font-medium"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All Departments" className="bg-white dark:bg-boxdark">All Departments</option>
            <option value="Electrical" className="bg-white dark:bg-boxdark">Electrical</option>
            <option value="Plumbing" className="bg-white dark:bg-boxdark">Plumbing</option>
            <option value="Housekeeping" className="bg-white dark:bg-boxdark">Housekeeping</option>
            <option value="Security" className="bg-white dark:bg-boxdark">Security</option>
            <option value="Carpentry" className="bg-white dark:bg-boxdark">Carpentry</option>
            <option value="Others" className="bg-white dark:bg-boxdark">Others</option>
          </select>
        </div>

        {/* Directory Table */}
        <div className="rounded-xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 dark:bg-meta-4/40 border-b border-stroke dark:border-strokedark">
                <tr>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Name</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Trade / Dept</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Type</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Active Tasks</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Completed Today</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Status</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {status === 'loading' && !staffVendors ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-gray-400 dark:text-gray-500">
                      Loading workloads...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-gray-400 dark:text-gray-500">
                      No staff/vendors found.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-meta-4/10">
                      <td className="py-3 px-5">
                        <div className="font-bold text-black dark:text-white">{s.name}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {s.phone}
                        </div>
                        {s.email && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500">
                            {s.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-5 text-gray-600 dark:text-gray-300">{s.department}</td>
                      <td className="py-3 px-5 text-gray-600 dark:text-gray-300">{s.type}</td>
                      <td className="py-3 px-5">
                        <Badge
                          variant={s.activeComplaintsCount > 0 ? 'lightWarning' : 'lightSuccess'}
                          className="text-[10px] px-2 py-0.5 font-bold"
                        >
                          {s.activeComplaintsCount || 0} Active
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-primary dark:text-primary font-semibold">
                        {s.completedTodayCount || 0} Tasks
                      </td>
                      <td className="py-3 px-5">
                        <Badge
                          variant={s.status === 'Active' ? 'lightSuccess' : 'lightSecondary'}
                          className="text-[10px] px-2 py-0.5 font-bold"
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(s)}
                            className="text-xs font-semibold text-primary hover:bg-primary/10"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(s._id)}
                            className="text-xs font-semibold text-danger hover:bg-danger/10"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <TechnicianModal
        visible={isModalOpen}
        technician={selectedTechnician}
        onClose={handleCloseModal}
      />
    </div>
  )
}

export default StaffAndVendor
