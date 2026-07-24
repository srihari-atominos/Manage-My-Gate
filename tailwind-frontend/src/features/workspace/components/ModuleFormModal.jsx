import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X } from 'lucide-react';
import { useWorkspaceModules } from '../hooks/useWorkspaceModules.js';

const schema = yup.object().shape({
  name: yup.string().required('Module Name is required').max(100),
  displayName: yup.string().required('Display Name is required').max(100),
  routePath: yup.string().required('Route Path is required'),
  description: yup.string().max(500),
  sidebarIcon: yup.string(),
  displayOrder: yup.number().typeError('Must be a number').min(0),
  isSidebarVisible: yup.boolean(),
  status: yup.string().oneOf(['Active', 'Inactive']),
});

const ModuleFormModal = ({ isOpen, onClose }) => {
  const { selectedModule, handleCreateModule, handleUpdateModule } = useWorkspaceModules();

  const isEdit = !!selectedModule;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      displayName: '',
      routePath: '',
      description: '',
      sidebarIcon: 'Box',
      displayOrder: 0,
      isSidebarVisible: true,
      status: 'Active',
    },
  });

  useEffect(() => {
    if (isEdit && selectedModule) {
      reset({
        name: selectedModule.name,
        displayName: selectedModule.displayName,
        routePath: selectedModule.routePath,
        description: selectedModule.description || '',
        sidebarIcon: selectedModule.sidebarIcon || '',
        displayOrder: selectedModule.displayOrder || 0,
        isSidebarVisible: selectedModule.isSidebarVisible ?? true,
        status: selectedModule.status || 'Active',
      });
    } else {
      reset();
    }
  }, [isEdit, selectedModule, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await handleUpdateModule(selectedModule._id, data);
      } else {
        await handleCreateModule(data);
      }
      onClose();
    } catch (err) {
      // Error is handled by thunk toast
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Module Configuration' : 'Add New Module'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          <form id="moduleForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Module Name *</label>
                <input
                  {...register('name')}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g. Visitor Management"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              {/* Display Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Sidebar Display Name *</label>
                <input
                  {...register('displayName')}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.displayName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g. Visitors"
                />
                {errors.displayName && <p className="text-xs text-red-500">{errors.displayName.message}</p>}
              </div>

              {/* Route Path */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Route Path *</label>
                <input
                  {...register('routePath')}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.routePath ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g. /visitor-management"
                />
                {errors.routePath && <p className="text-xs text-red-500">{errors.routePath.message}</p>}
              </div>

              {/* Icon */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Sidebar Icon (CoreUI class)</label>
                <input
                  {...register('sidebarIcon')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. user"
                />
              </div>

              {/* Display Order */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Display Order</label>
                <input
                  type="number"
                  {...register('displayOrder')}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.displayOrder ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.displayOrder && <p className="text-xs text-red-500">{errors.displayOrder.message}</p>}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Initial Status</label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                {...register('description')}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Briefly describe the module's purpose..."
              ></textarea>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-2 mt-4 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="isSidebarVisible"
                {...register('isSidebarVisible')}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="isSidebarVisible" className="text-sm font-medium text-gray-700 select-none">
                Visible in Sidebar Navigation
              </label>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 mt-auto">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="moduleForm"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            {isEdit ? 'Save Changes' : 'Register Module'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModuleFormModal;
