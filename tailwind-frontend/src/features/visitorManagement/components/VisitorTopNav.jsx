import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  QrCode,
  ShieldAlert,
  List,
  LayoutDashboard,
  Users,
  Settings
} from 'lucide-react';

export const VisitorTopNav = ({ activeTab, onTabChange }) => {
  const location = useLocation();
  const path = location.pathname;
  const user = useSelector((state) => state.auth.user);
  const context = user?.visitorContext || 'None';

  console.log('[VisitorTopNav] context:', context, 'user:', user);

  let navItems = [];

  // Determine top navigation options based on context view state
  if (context === 'Resident') {
    navItems = [
      { name: 'Create Pass', to: '#', id: 'create', icon: QrCode },
      { name: 'Walk-in Approval', to: '#', id: 'walkin', icon: ShieldAlert }
    ];
  } else if (context === 'Admin') {
    navItems = [
      { name: 'Dashboard Overview', to: '#', id: 'overview', icon: LayoutDashboard },
      { name: 'Create Pass', to: '#', id: 'create', icon: QrCode },
      { name: 'Walk-in Approval', to: '#', id: 'walkin', icon: ShieldAlert },
      { name: 'Visitor Logs', to: '#', id: 'logs', icon: List },
      { name: 'Blacklist Settings', to: '#', id: 'blacklist', icon: Settings }
    ];
  } else if (context === 'Guard') {
    navItems = [
      { name: 'Invite visitor', to: '#', id: 'invite', icon: Users },
      { name: 'scaner', to: '#', id: 'scanner', icon: QrCode },
      { name: 'Live entries', to: '#', id: 'live', icon: List },
      { name: 'villa Directory', to: '#', id: 'directory', icon: Users }
    ];
  }

  if (navItems.length === 0) return null;

  return (
    <div className="bg-white dark:bg-boxdark rounded-lg p-3 shadow-default mb-6 overflow-x-auto whitespace-nowrap scrollbar-hidden">
      <nav className="flex items-center gap-4 min-w-max pb-1">
        {navItems.map((item) => {
          const isActive = activeTab ? (activeTab === item.id) : (item.to !== '#' && path.startsWith(item.to));
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={(e) => {
                if (onTabChange) {
                  e.preventDefault();
                  if (!item.disabled) {
                    onTabChange(item.id);
                  }
                }
              }}
              className={`flex flex-col items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default VisitorTopNav;
