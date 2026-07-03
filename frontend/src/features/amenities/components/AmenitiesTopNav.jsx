import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CNav, CNavItem, CNavLink } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { 
  cilSpeedometer, 
  cilCalendar, 
  cilList, 
  cilBuilding, 
  cilSettings,
  cilLayers,
  cilWallet,
  cilSearch
} from '@coreui/icons';

const navItems = [
  { name: 'Dashboard', to: '/admin/amenities/dashboard', icon: cilSpeedometer },
  { name: 'Admin Calendar', to: '/admin/amenities/calendar', icon: cilCalendar },
  { name: 'Ledgers', to: '/admin/amenities/ledgers', icon: cilList },
  { name: 'Amenities', to: '/admin/amenities/master', icon: cilLayers },
  { name: 'Maintenance', to: '/admin/amenities/maintenance', icon: cilBuilding },
  { name: 'Settings', to: '/admin/amenities/settings', icon: cilSettings },
  { name: 'Discover', to: '/resident/amenities/discover', icon: cilSearch },
  { name: 'My Bookings', to: '/resident/amenities/calendar', icon: cilCalendar },
  { name: 'Wallet', to: '/resident/amenities/wallet', icon: cilWallet },
  { name: 'History', to: '/resident/amenities/history', icon: cilList },
  { name: 'Scanner', to: '/admin/amenities/scanner', icon: cilSpeedometer },
  { name: 'Security Logs', to: '/admin/amenities/security-logs', icon: cilList },
];

const AmenitiesTopNav = () => {
  const location = useLocation();

  return (
    <div style={{ marginBottom: '24px', backgroundColor: '#fff', borderRadius: '8px', padding: '12px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <CNav variant="underline" style={{ borderBottom: 'none', gap: '16px', flexWrap: 'nowrap', minWidth: 'max-content', paddingBottom: '4px' }}>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <CNavItem key={item.name}>
              <CNavLink 
                to={item.to} 
                as={NavLink}
                active={isActive}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '8px',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? '600' : '500',
                  padding: '8px 16px',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CIcon icon={item.icon} size="lg" style={{ marginBottom: '4px' }} />
                {item.name}
              </CNavLink>
            </CNavItem>
          );
        })}
      </CNav>
    </div>
  );
};

export default AmenitiesTopNav;
