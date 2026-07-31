import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog';
import { Button } from 'src/components/ui/button';
import { Alert, AlertDescription } from 'src/components/ui/alert';
import { Checkbox } from 'src/components/ui/checkbox';
import { Label } from 'src/components/ui/label';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import usePermission from '../../../hooks/usePermission';

const schema = yup.object().shape({
  selectedRoles: yup.array().of(yup.string()),
});

const ManageRolesModal = ({ visible, user, onClose, onSave, availableRoles = [] }) => {
  const hasPermission = usePermission('users', 'update');

  const { reset, watch, setValue, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      selectedRoles: [],
    },
  });

  useEffect(() => {
    if (visible && user) {
      const userRoles = typeof user.role === 'string'
        ? user.role.split(',').map((r) => r.trim()).filter(Boolean)
        : [];
      reset({ selectedRoles: userRoles.length > 0 ? [userRoles[0]] : [] });
    } else if (!visible) {
      reset({ selectedRoles: [] });
    }
  }, [user, visible, reset]);

  const selectedRoles = watch('selectedRoles') || [];

  const handleCheckboxChange = (role, checked) => {
    if (!hasPermission) return;
    let newRoles;
    if (checked) {
      newRoles = [role]; // Single selection: replace instead of append
    } else {
      newRoles = [];
    }
    setValue('selectedRoles', newRoles, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = (data) => {
    if (!hasPermission) return;
    onSave(user.id, data.selectedRoles);
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Manage Roles - {user?.name || ''}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {!hasPermission && (
            <Alert variant="warning" className="mb-3" id="rbac-warning-alert">
              <AlertDescription>
                You do not have permission to modify roles.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm font-semibold text-black dark:text-white">
            Select user roles:
          </div>

          <div className="flex flex-col gap-3">
            {availableRoles.map((role) => {
              const isChecked = selectedRoles.includes(role);
              const elementId = `role-checkbox-${role.replace(/\s+/g, '-').toLowerCase()}`;
              return (
                <div key={role} className="flex items-center gap-2">
                  <Checkbox
                    id={elementId}
                    checked={isChecked}
                    disabled={!hasPermission}
                    onCheckedChange={(checked) => handleCheckboxChange(role, !!checked)}
                    className="checkbox"
                  />
                  <Label
                    htmlFor={elementId}
                    className="opacity-90 font-normal cursor-pointer text-sm text-black dark:text-white"
                  >
                    {role}
                  </Label>
                </div>
              );
            })}
          </div>

          {errors.selectedRoles && (
            <p className="text-red-500 text-xs mt-1" id="roles-validation-error">
              {errors.selectedRoles.message}
            </p>
          )}

          <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-stroke dark:border-strokedark">
            <Button
              id="close-manage-roles-btn"
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Cancel
            </Button>
            {hasPermission && (
              <Button
                id="save-roles-btn"
                type="submit"
                variant="default"
                size="sm"
                className="text-xs font-semibold px-4 py-2"
              >
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManageRolesModal;
