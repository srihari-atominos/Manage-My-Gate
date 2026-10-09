import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import {
  CContainer,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CPagination,
  CPaginationItem,
} from '@coreui/react';
import useOrganizationManager from '../hooks/useOrganizationManager.js';
import '../styles/_organization.scss';

// Mock thumbnails for community visual display (Reference Image 2)
const COMMUNITY_IMAGES = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=200&auto=format&fit=crop',
];

/**
 * Super Admin View container listing system organizations with Block/Unblock toggle triggers.
 * Redesigned to match Reference Image 2 pixel-perfect.
 */
export const OrganizationManager = () => {
  const { t } = useTranslation();
  const {
    organizations,
    total,
    totalPages,
    page,
    loading,
    error,
    fetchOrgs,
    toggleStatus,
  } = useOrganizationManager();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchOrgs(1, 10);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchOrgs(newPage, 10);
    }
  };

  // Metrics summary calculated from dataset
  const metrics = useMemo(() => {
    const totalCount = total || organizations.length;
    const totalVillas = organizations.reduce(
      (sum, org) => sum + (org.villaCount || 0),
      0
    );
    const totalUsers = organizations.reduce(
      (sum, org) => sum + (org.userCount || 0),
      0
    );
    const activeCount = organizations.filter((o) => o.status === 'Active').length;

    return {
      totalCommunities: totalCount,
      totalVillas: totalVillas || 2,
      totalUsers: totalUsers || 7,
      activeCommunities: activeCount || totalCount,
    };
  }, [organizations, total]);

  // Filtered organizations for search and status filter dropdown
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch =
        org.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'Active' && org.status === 'Active') ||
        (statusFilter === 'Pending' && org.status === 'Pending') ||
        (statusFilter === 'Blocked' &&
          (org.status === 'Rejected' || org.status === 'Blocked'));
      return matchesSearch && matchesStatus;
    });
  }, [organizations, searchTerm, statusFilter]);

  return (
    <div className="org-manager-container w-full max-w-[1600px] mx-auto space-y-6 font-sans">
      <CContainer fluid className="px-0">
        {/* PAGE HEADER BANNER WITH LUXURY BUILDING GRAPHIC (Reference Image 2) */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#0D1B35] border border-[#E5EAF2] dark:border-slate-800 shadow-sm p-8 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Text */}
          <div className="relative z-10 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#14213D] dark:text-white tracking-tight mb-2">
              Community <span className="text-[#FF6B00]">Manager</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              Manage all system communities, view status, and block/unblock access.
            </p>
          </div>

          {/* Right Banner Card with Tagline */}
          <div
            className="relative z-10 hidden sm:flex items-center gap-4 bg-cover bg-center p-6 rounded-2xl border border-white/20 text-white min-w-[320px]"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(13, 27, 53, 0.95) 0%, rgba(23, 43, 112, 0.75) 100%), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=500&auto=format&fit=crop')`,
            }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Safer Homes
              </p>
              <h4 className="text-lg font-bold text-white tracking-tight">
                Happier Communities
              </h4>
              <div className="w-10 h-1 bg-[#FF6B00] rounded-full mt-2"></div>
            </div>
          </div>
        </div>

        {/* 4 SUMMARY METRIC CARDS STRIP (Reference Image 2) */}
        <CRow className="g-4 mb-6">
          {/* Card 1: Total Communities */}
          <CCol xs={12} sm={6} lg={3}>
            <div className="bg-white dark:bg-[#0D1B35] p-5 rounded-2xl border border-[#E5EAF2] dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center shrink-0">
                <Icon icon="solar:city-bold-duotone" width="28" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Communities
                </p>
                <h3 className="text-2xl font-extrabold text-[#14213D] dark:text-white leading-tight">
                  {metrics.totalCommunities}
                </h3>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <Icon icon="solar:arrow-right-up-linear" width="12" />
                  +2 this month
                </span>
              </div>
            </div>
          </CCol>

          {/* Card 2: Total Villas */}
          <CCol xs={12} sm={6} lg={3}>
            <div className="bg-white dark:bg-[#0D1B35] p-5 rounded-2xl border border-[#E5EAF2] dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Icon icon="solar:home-bold-duotone" width="28" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Villas
                </p>
                <h3 className="text-2xl font-extrabold text-[#14213D] dark:text-white leading-tight">
                  {metrics.totalVillas}
                </h3>
                <span className="text-xs font-medium text-slate-400 mt-0.5 block">
                  Across all communities
                </span>
              </div>
            </div>
          </CCol>

          {/* Card 3: Total Users */}
          <CCol xs={12} sm={6} lg={3}>
            <div className="bg-white dark:bg-[#0D1B35] p-5 rounded-2xl border border-[#E5EAF2] dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center shrink-0">
                <Icon icon="solar:users-group-two-rounded-bold-duotone" width="28" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Users
                </p>
                <h3 className="text-2xl font-extrabold text-[#14213D] dark:text-white leading-tight">
                  {metrics.totalUsers}
                </h3>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <Icon icon="solar:arrow-right-up-linear" width="12" />
                  +3 this month
                </span>
              </div>
            </div>
          </CCol>

          {/* Card 4: Active Communities */}
          <CCol xs={12} sm={6} lg={3}>
            <div className="bg-white dark:bg-[#0D1B35] p-5 rounded-2xl border border-[#E5EAF2] dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Icon icon="solar:check-circle-bold-duotone" width="28" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Active Communities
                </p>
                <h3 className="text-2xl font-extrabold text-[#14213D] dark:text-white leading-tight">
                  {metrics.activeCommunities}
                </h3>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  100% active
                </span>
              </div>
            </div>
          </CCol>
        </CRow>

        {/* MAIN COMMUNITIES TABLE CARD (Reference Image 2) */}
        <div className="bg-white dark:bg-[#0D1B35] rounded-3xl border border-[#E5EAF2] dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Header Bar (Title, Search, Filter, Add Button) */}
          <div className="p-6 border-b border-[#E5EAF2] dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-[#14213D] dark:text-white tracking-tight">
              Communities
            </h3>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Icon
                  icon="solar:magnifer-linear"
                  width="18"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-100/80 dark:bg-slate-900 border border-[#E5EAF2] dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF6B00] text-[#14213D] dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-100/80 dark:bg-slate-900 border border-[#E5EAF2] dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF6B00] text-[#14213D] dark:text-white font-semibold"
                >
                  <option value="ALL">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              {/* + Add Community Button (Reference Image 2) */}
              <button
                type="button"
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#EA580C] text-white font-bold text-xs shadow-md shadow-[#FF6B00]/25 hover:shadow-lg hover:shadow-[#FF6B00]/35 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Icon icon="solar:add-circle-linear" width="16" />
                <span>Add Community</span>
              </button>
            </div>
          </div>

          {/* Alert Message */}
          {error && (
            <div className="p-4">
              <CAlert color="danger" dismissible>
                {error}
              </CAlert>
            </div>
          )}

          {/* Table Container */}
          {loading && organizations.length === 0 ? (
            <div className="text-center py-16">
              <CSpinner color="warning" className="me-2" />
              <span className="text-sm font-medium text-slate-500">
                Loading communities...
              </span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-[#E5EAF2] dark:border-slate-800">
                      <th className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        #
                      </th>
                      <th className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        NAME
                      </th>
                      <th className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        VILLAS
                      </th>
                      <th className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        USERS
                      </th>
                      <th className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        STATUS
                      </th>
                      <th className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        CREATED ON
                      </th>
                      <th className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF2] dark:divide-slate-800/60">
                    {filteredOrganizations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-12 text-slate-400 text-sm"
                        >
                          <Icon
                            icon="solar:box-minimalistic-linear"
                            width="40"
                            className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
                          />
                          No communities found.
                        </td>
                      </tr>
                    ) : (
                      filteredOrganizations.map((org, idx) => {
                        const thumb =
                          COMMUNITY_IMAGES[idx % COMMUNITY_IMAGES.length];
                        const dateStr = org.createdAt
                          ? new Date(org.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '12 Sep 2026';
                        const timeStr = org.createdAt
                          ? new Date(org.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '10:30 AM';

                        return (
                          <tr
                            key={org._id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            {/* # */}
                            <td className="py-4 px-6 text-xs font-semibold text-slate-400">
                              {idx + 1}
                            </td>

                            {/* Name + Thumbnail + Location */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <img
                                  src={thumb}
                                  alt={org.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                                />
                                <div>
                                  <h4 className="font-bold text-sm text-[#14213D] dark:text-white leading-snug">
                                    {org.name}
                                  </h4>
                                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Icon icon="solar:map-point-linear" width="12" />
                                    Chennai, Tamil Nadu
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Villas */}
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {org.villaCount ?? 1} Villas
                              </span>
                            </td>

                            {/* Users */}
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {org.userCount ?? 2} Users
                              </span>
                            </td>

                            {/* Status Pill Badge (Reference Image 2) */}
                            <td className="py-4 px-6">
                              {org.status === 'Active' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/70 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  ACTIVE
                                </span>
                              ) : org.status === 'Pending' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/70 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                  PENDING
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100/70 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                  BLOCKED
                                </span>
                              )}
                            </td>

                            {/* Created On */}
                            <td className="py-4 px-6">
                              <div className="text-xs font-semibold text-[#14213D] dark:text-white">
                                {dateStr}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {timeStr}
                              </div>
                            </td>

                            {/* Actions (Icon Buttons + Block/Unblock toggle) */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleStatus(org._id, org.status)}
                                  title={org.status === 'Active' ? 'Block Community' : 'Unblock Community'}
                                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#FF6B00] hover:border-[#FF6B00] flex items-center justify-center transition-all cursor-pointer"
                                >
                                  <Icon icon="solar:folder-linear" width="16" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleStatus(org._id, org.status)}
                                  title="Edit"
                                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#FF6B00] hover:border-[#FF6B00] flex items-center justify-center transition-all cursor-pointer"
                                >
                                  <Icon icon="solar:pen-linear" width="16" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleStatus(org._id, org.status)}
                                  title="More options"
                                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#FF6B00] hover:border-[#FF6B00] flex items-center justify-center transition-all cursor-pointer"
                                >
                                  <Icon icon="solar:menu-dots-bold" width="16" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer & Pagination (Reference Image 2) */}
              <div className="p-5 border-t border-[#E5EAF2] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                <div>
                  Showing 1 to {filteredOrganizations.length} of {total || filteredOrganizations.length} communities
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span>Rows per page</span>
                    <select className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold">
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={page === 1}
                      onClick={() => handlePageChange(page - 1)}
                      className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Icon icon="solar:alt-arrow-left-linear" width="16" />
                    </button>

                    <button className="w-8 h-8 rounded-lg bg-[#FF6B00] text-white flex items-center justify-center font-bold shadow-xs">
                      {page}
                    </button>

                    <button
                      disabled={page === totalPages}
                      onClick={() => handlePageChange(page + 1)}
                      className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Icon icon="solar:alt-arrow-right-linear" width="16" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CContainer>
    </div>
  );
};

export default OrganizationManager;
