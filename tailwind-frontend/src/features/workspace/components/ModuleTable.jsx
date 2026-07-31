import React from 'react';
import { Edit2, Trash2, RotateCcw, Power, PowerOff, LayoutTemplate } from 'lucide-react';
import moment from 'moment';

const ModuleTable = ({ modules, loading, onEdit, onDelete, onRestore, onToggleStatus, onToggleVisibility }) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading modules...
      </div>
    );
  }

  if (!modules?.length) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg m-4 bg-gray-50">
        <LayoutTemplate className="w-12 h-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Modules Found</h3>
        <p className="text-gray-500 max-w-sm">
          Get started by adding a new application module or adjust your search filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase tracking-wider">
            <th className="px-6 py-4">Module Details</th>
            <th className="px-6 py-4">Status & Visibility</th>
            <th className="px-6 py-4">Audit Info</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {modules.map((module) => (
            <tr key={module._id} className="hover:bg-gray-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <i className={`cil-${module.sidebarIcon?.toLowerCase() || 'applications'} text-xl`}></i>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{module.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{module.routePath}</span>
                      <span className="text-xs text-gray-400">Order: {module.displayOrder}</span>
                    </div>
                  </div>
                </div>
              </td>
              
              <td className="px-6 py-4">
                <div className="flex flex-col gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit
                    ${module.isDeleted ? 'bg-red-50 text-red-700 border border-red-200' :
                      module.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 
                      'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      module.isDeleted ? 'bg-red-500' :
                      module.status === 'Active' ? 'bg-green-500' : 'bg-orange-500'
                    }`}></span>
                    {module.isDeleted ? 'Deleted' : module.status}
                  </span>
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>
                    <span className="text-gray-400">Created:</span><br/>
                    {moment(module.createdAt).format('MMM DD, YYYY')} by {module.creator?.name || 'System'}
                  </div>
                  {module.isDeleted && (
                    <div className="text-red-500 mt-2">
                      <span className="text-red-400">Deleted:</span><br/>
                      {moment(module.deletedAt).format('MMM DD, YYYY')} by {module.deleter?.name || 'Unknown'}
                    </div>
                  )}
                </div>
              </td>

              <td className="px-6 py-4 text-right">
                <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!module.isDeleted ? (
                    <>
                      {/* Visible Toggle */}
                      <button
                        onClick={() => onToggleVisibility && onToggleVisibility(module)}
                        title={module.isSidebarVisible ? "Hide from Sidebar" : "Show in Sidebar"}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          module.isSidebarVisible ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            module.isSidebarVisible ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      
                      {/* Edit Button */}
                      <button
                        onClick={() => onEdit(module)}
                        title="Edit Configuration"
                        className="p-1.5 text-white bg-green-500 hover:bg-green-600 rounded-md transition-colors shadow-sm ml-2"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => onDelete(module)}
                        title="Delete Module"
                        className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onRestore(module)}
                      title="Restore Module"
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="text-xs font-medium">Restore</span>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ModuleTable;
