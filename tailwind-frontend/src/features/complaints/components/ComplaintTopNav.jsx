import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plus, Search, List, Users, Briefcase } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';

const navItems = [
  { name: 'Dashboard', to: '/admin/complaints/dashboard', icon: LayoutDashboard, requiredPermission: 'complaints:dashboard' },
  { name: 'Raise Ticket', to: '/admin/complaints/create', icon: Plus, requiredPermission: 'complaints:raise_ticket' },
  { name: 'Track', to: '/admin/complaints/my-tickets', icon: Search, requiredPermission: 'complaints:track_requests' },
  { name: 'Management', to: '/admin/complaints/manage', icon: List, requiredPermission: 'complaints:complaint_management' },
  { name: 'Staff', to: '/admin/complaints/staff', icon: Users, requiredPermission: 'complaints:staff' },
  { name: 'Assignee', to: '/admin/complaints/assignee', icon: Briefcase, requiredPermission: 'complaints:assignee' },
];

const ComplaintTopNav = () => {
  const location = useLocation();
  const { checkPermission } = useAuth();

  const filteredNavItems = navItems.filter(item => checkPermission(item.requiredPermission));

  return (
    <div className="bg-white dark:bg-boxdark rounded-lg p-3 shadow-default mb-6 overflow-x-auto whitespace-nowrap scrollbar-hidden">
      <nav className="flex items-center gap-4 min-w-max pb-1">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive: linkActive }) =>
                `flex flex-col items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  linkActive || isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default ComplaintTopNav;
