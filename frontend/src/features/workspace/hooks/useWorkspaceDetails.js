import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  loadWorkspaces,
  getWorkspaceDetails,
  editWorkspaceDetails,
  removeWorkspace,
  toggleModule,
  addModule,
  editModule,
  removeModule,
  loadWorkspaceMembers,
  addMember,
  removeMember,
  loadCurrentModules,
  setActiveWorkspace,
  createNewWorkspace,
} from '../store/workspaceSlice.js';

export const useWorkspaceDetails = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id: routeId } = useParams();

  // Redux Store states
  const {
    activeWorkspaceDetails,
    workspaceModules,
    workspaceMembers,
    loading: wsLoading,
    error: wsError,
  } = useSelector((state) => state.workspace);

  const activeOrgId = useSelector((state) => state.workspace.activeOrganizationId);
  const isPlatformAdmin = useSelector((state) => state.workspace.isPlatform);
  const allowedFeatures = useSelector((state) => state.workspace.allowedFeatures);
  const activeRole = useSelector((state) => state.workspace.activeRole);

  // Local component states
  const [workspaceId, setWorkspaceId] = useState(null);
  const [activeTab, setActiveTab] = useState('create');
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [showEditModuleModal, setShowEditModuleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedModuleForEdit, setSelectedModuleForEdit] = useState(null);
  const [newMemberIdentifier, setNewMemberIdentifier] = useState('');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  // Workspace Settings edit Form hook
  const editForm = useForm({
    defaultValues: {
      workspaceName: '',
      description: '',
      status: 'Active',
    },
  });

  const { reset: resetEdit } = editForm;

  // Add Module Form hook
  const addModuleForm = useForm({
    defaultValues: {
      moduleName: '',
      moduleKey: '',
      route: '',
      icon: 'Apps',
      enabled: true,
      sidebarVisible: true,
    },
  });

  const { reset: resetAddModule } = addModuleForm;

  // Edit Module Form hook
  const editModuleForm = useForm();
  const { reset: resetEditModule } = editModuleForm;

  // 1. Resolve workspace ID dynamically
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        if (routeId) {
          setWorkspaceId(routeId);
          dispatch(getWorkspaceDetails(routeId));
        } else {
          const listResponse = await dispatch(loadWorkspaces()).unwrap();
          const list = listResponse?.data || listResponse || [];
          const activeWs = Array.isArray(list)
            ? (list.find((w) => w && w.organizationId === activeOrgId) || list[0])
            : null;
          if (activeWs) {
            setWorkspaceId(activeWs._id);
            dispatch(getWorkspaceDetails(activeWs._id));
          }
        }
      } catch (err) {
        toast.error(t('workspace.details.loadError', 'Failed to retrieve workspace details.'));
      }
    };
    initWorkspace();
  }, [routeId, activeOrgId, dispatch, t]);

  // 2. Synchronize Edit Workspace details forms when data hydrates
  useEffect(() => {
    if (activeWorkspaceDetails) {
      resetEdit({
        workspaceName: activeWorkspaceDetails.workspaceName || '',
        description: activeWorkspaceDetails.description || '',
        status: activeWorkspaceDetails.status || 'Active',
      });
    }
  }, [activeWorkspaceDetails, resetEdit]);

  // 3. Load tab specific details on tab switch
  useEffect(() => {
    if (workspaceId && activeTab === 'members') {
      dispatch(loadWorkspaceMembers(workspaceId));
    }
  }, [workspaceId, activeTab, dispatch]);

  const handleGeneralInfoSubmit = async (formData) => {
    if (activeRole === 'Resident') {
      toast.error(t('workspace.details.restrictedAction', 'Residents cannot modify settings.'));
      return;
    }
    try {
      await dispatch(editWorkspaceDetails({ id: workspaceId, data: formData })).unwrap();
      toast.success(t('workspace.details.saveSuccess', 'Workspace settings updated successfully.'));
      dispatch(loadCurrentModules());
    } catch (err) {
      toast.error(err || t('workspace.details.saveError', 'Failed to save settings.'));
    }
  };

  const handleCreateWorkspaceSubmit = async (formData) => {
    if (activeRole === 'Resident') {
      toast.error(t('workspace.details.restrictedAction', 'Residents cannot create workspaces.'));
      return;
    }
    try {
      const payload = {
        ...formData,
        organizationId: activeOrgId,
      };
      const newWs = await dispatch(createNewWorkspace(payload)).unwrap();
      toast.success(t('workspace.details.createSuccess', 'Workspace created successfully.'));
      
      // Select the newly created workspace
      if (newWs && newWs._id) {
        setWorkspaceId(newWs._id);
        dispatch(getWorkspaceDetails(newWs._id));
        setActiveTab('create');
        dispatch(loadCurrentModules());
      }
    } catch (err) {
      toast.error(err || t('workspace.details.createError', 'Failed to create workspace.'));
    }
  };

  const handleModuleToggle = async (modId, currentEnabled) => {
    if (activeRole === 'Resident') {
      toast.error(t('workspace.details.restrictedAction', 'Residents cannot modify module features.'));
      return;
    }
    if (!workspaceId) return;
    try {
      const nextEnabled = !currentEnabled;
      await dispatch(toggleModule({ workspaceId, moduleId: modId, enabled: nextEnabled })).unwrap();
      toast.success(t('workspace.details.moduleToggleSuccess', 'Module access modified successfully.'));
      dispatch(loadCurrentModules());
    } catch (err) {
      toast.error(err || t('workspace.details.moduleToggleError', 'Failed to modify module access.'));
    }
  };

  const handleAddModuleSubmit = async (formData) => {
    if (activeRole === 'Resident') {
      toast.error(t('workspace.details.restrictedAction', 'Residents cannot create modules.'));
      return;
    }
    try {
      await dispatch(addModule({ workspaceId, moduleData: formData })).unwrap();
      toast.success(t('workspace.details.moduleAddSuccess', 'New feature module added successfully.'));
      setShowAddModuleModal(false);
      resetAddModule();
      dispatch(loadCurrentModules());
    } catch (err) {
      toast.error(err || t('workspace.details.moduleAddError', 'Failed to create feature module.'));
    }
  };

  const handleOpenEditModal = (mod) => {
    setSelectedModuleForEdit(mod);
    resetEditModule({
      moduleName: mod.moduleName,
      moduleKey: mod.moduleKey,
      route: mod.route,
      icon: mod.icon || 'Apps',
      enabled: mod.enabled,
      sidebarVisible: mod.sidebarVisible !== false,
    });
    setShowEditModuleModal(true);
  };

  const handleEditModuleSubmit = async (formData) => {
    if (activeRole === 'Resident') {
      toast.error(t('workspace.details.restrictedAction', 'Residents cannot update modules.'));
      return;
    }
    try {
      await dispatch(editModule({
        workspaceId,
        moduleId: selectedModuleForEdit._id,
        moduleData: formData,
      })).unwrap();
      toast.success(t('workspace.details.moduleEditSuccess', 'Feature module updated successfully.'));
      setShowEditModuleModal(false);
      dispatch(loadCurrentModules());
    } catch (err) {
      toast.error(err || t('workspace.details.moduleEditError', 'Failed to save module configurations.'));
    }
  };

  const handleRemoveModule = async (moduleId) => {
    if (activeRole === 'Resident') {
      toast.error(t('workspace.details.restrictedAction', 'Residents cannot delete modules.'));
      return;
    }
    if (!window.confirm(t('workspace.details.confirmRemoveModule', 'Are you sure you want to permanently delete this feature module?'))) return;

    try {
      await dispatch(removeModule({ workspaceId, moduleId })).unwrap();
      toast.success(t('workspace.details.moduleRemoveSuccess', 'Feature module deleted successfully.'));
      dispatch(loadCurrentModules());
    } catch (err) {
      toast.error(err || t('workspace.details.moduleRemoveError', 'Failed to delete module.'));
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (activeRole === 'Resident') {
      toast.error(t('workspace.details.restrictedAction', 'Residents cannot add members.'));
      return;
    }
    if (!newMemberIdentifier.trim()) return;

    try {
      await dispatch(addMember({ workspaceId, identifier: newMemberIdentifier.trim() })).unwrap();
      toast.success(t('workspace.details.memberAddSuccess', 'Member linked successfully.'));
      setNewMemberIdentifier('');
      dispatch(loadWorkspaceMembers(workspaceId));
    } catch (err) {
      toast.error(err || t('workspace.details.memberAddError', 'Failed to link member.'));
    }
  };

  const handleRemoveMember = async (userId) => {
    if (activeRole === 'Resident') {
      toast.error(t('workspace.details.restrictedAction', 'Residents cannot remove members.'));
      return;
    }
    if (!window.confirm(t('workspace.details.confirmRemoveMember', 'Are you sure you want to remove this member?'))) return;

    try {
      await dispatch(removeMember({ workspaceId, userId })).unwrap();
      toast.success(t('workspace.details.memberRemoveSuccess', 'Member unlinked successfully.'));
      dispatch(loadWorkspaceMembers(workspaceId));
    } catch (err) {
      toast.error(err || t('workspace.details.memberRemoveError', 'Failed to unlink member.'));
    }
  };

  const handleDeleteWorkspace = async () => {
    if (activeRole === 'Resident') {
      toast.error(t('workspace.details.restrictedAction', 'Residents cannot delete workspaces.'));
      return;
    }
    try {
      await dispatch(removeWorkspace(workspaceId)).unwrap();
      toast.success(t('workspace.details.deleteSuccess', 'Workspace deleted successfully.'));
      setShowDeleteModal(false);

      if (isPlatformAdmin) {
        navigate('/super-admin/organizations');
      } else {
        navigate('/login');
      }
    } catch (err) {
      toast.error(err || t('workspace.details.deleteError', 'Failed to delete workspace.'));
    }
  };

  const handleRoleSwitch = (targetRole) => {
    dispatch(setActiveWorkspace({
      activeOrganizationId: activeOrgId,
      activeRole: targetRole,
      allowedFeatures: allowedFeatures,
      isPlatform: isPlatformAdmin,
    }));
    toast.success(t('workspace.details.roleSwitched', { defaultValue: `Switched view context to ${targetRole}` }));
  };

  return {
    t,
    navigate,
    routeId,
    // Redux selectors
    activeWorkspaceDetails,
    workspaceModules,
    workspaceMembers,
    wsLoading,
    wsError,
    activeOrgId,
    isPlatformAdmin,
    allowedFeatures,
    activeRole,
    // States & state setters
    workspaceId,
    activeTab,
    setActiveTab,
    showAddModuleModal,
    setShowAddModuleModal,
    showEditModuleModal,
    setShowEditModuleModal,
    showDeleteModal,
    setShowDeleteModal,
    selectedModuleForEdit,
    setSelectedModuleForEdit,
    newMemberIdentifier,
    setNewMemberIdentifier,
    searchMemberQuery,
    setSearchMemberQuery,
    // Forms
    editForm,
    addModuleForm,
    editModuleForm,
    // Action handlers
    handleGeneralInfoSubmit,
    handleCreateWorkspaceSubmit,
    handleModuleToggle,
    handleAddModuleSubmit,
    handleOpenEditModal,
    handleEditModuleSubmit,
    handleRemoveModule,
    handleAddMember,
    handleRemoveMember,
    handleDeleteWorkspace,
    handleRoleSwitch,
  };
};

export default useWorkspaceDetails;
