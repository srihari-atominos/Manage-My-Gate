import React from 'react';
import { CNav, CNavItem, CNavLink } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSpeedometer, cilWallet, cilSettings } from '@coreui/icons';

/**
 * BillingTopNav
 *
 * Top navigation bar for the Billing module.
 * Matches the same visual pattern used by VisitorTopNav.
 */
export const BillingTopNav = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard',          name: 'Dashboard',          icon: cilSpeedometer },
    { id: 'action-center',      name: 'Action Center',      icon: cilWallet      },
    { id: 'assessment-manager', name: 'Assessment Manager', icon: cilSettings    },
  ];

  return (
    <div className="billing-top-nav-bar">
      <CNav
        variant="underline"
        style={{
          borderBottom: 'none',
          gap: '16px',
          flexWrap: 'nowrap',
          minWidth: 'max-content',
          paddingBottom: '4px',
        }}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <CNavItem key={item.id}>
              <CNavLink
                href="#"
                active={isActive}
                onClick={(e) => {
                  e.preventDefault();
                  onTabChange(item.id);
                }}
                className={`billing-top-nav-link ${isActive ? 'active' : ''}`}
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

export default BillingTopNav;
