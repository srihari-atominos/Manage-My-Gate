import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  ShieldCheck
} from 'lucide-react';
import { useAdminWorkspace } from '../hooks/useAdminWorkspace.js';
import WorkspaceTable from '../components/WorkspaceTable.jsx';
import ModuleActionDialog from '../../workspace/components/ModuleActionDialog.jsx';
import { useNavigate } from 'react-router-dom';

const AdminWorkspaceDashboard = () => {
  const {
    workspaces,
    pagination,
    loading,
    filters,
    loadWorkspaces,
    handleDeleteWorkspace,
    handleRestoreWorkspace,
    handleUpdateStatus,
    handleDuplicateWorkspace
  } = useAdminWorkspace();

  const navigate = useNavigate();
  const [actionDialog, setActionDialog] = useState({ isOpen: false, type: null, workspace: null });

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleSearch = (e) => {
    loadWorkspaces({ search: e.target.value, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    loadWorkspaces({ [key]: value, page: 1 });
  };

  const openActionDialog = (type, workspace) => {
    // If it's duplicate, handle it via prompt for now, or you can build a separate modal
    if (type === 'duplicate') {
      const newName = window.prompt(`Enter new name for duplicating "${workspace.name}":`, `${workspace.name} (Copy)`);
      if (newName && newName.trim()) {
        handleDuplicateWorkspace(workspace._id, newName.trim());
      }
      return;
    }
    setActionDialog({ isOpen: true, type, workspace });
  };

  const confirmAction = async () => {
    const { type, workspace } = actionDialog;
    if (type === 'delete') await handleDeleteWorkspace(workspace._id);
    if (type === 'restore') await handleRestoreWorkspace(workspace._id);
    if (type === 'disable') await handleUpdateStatus(workspace._id, 'Inactive');
    if (type === 'enable') await handleUpdateStatus(workspace._id, 'Active');
    setActionDialog({ isOpen: false, type: null, workspace: null });
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Admin Workspaces
          </h1>
          <p className="text-gray-500 mt-1">Manage permission groups and module access for administrators.</p>
        </div>
        <button
          onClick={() => navigate('/super-admin/admin-workspaces/create')}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Workspace
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search workspaces by name..."
            value={filters.search}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto overflow-x-auto">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select
            value={filters.isDeleted}
            onChange={(e) => handleFilterChange('isDeleted', e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="false">Active Workspaces</option>
            <option value="true">Deleted Workspaces</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <WorkspaceTable 
          workspaces={workspaces}
          loading={loading}
          onEdit={(w) => navigate(`/super-admin/admin-workspaces/edit/${w._id}`)}
          onDelete={(w) => openActionDialog('delete', w)}
          onRestore={(w) => openActionDialog('restore', w)}
          onToggleStatus={(w) => openActionDialog(w.status === 'Active' ? 'disable' : 'enable', w)}
          onDuplicate={(w) => openActionDialog('duplicate', w)}
        />
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Showing {(pagination.currentPage - 1) * filters.limit + 1} to {Math.min(pagination.currentPage * filters.limit, pagination.totalRecords)} of {pagination.totalRecords} entries
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.currentPage === 1}
                onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                className="px-3 py-1 border border-gray-200 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={pagination.currentPage === pagination.totalPages}
                onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                className="px-3 py-1 border border-gray-200 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {actionDialog.isOpen && (
        <ModuleActionDialog
          isOpen={actionDialog.isOpen}
          type={actionDialog.type}
          moduleName={actionDialog.workspace?.name}
          onClose={() => setActionDialog({ isOpen: false, type: null, workspace: null })}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
};

export default AdminWorkspaceDashboard;
