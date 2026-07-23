import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog';
import { Label } from 'src/components/ui/label';
import { Input } from 'src/components/ui/input';
import { Textarea } from 'src/components/ui/textarea';
import { Checkbox } from 'src/components/ui/checkbox';
import { Button } from 'src/components/ui/button';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useRoles from '../hooks/useRoles';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useRoleForm from '../hooks/useRoleForm';
import RoleIntegrationConfigurator from './RoleIntegrationConfigurator';
import PermissionMatrix from './PermissionMatrix';
import '../styles/_roleBuilder.scss';

const RoleFormModal = ({ visible, role, onClose, onSave }) => {
  const { permissionsList, isPermissionsLoading, loadPermissions } = useRoles();
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);

  const {
    register,
    handleSubmit,
    errors,
    selectedPermissions,
    integrationMappings,
    activeMappingsCount,
    setValue,
    handleSelectAllGroup,
    handleTogglePermission
  } = useRoleForm({ role, visible, onSave });

  // Load available permissions when modal opens
  useEffect(() => {
    if (visible) {
      loadPermissions();
    }
  }, [visible, loadPermissions]);

  const handleClose = () => {
    setIsConfiguratorOpen(false);
    onClose();
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {role ? `Edit Role - ${role.name}` : 'Create New Role'}
          </DialogTitle>
        </DialogHeader>
        
        <form id="role-form" onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="role-name-input" className="text-sm font-semibold">
              Role Name
            </Label>
            <Input
              id="role-name-input"
              type="text"
              placeholder="e.g., Branch Manager"
              {...register('name')}
              className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1" id="role-name-error">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="role-desc-input" className="text-sm font-semibold">
              Description
            </Label>
            <Textarea
              id="role-desc-input"
              placeholder="Enter role description..."
              rows={3}
              {...register('description')}
              className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1" id="role-desc-error">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="role-is-tenant-input"
              checked={register('isTenantRole').value}
              onCheckedChange={(checked) => setValue('isTenantRole', !!checked, { shouldDirty: true })}
              className="checkbox mt-0.5"
              {...register('isTenantRole')}
            />
            <div>
              <Label htmlFor="role-is-tenant-input" className="text-sm font-semibold text-black dark:text-white cursor-pointer">
                Is Tenant/Unit Role (Belongs to Villa/Apartment Unit)
              </Label>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                If checked, this role will belong to the unit and be selectable when onboarding residents to specific villas/apartments.
              </p>
            </div>
          </div>

          {/* Role Integration Configuration Segment */}
          <div>
            <Label className="text-sm font-semibold block mb-1.5">
              Role Integrations
            </Label>
            <div className="flex items-center gap-3 p-3 border border-stroke dark:border-strokedark rounded-md bg-gray-50 dark:bg-meta-4/20">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-semibold px-3 py-1.5 border-stroke dark:border-strokedark text-black dark:text-white bg-white dark:bg-meta-4 hover:bg-gray-50 dark:hover:bg-meta-4/40"
                onClick={() => setIsConfiguratorOpen(!isConfiguratorOpen)}
              >
                {isConfiguratorOpen ? 'Hide Configurator' : '🔗 Configure Integrations'}
              </Button>
              <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                {activeMappingsCount > 0
                  ? `Mapped: ${activeMappingsCount} active provider${activeMappingsCount > 1 ? 's' : ''}`
                  : 'No mapped integrations.'}
              </span>
            </div>

            <RoleIntegrationConfigurator
              isOpen={isConfiguratorOpen}
              onClose={() => setIsConfiguratorOpen(false)}
              mappings={integrationMappings}
              onApply={(newMappings) => {
                setValue('integrationMappings', newMappings, { shouldDirty: true, shouldValidate: true });
              }}
            />
          </div>

          <div className="text-sm font-semibold text-black dark:text-white mt-4 border-t border-stroke dark:border-strokedark pt-4">
            Granular Permissions Mapping
          </div>

          <div className="permissions-scroll-container max-h-[30vh] overflow-y-auto pr-1">
            {isPermissionsLoading ? (
              <div className="flex justify-center items-center py-6 gap-2">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
                <span className="text-gray-500 dark:text-gray-400 text-xs">Loading available permissions...</span>
              </div>
            ) : (
              <PermissionMatrix
                groupedPermissions={permissionsList}
                selectedIds={selectedPermissions}
                onSelectAllGroup={handleSelectAllGroup}
                onTogglePermission={handleTogglePermission}
              />
            )}
          </div>

          {errors.permissions && (
            <p className="text-red-500 text-xs mt-2" id="role-permissions-error">
              {errors.permissions.message}
            </p>
          )}

          <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-stroke dark:border-strokedark">
            <Button
              id="close-role-form-btn"
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Cancel
            </Button>
            <Button
              id="save-role-btn"
              type="submit"
              variant="default"
              size="sm"
              className="text-xs font-semibold px-4 py-2"
            >
              {role ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleFormModal;
