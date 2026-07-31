import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutDashboard,
  Box
} from 'lucide-react';
import { useWorkspaceModules } from '../hooks/useWorkspaceModules.js';
import ModuleTable from '../components/ModuleTable.jsx';
import ModuleFormModal from '../components/ModuleFormModal.jsx';
import ModuleActionDialog from '../components/ModuleActionDialog.jsx';
import '../styles/_workspaceModules.scss';

const WorkspaceModulesDashboard = () => {
  const {
    modules,
    pagination,
    loading,
    filters,
    loadModules,
    handleDeleteModule,
    handleRestoreModule,
    handleUpdateStatus,
    selectedModule,
    selectModule,
    clearSelection
  } = useWorkspaceModules();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState({ isOpen: false, type: null, module: null });

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const handleSearch = (e) => {
    loadModules({ search: e.target.value, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    loadModules({ [key]: value, page: 1 });
  };

  const handleOpenForm = (module = null) => {
    if (module) selectModule(module);
    else clearSelection();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    clearSelection();
    setIsFormOpen(false);
  };

  const openActionDialog = (type, module) => {
    setActionDialog({ isOpen: true, type, module });
  };

  const confirmAction = async () => {
    const { type, module } = actionDialog;
    if (type === 'delete') await handleDeleteModule(module._id);
    if (type === 'restore') await handleRestoreModule(module._id);
    if (type === 'disable') await handleUpdateStatus(module._id, 'Inactive');
    if (type === 'enable') await handleUpdateStatus(module._id, 'Active');
    setActionDialog({ isOpen: false, type: null, module: null });
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Workspace Modules
          </h1>
          <p className="text-gray-500 mt-1">Manage global application modules and configurations.</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Module
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search modules by name, route..."
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
            value={filters.isSidebarVisible}
            onChange={(e) => handleFilterChange('isSidebarVisible', e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Visibility: All</option>
            <option value="true">Sidebar Visible</option>
            <option value="false">Sidebar Hidden</option>
          </select>

          <select
            value={filters.isDeleted}
            onChange={(e) => handleFilterChange('isDeleted', e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="false">Active Registry</option>
            <option value="true">Deleted Modules</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <ModuleTable 
          modules={modules}
          loading={loading}
          onEdit={handleOpenForm}
          onDelete={(m) => openActionDialog('delete', m)}
          onRestore={(m) => openActionDialog('restore', m)}
          onToggleStatus={(m) => openActionDialog(m.status === 'Active' ? 'disable' : 'enable', m)}
          onToggleVisibility={(m) => handleUpdateModule(m._id, { isSidebarVisible: !m.isSidebarVisible })}
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

      {isFormOpen && (
        <ModuleFormModal 
          isOpen={isFormOpen} 
          onClose={handleCloseForm}
        />
      )}

      {actionDialog.isOpen && (
        <ModuleActionDialog
          isOpen={actionDialog.isOpen}
          type={actionDialog.type}
          moduleName={actionDialog.module?.name}
          onClose={() => setActionDialog({ isOpen: false, type: null, module: null })}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
};

export default WorkspaceModulesDashboard;
