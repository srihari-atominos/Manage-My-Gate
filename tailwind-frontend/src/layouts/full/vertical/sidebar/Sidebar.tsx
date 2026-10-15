// @ts-nocheck
import React, { useEffect, useMemo } from 'react';
import SimpleBar from 'simplebar-react';
import { Icon } from '@iconify/react';
import FullLogo from '../../shared/logo/FullLogo';
import { Link, useLocation } from 'react-router';
import { useTheme } from 'src/components/provider/theme-provider';
import { AMLogo, AMMenu, AMMenuItem, AMSidebar, AMSubmenu } from 'tailwind-sidebar';
import 'tailwind-sidebar/styles.css';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCurrentWorkspace } from 'src/features/workspace/store/workspaceSlice.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useAuth } from 'src/features/auth/hooks/useAuth.js';

interface SidebarItemType {
  heading?: string
  id?: number | string
  name?: string
  title?: string
  icon?: string
  url?: string
  requiredPermission?: string | string[]
  requirePlatform?: boolean
  children?: SidebarItemType[]
  disabled?: boolean
  isPro?: boolean
}

const renderSidebarItems = (
  items: SidebarItemType[],
  currentPath: string,
  onClose?: () => void,
  isSubItem: boolean = false,
) => {
  return items.map((item) => {
    const isSelected = currentPath === item?.url;
    const IconComp = item.icon || null;

    const iconElement = IconComp ? (
      <Icon icon={IconComp} height={20} width={20} className={isSelected ? 'text-white' : 'text-slate-300'} />
    ) : (
      <Icon icon={'ri:checkbox-blank-circle-line'} height={8} width={8} className={isSelected ? 'text-white' : 'text-slate-400'} />
    );

    // Heading
    if (item.heading) {
      return (
        <div className="mt-5 mb-2 px-1" key={item.heading}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400/90">
            {item.heading}
          </span>
        </div>
      );
    }

    // Submenu
    if (item.children?.length) {
      return (
        <AMSubmenu
          key={item.id}
          icon={iconElement}
          title={item.name}
          ClassName="mt-1 text-slate-200 hover:text-white"
        >
          {renderSidebarItems(item.children, currentPath, onClose, true)}
        </AMSubmenu>
      );
    }

    // Regular menu item
    const linkTarget = item.url?.startsWith('https') ? '_blank' : '_self';

    const itemClassNames = `mt-1.5 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-3 ${
      isSelected
        ? '!bg-gradient-to-r !from-[#FF6B00] !to-[#EA580C] !text-white shadow-lg shadow-[#FF6B00]/30 !font-semibold'
        : '!text-slate-300 hover:!text-white hover:!bg-white/10'
    }`;

    return (
      <div onClick={onClose} key={item.id}>
        <AMMenuItem
          key={item.id}
          icon={iconElement}
          isSelected={isSelected}
          link={item.url || undefined}
          target={linkTarget}
          badge={!!item.isPro}
          badgeColor="bg-[#FF6B00]"
          badgeTextColor="text-white"
          disabled={item.disabled}
          badgeContent={item.isPro ? 'Pro' : undefined}
          component={Link}
          className={`${itemClassNames}`}
        >
          <span className="truncate flex-1">{item.title || item.name}</span>
        </AMMenuItem>
      </div>
    );
  });
};

