import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { RoleData } from '../services/roleService';

const schema = yup.object().shape({
  name: yup.string().trim().required('Role name is required'),
  description: yup.string().trim().optional(),
  isTenantRole: yup.boolean().optional().default(false),
  permissions: yup.array().of(yup.string().required()).required('Permissions array is required'),
  integrationMappings: yup.object().optional().default({}),
});

interface UseRoleFormProps {
  role?: RoleData | null;
  visible: boolean;
  onSave: (data: RoleData) => Promise<any>;
}

export const useRoleForm = ({ role, visible, onSave }: UseRoleFormProps) => {
  const [isIntegrationDrawerOpen, setIsIntegrationDrawerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RoleData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      name: '',
      description: '',
      isTenantRole: false,
      permissions: [],
      integrationMappings: {},
    },
  });

  const selectedPermissions = watch('permissions') || [];
  const isTenantRole = watch('isTenantRole') || false;
  const integrationMappings = watch('integrationMappings') || {};

  useEffect(() => {
    if (visible && role) {
      reset({
        name: role.name || '',
        description: role.description || '',
        isTenantRole: role.isTenantRole || false,
        permissions: role.permissions || [],
        integrationMappings: role.integrationMappings || {},
      });
    } else if (!visible) {
      reset({
        name: '',
        description: '',
        isTenantRole: false,
        permissions: [],
        integrationMappings: {},
      });
      setIsIntegrationDrawerOpen(false);
    }
  }, [role, visible, reset]);

  const handleSelectAllGroup = (groupCodes: string[], checked: boolean) => {
    const currentPermissions = getValues('permissions') || [];
    let newValue: string[];

    if (checked) {
      let filteredGroupCodes = [...groupCodes];
      const visitorCodes = groupCodes.filter((code) =>
        String(code).toLowerCase().startsWith('visitor:')
      );
      if (visitorCodes.length > 1) {
        filteredGroupCodes = groupCodes.filter(
          (code) => !String(code).toLowerCase().startsWith('visitor:') || code === visitorCodes[0]
        );
      }
      newValue = Array.from(new Set([...currentPermissions, ...filteredGroupCodes]));
    } else {
      newValue = currentPermissions.filter((code) => !groupCodes.includes(code));
    }

    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true });
  };

  const handleTogglePermission = (permValue: string, checked: boolean) => {
    const currentPermissions = getValues('permissions') || [];
    let newValue: string[];

    if (checked) {
      if (String(permValue).toLowerCase().startsWith('visitor:')) {
        // Enforce single-choice radio rule for visitor permissions
        newValue = [
          ...currentPermissions.filter((p) => !String(p).toLowerCase().startsWith('visitor:')),
          permValue,
        ];
      } else {
        newValue = [...currentPermissions, permValue];
      }
    } else {
      newValue = currentPermissions.filter((p) => p !== permValue);
    }

    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true });
  };

  const handleApplyIntegrationMappings = (mappings: Record<string, string>) => {
    setValue('integrationMappings', mappings, { shouldDirty: true, shouldValidate: true });
  };

  const toggleIntegrationDrawer = () => {
    setIsIntegrationDrawerOpen((prev) => !prev);
  };

  const onSubmit = async (data: RoleData) => {
    await onSave(data);
  };

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    control,
    isSubmitting,
    selectedPermissions,
    isTenantRole,
    integrationMappings,
    isIntegrationDrawerOpen,
    toggleIntegrationDrawer,
    setValue,
    handleSelectAllGroup,
    handleTogglePermission,
    handleApplyIntegrationMappings,
  };
};

export default useRoleForm;
