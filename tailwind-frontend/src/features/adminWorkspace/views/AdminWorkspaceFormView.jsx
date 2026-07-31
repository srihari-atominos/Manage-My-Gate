import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminWorkspace } from '../hooks/useAdminWorkspace.js';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2 } from 'lucide-react';

const schema = yup.object().shape({
  name: yup.string().required('Workspace name is required').max(100),
  description: yup.string().max(500),
  status: yup.string().oneOf(['Active', 'Inactive']),
    modulePermissions: yup.array().of(
      yup.object().shape({
        moduleId: yup.string().required('Module selection is required'),
        isEnabled: yup.boolean().default(true),
        visibleInSidebar: yup.boolean().default(true),
        permissions: yup.object().shape({
          canView: yup.boolean(),
          canCreate: yup.boolean(),
          canEdit: yup.boolean(),
          canDelete: yup.boolean(),
          canApprove: yup.boolean(),
          canExport: yup.boolean(),
          canImport: yup.boolean(),
          canManageSettings: yup.boolean(),
        })
      })
    )
});

const PERMISSION_KEYS = [
  { key: 'canView', label: 'View' },
  { key: 'canCreate', label: 'Create' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
  { key: 'canApprove', label: 'Approve' },
  { key: 'canExport', label: 'Export' },
  { key: 'canImport', label: 'Import' },
  { key: 'canManageSettings', label: 'Settings' },
];

const AdminWorkspaceFormView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const {
    loadWorkspaceById,
    handleCreateWorkspace,
    handleUpdateWorkspace,
    globalModules,
    loadGlobalModules,
  } = useAdminWorkspace();

  const [isLoadingData, setIsLoadingData] = useState(isEdit);

  const {
    register,
    handleSubmit,
    control,
    reset,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      status: 'Active',
      modulePermissions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "modulePermissions"
  });

  const watchModulePermissions = watch("modulePermissions");

  // --- Members Section State ---
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'members'
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [memberUserIdInput, setMemberUserIdInput] = useState('');
  
  const {
    handleFetchWorkspaceMembers,
    handleAddWorkspaceMember,
    handleRemoveWorkspaceMember
  } = useAdminWorkspace();

  // Load members if editing
  useEffect(() => {
    if (isEdit && activeTab === 'members') {
      const fetchMembers = async () => {
        setIsMembersLoading(true);
        try {
          const members = await handleFetchWorkspaceMembers(id);
          setWorkspaceMembers(members || []);
        } catch (err) {
          console.error("Failed to fetch members", err);
        } finally {
          setIsMembersLoading(false);
        }
      };
      fetchMembers();
    }
  }, [isEdit, id, activeTab, handleFetchWorkspaceMembers]);

  const onAddMember = async () => {
    if (!memberUserIdInput.trim()) return;
    try {
      await handleAddWorkspaceMember(id, memberUserIdInput.trim());
      const updatedMembers = await handleFetchWorkspaceMembers(id);
      setWorkspaceMembers(updatedMembers || []);
      setMemberUserIdInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const onRemoveMember = async (userId) => {
    if (!window.confirm("Remove this member from the workspace?")) return;
    try {
      await handleRemoveWorkspaceMember(id, userId);
      const updatedMembers = await handleFetchWorkspaceMembers(id);
      setWorkspaceMembers(updatedMembers || []);
    } catch (err) {
      console.error(err);
    }
  };
  // -----------------------------

  useEffect(() => {
    loadGlobalModules();
  }, [loadGlobalModules]);

  useEffect(() => {
    const fetchData = async () => {
      if (isEdit) {
        try {
          const data = await loadWorkspaceById(id);
          reset({
            name: data.name,
            description: data.description || '',
            status: data.status || 'Active',
            modulePermissions: data.modulePermissions.map(mp => ({
              moduleId: mp.moduleId._id,
              isEnabled: mp.isEnabled ?? true,
              visibleInSidebar: mp.visibleInSidebar ?? true,
              permissions: mp.permissions || {}
            })) || [],
          });
        } catch (error) {
          navigate('/super-admin/admin-workspaces');
        } finally {
          setIsLoadingData(false);
        }
      }
    };
    fetchData();
  }, [isEdit, id, loadWorkspaceById, reset, navigate]);

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await handleUpdateWorkspace(id, data);
      } else {
        await handleCreateWorkspace(data);
      }
      navigate('/super-admin/admin-workspaces');
    } catch (err) {
      // Error handled by thunk
    }
  };

  const getAvailableModules = (currentIndex) => {
    // Filter out modules that are already selected in other rows
    const selectedModuleIds = watchModulePermissions.map(mp => mp.moduleId).filter((_, idx) => idx !== currentIndex);
    return globalModules.filter(m => !selectedModuleIds.includes(m._id));
  };

  const selectAllPermissions = (index) => {
    PERMISSION_KEYS.forEach(p => {
      setValue(`modulePermissions.${index}.permissions.${p.key}`, true);
    });
  };

  const deselectAllPermissions = (index) => {
    PERMISSION_KEYS.forEach(p => {
      setValue(`modulePermissions.${index}.permissions.${p.key}`, false);
    });
  };

  if (isLoadingData) {
    return (
      <div className="p-12 flex justify-center items-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/super-admin/admin-workspaces')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Admin Workspace' : 'Create Admin Workspace'}
            </h1>
            <p className="text-gray-500 text-sm">Configure modules and granular permissions for this profile.</p>
          </div>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isEdit ? 'Save Changes' : 'Create Workspace'}
        </button>
      </div>

      {isEdit && (
        <div className="flex border-b border-gray-200 mt-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Assigned Members
          </button>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column - Basic Info */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Workspace Details</h2>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Workspace Name *</label>
              <input
                {...register('name')}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="e.g. Front Office Team"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                {...register('description')}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Briefly describe who should use this workspace..."
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column - Module Permissions */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Module Access & Permissions</h2>
                <p className="text-sm text-gray-500 mt-1">Select application modules and configure action permissions.</p>
              </div>
              <button
                type="button"
                onClick={() => append({ 
                  moduleId: '',
                  isEnabled: true,
                  visibleInSidebar: true, 
                  permissions: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canExport: false, canImport: false, canManageSettings: false }
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors font-medium border border-blue-200"
              >
                <Plus className="w-4 h-4" />
                Add Module
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <CheckCircle2 className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-gray-900 font-medium">No Modules Assigned</h3>
                <p className="text-gray-500 text-sm text-center max-w-sm mt-1">
                  Admins assigned to this workspace won't be able to access any functional modules until you add them.
                </p>
                <button
                  type="button"
                  onClick={() => append({ moduleId: '', isEnabled: true, visibleInSidebar: true, permissions: { canView: true }})}
                  className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Assign First Module
                </button>
              </div>
            ) : (
              <div className="space-y-6 overflow-y-auto pr-2">
                {fields.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative group transition-all hover:border-gray-300 hover:shadow-sm">
                    
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove Module"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col md:flex-row gap-6 mb-4">
                      <div className="w-full md:w-1/2 pr-12">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Application Module</label>
                        <select
                          {...register(`modulePermissions.${index}.moduleId`)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white ${
                            errors?.modulePermissions?.[index]?.moduleId ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">-- Select Module --</option>
                          {/* Include currently selected module in options to prevent it disappearing on edit */}
                          {globalModules.filter(m => 
                            !watchModulePermissions.map(mp => mp.moduleId).filter((_, idx) => idx !== index).includes(m._id)
                          ).map(m => (
                            <option key={m._id} value={m._id}>{m.displayName} ({m.name})</option>
                          ))}
                        </select>
                        {errors?.modulePermissions?.[index]?.moduleId && (
                          <p className="text-xs text-red-500 mt-1">{errors.modulePermissions[index].moduleId.message}</p>
                        )}
                      </div>

                      <div className="w-full md:w-1/2 flex items-center gap-6 mt-4 md:mt-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register(`modulePermissions.${index}.isEnabled`)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700">Enabled</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register(`modulePermissions.${index}.visibleInSidebar`)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700">Visible in Sidebar</span>
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">Granular Permissions</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => selectAllPermissions(index)} className="text-xs text-primary hover:underline">Select All</button>
                          <span className="text-gray-300">|</span>
                          <button type="button" onClick={() => deselectAllPermissions(index)} className="text-xs text-gray-500 hover:underline">Clear All</button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {PERMISSION_KEYS.map((perm) => (
                          <label key={perm.key} className="flex items-center p-2.5 bg-white border border-gray-200 rounded-md cursor-pointer hover:bg-blue-50/50 hover:border-blue-200 transition-colors">
                            <input
                              type="checkbox"
                              {...register(`modulePermissions.${index}.permissions.${perm.key}`)}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                            />
                            <span className="ml-2 text-sm text-gray-700 select-none flex-1">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </div>
        </div>

      </div>
      )}

      {isEdit && activeTab === 'members' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Workspace Members</h2>
              <p className="text-sm text-gray-500 mt-1">Manage which users are assigned to this workspace profile.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Add Member</label>
              <input 
                type="text" 
                value={memberUserIdInput}
                onChange={(e) => setMemberUserIdInput(e.target.value)}
                placeholder="Enter User ID, Email, or Username"
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button 
              onClick={onAddMember}
              disabled={!memberUserIdInput.trim()}
              className="mt-6 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              Add Member
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Members ({workspaceMembers.length})</h3>
            {isMembersLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">Loading members...</div>
            ) : workspaceMembers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 border border-dashed rounded-md">No members assigned to this workspace.</div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {workspaceMembers.map(member => (
                      <tr key={member._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{member.name || member.username}</td>
                        <td className="px-4 py-3 text-gray-500">{member.email}</td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => onRemoveMember(member._id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWorkspaceFormView;