const SidebarLayout = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const { theme } = useTheme();
  
  const { checkPermission } = useAuth();
  const isPlatform = useSelector((state: any) => state.workspace?.isPlatform || false);

  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: any) => state.auth?.isAuthenticated);
  const currentWorkspaceModules = useSelector((state: any) => state.workspace?.currentWorkspaceModules || []);

  const isPermitted = (item: any) => {
    if (item.requirePlatform && !isPlatform) {
      return false;
    }

    if (isPlatform && (item.url === '/admin/amenities/dashboard')) {
      return false;
    }

    if (!item.requiredPermission) {
      return true;
    }

    if (Array.isArray(item.requiredPermission)) {
      return isPlatform || item.requiredPermission.some((perm: string) => checkPermission(perm));
    }

    return isPlatform || checkPermission(item.requiredPermission);
  };

  useEffect(() => {
    // We fetch the current workspace config ONLY if we are authenticated, not a platform admin, and we haven't loaded them yet.
    // (If the workspace changes, we dispatch fetchCurrentWorkspace elsewhere).
    if (isAuthenticated && !isPlatform && currentWorkspaceModules.length === 0) {
      dispatch(fetchCurrentWorkspace() as any);
    }
  }, [isAuthenticated, isPlatform, currentWorkspaceModules.length, dispatch]);

  const filteredSidebarContent = useMemo(() => {
    const baseNav: any[] = [
      {
        heading: 'Home',
        children: [
          {
            name: 'Dashboard',
            icon: 'solar:widget-2-linear',
            id: 'dashboard-static',
            url: '/dashboard',
          },
        ],
      },
    ];

    if (isPlatform) {
      baseNav.push({
        heading: 'Platform Admin',
        children: [
          {
            name: 'Organization Manager',
            icon: 'solar:city-linear',
            id: 'org-static',
            url: '/super-admin/organizations',
            requirePlatform: true,
          },
          {
            name: 'Audit Logs',
            icon: 'solar:clipboard-list-linear',
            id: 'audit-static',
            url: '/super-admin/audit-logs',
            requirePlatform: true,
          },
          {
            name: 'Manage Workspaces',
            icon: 'solar:box-linear',
            id: 'global-modules-static',
            url: '/super-admin/modules',
            requirePlatform: true,
          }
        ],
      });
    } else {
      const dynamicChildren = currentWorkspaceModules
        .filter((mp: any) => mp.isEnabled && mp.visibleInSidebar && mp.moduleId?.status === 'Active')
        .map((mp: any) => ({
          name: mp.moduleId.displayName || mp.moduleId.name,
          icon: mp.moduleId.sidebarIcon || 'solar:box-linear',
          id: mp.moduleId._id,
          url: mp.moduleId.routePath,
        }));

      if (dynamicChildren.length > 0) {
        baseNav.push({
          heading: 'Workspace Modules',
          children: dynamicChildren,
        });
      }
    }

    // Still map over them to filter out any requirePlatform items if isPlatform is false (though we handle this in construction)
    const filterSection = (section: any) => {
      const filteredChildren = (section.children || []).filter(isPermitted);
      if (filteredChildren.length === 0) {
        return null;
      }
      return { ...section, children: filteredChildren };
    };

    return baseNav.map(filterSection).filter(Boolean);
  }, [currentWorkspaceModules, isPlatform]);

  // Only allow "light" or "dark" for AMSidebar
  const sidebarMode = theme === 'light' || theme === 'dark' ? theme : undefined;

  return (
    <AMSidebar
      collapsible="none"
      animation={true}
      showProfile={false}
      width={'270px'}
      showTrigger={false}
      mode="dark"
      className="fixed left-0 top-0 border-r border-white/10 bg-gradient-to-b from-[#0D1B35] to-[#172B70] z-20 h-screen shadow-2xl"
    >
      {/* Logo */}
      <div className="px-6 py-5 flex items-center justify-between brand-logo border-b border-white/10">
        <AMLogo component={Link} href="/" img="">
          <FullLogo />
        </AMLogo>
      </div>

      {/* Sidebar items */}
      <SimpleBar className="h-[calc(100vh-100px)]">
        <div className="px-6">
          {filteredSidebarContent.map((section: any, index: number) => (
            <div key={index}>
              {renderSidebarItems(
                [
                  ...(section.heading ? [{ heading: section.heading }] : []),
                  ...(section.children || []),
                ],
                pathname,
                onClose,
              )}
            </div>
          ))}
        </div>
      </SimpleBar>

      {/* Bottom Sidebar Card (Reference Image 2) */}
      <div className="p-4 mt-auto">
        <div className="relative rounded-2xl overflow-hidden border border-white/15 p-4 text-white bg-cover bg-center" style={{ backgroundImage: `linear-gradient(180deg, rgba(13, 27, 53, 0.7) 0%, rgba(13, 27, 53, 0.95) 100%), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=400&auto=format&fit=crop')` }}>
          <h5 className="font-bold text-sm tracking-tight leading-snug">Building Connected Communities</h5>
          <div className="w-8 h-1 bg-[#FF6B00] rounded-full mt-2"></div>
        </div>
      </div>
    </AMSidebar>
  );
};

export default SidebarLayout;
