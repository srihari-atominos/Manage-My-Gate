import { Building2, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useWorkspaceSwitcher from 'src/features/workspace/hooks/useWorkspaceSwitcher.js';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'src/components/ui/dropdown-menu';

export const WorkspaceSwitcher = () => {
  const { t } = useTranslation();
  const { availableWorkspaces, activeWorkspace, handleSwitchWorkspace } = useWorkspaceSwitcher();

  if (!availableWorkspaces || availableWorkspaces.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          id="workspace-switcher-toggle"
          className="flex items-center gap-2 cursor-pointer py-1.5 px-3 rounded hover:bg-gray-100 dark:hover:bg-meta-4/20 outline-none text-black dark:text-white"
        >
          <Building2 className="h-5 w-5 text-gray-500" />
          <span className="hidden md:inline font-medium text-sm max-w-[160px] truncate">
            {activeWorkspace.name || t('workspace.defaultName', { defaultValue: 'Select Workspace' })}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[200px] bg-white dark:bg-boxdark border border-stroke dark:border-strokedark p-1 shadow-default" align="end">
        {availableWorkspaces.map((ws: any) => (
          <DropdownMenuItem
            key={ws.orgId}
            onClick={() => handleSwitchWorkspace(ws.orgId)}
            id={`workspace-switch-item-${ws.orgId}`}
            className={`flex items-center justify-between py-2 px-3 text-start w-100 cursor-pointer ${
              ws.orgId === activeWorkspace.orgId
                ? 'bg-gray-100 dark:bg-meta-4/40 font-semibold'
                : 'hover:bg-gray-50 dark:hover:bg-meta-4/20'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-black dark:text-white max-w-[180px] truncate">{ws.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{ws.roleName}</span>
            </div>
            {ws.isPlatform && (
              <span className="ml-3 rounded bg-primary py-0.5 px-1.5 text-2xs font-bold text-white uppercase">
                {t('workspace.platformBadge', { defaultValue: 'Platform' })}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WorkspaceSwitcher;
