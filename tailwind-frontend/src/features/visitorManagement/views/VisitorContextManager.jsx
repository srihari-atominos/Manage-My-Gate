import React from 'react';
import { useSelector } from 'react-redux';
import ResidentVisitorManagementView from './ResidentVisitorManagementView';
import GuardVisitormanagementViews from './GuardVisitormanagementViews';
import AdminVisitorManagementViews from './AdminVisitorManagementViews';
import { AlertCircle } from 'lucide-react';

export const VisitorContextManager = () => {
  const user = useSelector((state) => state.auth.user);
  const context = user?.visitorContext || 'None';

  switch (context) {
    case 'Resident':
      return <ResidentVisitorManagementView />;
    case 'Guard':
      return <GuardVisitormanagementViews />;
    case 'Admin':
      return <AdminVisitorManagementViews />;
    default:
      return (
        <div className="mx-auto max-w-6xl p-4 sm:p-6 visitor-os-theme">
          <div className="flex gap-4 rounded-xl border border-warning/20 bg-warning/5 p-6 shadow-default dark:border-warning/30 text-black dark:text-white">
            <AlertCircle className="h-6 w-6 text-warning shrink-0" />
            <div>
              <h5 className="font-bold text-warning text-sm mb-1.5">Access Restrained</h5>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Your active organization role is not configured with any Visitor Management context. 
                Please contact your administrator to map this role to a specific Console context view.
              </p>
            </div>
          </div>
        </div>
      );
  }
};

export default VisitorContextManager;
