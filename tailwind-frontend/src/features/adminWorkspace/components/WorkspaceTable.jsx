import React from 'react';
import { Edit2, Trash2, RotateCcw, Power, PowerOff, LayoutTemplate, Copy } from 'lucide-react';
import moment from 'moment';

const WorkspaceTable = ({ workspaces, loading, onEdit, onDelete, onRestore, onToggleStatus, onDuplicate }) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading workspaces...
      </div>
    );
  }

  if (!workspaces?.length) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg m-4 bg-gray-50">
        <LayoutTemplate className="w-12 h-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Workspaces Found</h3>
        <p className="text-gray-500 max-w-sm">
          Get started by creating a new Workspace to assign to your Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase tracking-wider">
            <th className="px-6 py-4">Workspace Details</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Assignments</th>
            <th className="px-6 py-4">Audit Info</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {workspaces.map((workspace) => (
            <tr key={workspace._id} className="hover:bg-gray-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <div className="font-semibold text-gray-900">{workspace.name}</div>
                  {workspace.description && (
                    <div className="text-sm text-gray-500 mt-0.5 line-clamp-1">{workspace.description}</div>
                  )}
                </div>
              </td>
              
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit
                  ${workspace.isDeleted ? 'bg-red-50 text-red-700 border border-red-200' :
                    workspace.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 
                    'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    workspace.isDeleted ? 'bg-red-500' :
                    workspace.status === 'Active' ? 'bg-green-500' : 'bg-orange-500'
                  }`}></span>
                  {workspace.isDeleted ? 'Deleted' : workspace.status}
                </span>
              </td>

              <td className="px-6 py-4">
                <div className="flex flex-col gap-1 text-sm text-gray-600">
                  <span className="font-medium">Modules: <span className="text-primary">{workspace.totalModules || 0}</span></span>
                  <span className="font-medium">Admins: <span className="text-blue-600">{workspace.assignedAdminsCount || 0}</span></span>
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>
                    <span className="text-gray-400">Created:</span><br/>
                    {moment(workspace.createdAt).format('MMM DD, YYYY')} by {workspace.createdBy?.name || 'System'}
                  </div>
                  {workspace.isDeleted && (
                    <div className="text-red-500 mt-2">
                      <span className="text-red-400">Deleted:</span><br/>
                      {moment(workspace.deletedAt).format('MMM DD, YYYY')} by {workspace.deletedBy?.name || 'Unknown'}
                    </div>
                  )}
                </div>
              </td>

              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!workspace.isDeleted ? (
                    <>
                      <button
                        onClick={() => onEdit(workspace)}
                        title="Edit Workspace"
                        className="p-1.5 text-white bg-green-500 hover:bg-green-600 rounded-md transition-colors shadow-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(workspace)}
                        title="Delete Workspace"
                        className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onRestore(workspace)}
                      title="Restore Workspace"
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

export default WorkspaceTable;
