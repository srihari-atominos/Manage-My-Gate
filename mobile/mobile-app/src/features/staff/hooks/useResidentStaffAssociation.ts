import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchMyUnitsThunk,
  fetchEligibleStaffThunk,
  fetchAssociationsThunk,
  createAssociationThunk,
  removeAssociationThunk,
  clearStaffError,
} from '../store/staffSlice';
import {
  CreateStaffAssociationPayload,
  StaffUnitAssociation,
} from '../services/staffService';
import { checkIsAdmin } from '../../../utils/rbac';

export function useResidentStaffAssociation() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const {
    myUnits,
    eligibleStaff,
    associations,
    isAssociationsLoading,
    isAssociationSubmitting,
    associationError,
  } = useSelector((state: RootState) => state.staff);

  const [selectedVillaId, setSelectedVillaId] = useState<string>('all');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | 'Active' | 'Pending'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState<boolean>(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [successModalMessage, setSuccessModalMessage] = useState<string>('');
  const [targetAssociationToRemove, setTargetAssociationToRemove] =
    useState<StaffUnitAssociation | null>(null);

  // Active org context
  const activeOrgId = useMemo(() => {
    return user?.activeOrgId || user?.orgId || user?.organizationId || '';
  }, [user]);

  // Authorization check for staff:assign_unit
  const isAdmin = useMemo(() => checkIsAdmin(user), [user]);
  const hasAssignPermission = useMemo(() => {
    if (isAdmin) return true;
    const permissions = user?.permissions || [];
    return (
      permissions.includes('staff:assign_unit') ||
      permissions.includes('staff:manage') ||
      permissions.includes('*') ||
      permissions.includes('platform:super_admin')
    );
  }, [isAdmin, user?.permissions]);

  // Load initial data - fetch all statuses so Pending invitations are included
  const loadData = useCallback(() => {
    if (!activeOrgId || !hasAssignPermission) return;
    dispatch(fetchMyUnitsThunk());
    dispatch(fetchEligibleStaffThunk());
    dispatch(
      fetchAssociationsThunk({
        villaId: selectedVillaId === 'all' ? undefined : selectedVillaId,
        status: 'ALL',
      })
    );
  }, [dispatch, activeOrgId, hasAssignPermission, selectedVillaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Counts for tabs
  const activeCount = useMemo(() => {
    return associations.filter((a) => a.status === 'Active').length;
  }, [associations]);

  const pendingCount = useMemo(() => {
    return associations.filter((a) => a.status === 'Pending').length;
  }, [associations]);

  // Filtered associations based on search, selected villa, and status tab
  const filteredAssociations = useMemo(() => {
    return associations.filter((assoc) => {
      // Status tab filter
      if (selectedStatusTab !== 'ALL' && assoc.status !== selectedStatusTab) {
        return false;
      }

      // Villa filter
      if (selectedVillaId !== 'all') {
        const villaId = assoc.villaId?._id || (assoc.villaId as any);
        if (String(villaId) !== String(selectedVillaId)) return false;
      }

      // Search query filter (matches staff name, role, department, or unit number)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const techName = assoc.technicianId?.name?.toLowerCase() || '';
        const dept = assoc.technicianId?.department?.toLowerCase() || '';
        const role = assoc.roleOrTrade?.toLowerCase() || '';
        const unitNum = assoc.villaId?.unitNumber?.toLowerCase() || '';

        return (
          techName.includes(query) ||
          dept.includes(query) ||
          role.includes(query) ||
          unitNum.includes(query)
        );
      }

      return true;
    });
  }, [associations, selectedVillaId, selectedStatusTab, searchQuery]);

  // Handle association creation
  const handleCreateAssociation = useCallback(
    async (payload: CreateStaffAssociationPayload) => {
      const resultAction = await dispatch(createAssociationThunk(payload));
      if (createAssociationThunk.fulfilled.match(resultAction)) {
        setIsAssociateModalOpen(false);
        const invitedStaffName =
          eligibleStaff.find((s) => s._id === payload.technicianId)?.name || 'the staff member';
        setSuccessModalMessage(
          `Staff association request has been sent for ${invitedStaffName}. They will receive a notification and can accept or decline this allocation on their staff portal.`
        );
        setIsSuccessModalOpen(true);
        // Refresh associations list to ensure all details and relations are fully populated
        dispatch(
          fetchAssociationsThunk({
            villaId: selectedVillaId === 'all' ? undefined : selectedVillaId,
            status: 'ALL',
          })
        );
        return { success: true };
      } else {
        return {
          success: false,
          error: (resultAction.payload as string) || 'Failed to associate staff',
        };
      }
    },
    [dispatch, eligibleStaff, selectedVillaId]
  );

  // Handle association removal
  const handleRemoveAssociation = useCallback(
    async (reason: string = 'Removed by resident') => {
      if (!targetAssociationToRemove) return { success: false };
      const resultAction = await dispatch(
        removeAssociationThunk({ id: targetAssociationToRemove._id, reason })
      );
      if (removeAssociationThunk.fulfilled.match(resultAction)) {
        setIsRemoveModalOpen(false);
        setTargetAssociationToRemove(null);
        return { success: true };
      } else {
        return {
          success: false,
          error: (resultAction.payload as string) || 'Failed to remove association',
        };
      }
    },
    [dispatch, targetAssociationToRemove]
  );

  const openRemoveModal = useCallback((association: StaffUnitAssociation) => {
    setTargetAssociationToRemove(association);
    setIsRemoveModalOpen(true);
  }, []);

  const closeRemoveModal = useCallback(() => {
    setTargetAssociationToRemove(null);
    setIsRemoveModalOpen(false);
  }, []);

  const clearError = useCallback(() => {
    dispatch(clearStaffError());
  }, [dispatch]);

  return {
    myUnits,
    eligibleStaff,
    associations,
    filteredAssociations,
    selectedVillaId,
    setSelectedVillaId,
    searchQuery,
    setSearchQuery,
    isLoading: isAssociationsLoading,
    isSubmitting: isAssociationSubmitting,
    error: associationError,
    selectedStatusTab,
    setSelectedStatusTab,
    activeCount,
    pendingCount,
    isSuccessModalOpen,
    setIsSuccessModalOpen,
    successModalMessage,
    isAssociateModalOpen,
    setIsAssociateModalOpen,
    isRemoveModalOpen,
    targetAssociationToRemove,
    hasAssignPermission,
    loadData,
    handleCreateAssociation,
    handleRemoveAssociation,
    openRemoveModal,
    closeRemoveModal,
    clearError,
  };
}

export default useResidentStaffAssociation;
