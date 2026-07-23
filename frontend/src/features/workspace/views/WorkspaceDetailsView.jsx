import React from 'react';
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CForm,
  CFormInput,
  CButton,
  CSpinner,
  CAlert,
  CNav,
  CNavItem,
  CNavLink,
  CFormSwitch,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormSelect,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import * as CoreIcons from '@coreui/icons';
import { cilSpeedometer, cilQrCode, cilPeople, cilSettings, cilTrash, cilUserPlus } from '@coreui/icons';

import DataTable from '../../../components/common/DataTable.jsx';
import useWorkspaceDetails from '../hooks/useWorkspaceDetails.js';
import '../../visitorManagement/styles/_visitorManagement.scss';
import '../styles/_workspace.scss';

export const WorkspaceDetailsView = () => {
  const {
    t,
    // Redux selectors
    activeWorkspaceDetails,
    workspaceModules,
    workspaceMembers,
    wsError,
    activeRole,
    // States & state setters
    activeTab,
    setActiveTab,
    showAddModuleModal,
    setShowAddModuleModal,
    showEditModuleModal,
    setShowEditModuleModal,
    showDeleteModal,
    setShowDeleteModal,
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
    handleModuleToggle,
    handleAddModuleSubmit,
    handleOpenEditModal,
    handleEditModuleSubmit,
    handleRemoveModule,
    handleAddMember,
    handleRemoveMember,
    handleDeleteWorkspace,
    handleRoleSwitch,
  } = useWorkspaceDetails();

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = editForm;

  const {
    register: registerAddModule,
    handleSubmit: handleSubmitAddModule,
    formState: { errors: addModuleErrors },
  } = addModuleForm;

  const {
    register: registerEditModule,
    handleSubmit: handleSubmitEditModule,
    formState: { errors: editModuleErrors },
  } = editModuleForm;

  // Icon mapping matching sidebar keys
  const iconMap = {
    'Users': CoreIcons.cilPeople,
    'People': CoreIcons.cilPeople,
    'Building2': CoreIcons.cilBuilding,
    'Building': CoreIcons.cilBuilding,
    'ShieldCheck': CoreIcons.cilShieldAlt,
    'Wallet': CoreIcons.cilWallet,
    'Bell': CoreIcons.cilWarning,
    'CalendarDays': CoreIcons.cilCalendar,
    'Wrench': CoreIcons.cilSettings,
    'Home': CoreIcons.cilHome,
    'QrCode': CoreIcons.cilQrCode,
    'Speedometer': CoreIcons.cilSpeedometer,
    'Apps': CoreIcons.cilApps,
    'List': CoreIcons.cilList,
    'LockLocked': CoreIcons.cilLockLocked,
    'Warning': CoreIcons.cilWarning,
    'Settings': CoreIcons.cilSettings,
  };

  // List of standard icons for dropdown selectors
  const availableIconsList = [
    { label: 'Home', value: 'Home' },
    { label: 'Building', value: 'Building2' },
    { label: 'Shield Check', value: 'ShieldCheck' },
    { label: 'Wallet', value: 'Wallet' },
    { label: 'Bell', value: 'Bell' },
    { label: 'Calendar', value: 'CalendarDays' },
    { label: 'Wrench', value: 'Wrench' },
    { label: 'Users', value: 'Users' },
    { label: 'QR Code', value: 'QrCode' },
    { label: 'Speedometer', value: 'Speedometer' },
    { label: 'Apps', value: 'Apps' },
    { label: 'List', value: 'List' },
    { label: 'Lock Locked', value: 'LockLocked' },
    { label: 'Warning', value: 'Warning' },
    { label: 'Settings', value: 'Settings' }
  ];

  if (!activeWorkspaceDetails) {
    if (wsError) {
      return (
        <CContainer className="py-5">
          <CAlert color="danger">{wsError}</CAlert>
        </CContainer>
      );
    }
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" className="mb-2" />
        <div>{t('workspace.details.loading', 'Loading workspace settings...')}</div>
      </div>
    );
  }

  const filteredMembers = (workspaceMembers || []).filter((m) =>
    m && (
      (m.name || '').toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
      (m.username || '').toLowerCase().includes(searchMemberQuery.toLowerCase())
    )
  );

  const memberColumns = [
    { key: 'name', label: t('workspace.details.tableName', 'Name'), render: (val) => val || 'N/A' },
    { key: 'email', label: t('workspace.details.tableEmail', 'Email') },
    { key: 'username', label: t('workspace.details.tableUsername', 'Username') },
    { key: 'role', label: t('workspace.details.tableRole', 'Role') },
  ];

  // Navigation tabs layout matching the Visitor Management bar style
  const navTabs = [
    { id: 'overview', name: 'Dashboard Overview', icon: cilSpeedometer },
    { id: 'create', name: 'Create Workspace', icon: cilQrCode },
    { id: 'members', name: 'Workspace Members', icon: cilPeople },
    { id: 'settings', name: 'Workspace Settings', icon: cilSettings },
  ];

  return (
    <div className="workspace-details-view py-3 visitor-os-theme">
      <CContainer fluid>
        {wsError && <CAlert color="danger" dismissible>{wsError}</CAlert>}

        {/* Top bar container with the Visitor Management navigation styling */}
        <div className="visitor-top-nav-bar d-flex justify-content-between align-items-center flex-wrap gap-3">
          <CNav variant="underline" style={{ borderBottom: 'none', gap: '16px', flexWrap: 'nowrap', minWidth: 'max-content', paddingBottom: '4px' }}>
            {navTabs.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <CNavItem key={item.id}>
                  <CNavLink
                    href="#"
                    active={isActive}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(item.id);
                    }}
                    className={`visitor-top-nav-link ${isActive ? 'active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <CIcon icon={item.icon} size="lg" style={{ marginBottom: '4px' }} />
                    {item.name}
                  </CNavLink>
                </CNavItem>
              );
            })}
          </CNav>

          {/* Interactive Role Switcher Pill */}
          <div className="role-switcher-pill">
            <button
              onClick={() => handleRoleSwitch('Community Admin')}
              className={`btn-pill-role ${activeRole === 'Community Admin' ? 'active' : ''}`}
            >
              Community Admin
            </button>
            <button
              onClick={() => handleRoleSwitch('Resident')}
              className={`btn-pill-role ${activeRole === 'Resident' ? 'active' : ''}`}
            >
              Resident
            </button>
          </div>
        </div>

        {/* Workspace Active Role restrictions warning banner */}
        {activeRole === 'Resident' && (
          <CAlert color="warning" className="mb-4 border-0 shadow-sm rounded-3">
            <strong>{t('workspace.details.readOnlyTitle', 'Read-Only Access:')}</strong>{' '}
            {t('workspace.details.readOnlyDesc', 'You are currently viewing this workspace settings dashboard under a Resident role scope. Modification rights are locked.')}
          </CAlert>
        )}

        <CCard className="mb-4 border-0 shadow-sm rounded-4">
          <CCardBody className="p-4">
            
            {/* 1. DASHBOARD OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div>
                <h4 className="mb-4 fw-bold">{t('workspace.details.overviewHeader', 'Overview Analytics')}</h4>
                <CRow className="g-4">
                  <CCol xs={12} sm={4}>
                    <div className="card card-hover" style={{ padding: '24px', borderLeft: '4px solid var(--primary, #0084FF)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Workspace Members</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '8px' }}>
                        {activeWorkspaceDetails?.members?.length ?? 0}
                      </div>
                    </div>
                  </CCol>
                  <CCol xs={12} sm={4}>
                    <div className="card card-hover" style={{ padding: '24px', borderLeft: '4px solid var(--success, #2ECC71)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Workspace Status</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '8px' }}>
                        {activeWorkspaceDetails?.status ?? 'Active'}
                      </div>
                    </div>
                  </CCol>
                  <CCol xs={12} sm={4}>
                    <div className="card card-hover" style={{ padding: '24px', borderLeft: '4px solid var(--info, #0084FF)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enabled Modules</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '8px' }}>
                        {workspaceModules?.filter(m => m.enabled)?.length ?? 0}
                      </div>
                    </div>
                  </CCol>
                </CRow>
              </div>
            )}

            {/* 2. CREATE WORKSPACE (FEATURES LIST & CREATE MODULE) TAB */}
            {activeTab === 'create' && (
              <div>
                {/* Header aligned with the reference UI mockup */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="fw-bold text-dark mb-0" style={{ fontSize: '24px' }}>
                    {t('workspace.details.createHeader', 'Create Workspace')}
                  </h3>
                  <CButton
                    color="primary"
                    disabled={activeRole === 'Resident'}
                    onClick={() => setShowAddModuleModal(true)}
                    className="text-white d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-3 border-0"
                    style={{ background: 'var(--primary, #0084FF)' }}
                  >
                    <span>+ New feature</span>
                  </CButton>
                </div>

                <p className="text-muted mb-4" style={{ fontSize: '14.5px', lineHeight: '1.6' }}>
                  Turn a feature on and it shows up in the sidebar on the left. Turn it off, and it's gone from the sidebar completely -- not greyed out, just not there.
                </p>

                {/* Dynamic Modules Card Listing */}
                <div className="d-flex flex-column gap-3 mt-4">
                  {(workspaceModules || []).map((mod) => {
                    if (!mod) return null;
                    const IconComponent = iconMap[mod.icon] || CoreIcons.cilApps;
                    return (
                      <div
                        key={mod._id}
                        className="d-flex align-items-center justify-content-between p-3 border rounded-3 bg-white shadow-sm"
                        style={{ minHeight: '80px', borderColor: '#f1f5f9' }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          {/* Left icon wrapper */}
                          <div
                            className="rounded-3 d-flex align-items-center justify-content-center bg-light text-secondary border"
                            style={{ width: '48px', height: '48px', backgroundColor: '#f8fafc' }}
                          >
                            <CIcon icon={IconComponent} size="lg" style={{ color: '#475569' }} />
                          </div>
                          <div>
                            <h5 className="mb-1 fw-bold text-dark" style={{ fontSize: '16px' }}>{mod.moduleName}</h5>
                            <span
                              className="small"
                              style={{
                                color: mod.enabled ? 'var(--text-muted, #64748b)' : 'var(--text-light, #94a3b8)',
                                fontWeight: '500'
                              }}
                            >
                              {mod.enabled ? 'Visible in sidebar' : 'Hidden from sidebar'}
                            </span>
                          </div>
                        </div>

                        {/* Right side controls */}
                        <div className="d-flex align-items-center gap-3">
                          <CFormSwitch
                            id={`toggle-visibility-${mod._id}`}
                            checked={mod.enabled}
                            disabled={activeRole === 'Resident'}
                            onChange={() => handleModuleToggle(mod._id, mod.enabled)}
                            style={{ transform: 'scale(1.25)', cursor: activeRole === 'Resident' ? 'not-allowed' : 'pointer' }}
                          />
                          <CButton
                            color="light"
                            size="sm"
                            disabled={activeRole === 'Resident'}
                            onClick={() => handleOpenEditModal(mod)}
                            className="border p-2 bg-white"
                          >
                            <CIcon icon={CoreIcons.cilPencil} size="sm" style={{ color: '#475569' }} />
                          </CButton>
                          <CButton
                            color="light"
                            size="sm"
                            disabled={activeRole === 'Resident'}
                            onClick={() => handleRemoveModule(mod._id)}
                            className="border p-2 bg-white"
                          >
                            <CIcon icon={CoreIcons.cilTrash} size="sm" style={{ color: '#ef4444' }} />
                          </CButton>
                        </div>
                      </div>
                    );
                  })}

                  {workspaceModules.length === 0 && (
                    <div className="text-center py-5 text-muted border border-dashed rounded-3">
                      {t('workspace.details.noFeatures', 'No dynamic features registered in this workspace yet.')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. WORKSPACE MEMBERS TAB */}
            {activeTab === 'members' && (
              <div>
                <h4 className="mb-4 fw-bold">{t('workspace.details.membersHeader', 'Workspace Member Listings')}</h4>
                
                {activeRole !== 'Resident' && (
                  <div className="mb-4">
                    <CForm onSubmit={handleAddMember} className="row g-2 align-items-end">
                      <CCol xs={12} sm={8} md={6}>
                        <CFormInput
                          label={t('workspace.details.addMemberLabel', 'Add Member')}
                          placeholder={t('workspace.details.addMemberPlaceholder', 'Enter User ID, Email, or Username')}
                          value={newMemberIdentifier}
                          onChange={(e) => setNewMemberIdentifier(e.target.value)}
                        />
                      </CCol>
                      <CCol xs={12} sm={4}>
                        <CButton type="submit" color="primary" className="w-100 d-flex align-items-center justify-content-center gap-2 text-white py-2">
                          <CIcon icon={cilUserPlus} />
                          <span>{t('workspace.details.addMemberBtn', 'Add Member')}</span>
                        </CButton>
                      </CCol>
                    </CForm>
                  </div>
                )}

                <div className="mb-3">
                  <CFormInput
                    type="text"
                    placeholder={t('workspace.details.searchMembers', 'Search members...')}
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    size="sm"
                    className="w-100 max-w-sm"
                  />
                </div>

                <DataTable
                  columns={memberColumns}
                  data={filteredMembers}
                  currentPage={1}
                  totalPages={1}
                  rowsPerPage={filteredMembers.length || 10}
                  loading={false}
                  renderRowActions={(row) => (
                    activeRole !== 'Resident' && (
                      <CButton
                        color="danger"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveMember(row._id)}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    )
                  )}
                />
              </div>
            )}

            {/* 4. WORKSPACE SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div>
                <h4 className="mb-4 fw-bold">{t('workspace.details.settingsHeader', 'Workspace Settings')}</h4>
                
                {/* General config form */}
                <h5 className="fw-semibold text-dark mb-3">{t('workspace.details.metaTitle', 'Workspace Metadata')}</h5>
                <CForm onSubmit={handleSubmitEdit(handleGeneralInfoSubmit)} className="mb-5">
                  <CRow className="g-3">
                    <CCol md={6}>
                      <CFormInput
                        label={t('workspace.details.nameLabel', 'Workspace Name *')}
                        disabled={activeRole === 'Resident'}
                        {...registerEdit('workspaceName', { required: 'Workspace name is required.' })}
                        feedbackInvalid={editErrors.workspaceName?.message}
                        invalid={!!editErrors.workspaceName}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormInput
                        label={t('workspace.details.descLabel', 'Workspace Description')}
                        disabled={activeRole === 'Resident'}
                        {...registerEdit('description')}
                      />
                    </CCol>
                  </CRow>
                  {activeRole !== 'Resident' && (
                    <div className="mt-4 text-end">
                      <CButton type="submit" color="primary" disabled={isEditSubmitting}>
                        {isEditSubmitting ? <CSpinner size="sm" /> : t('workspace.details.save', 'Save Changes')}
                      </CButton>
                    </div>
                  )}
                </CForm>

                <hr className="my-4" />

                {/* Danger zone delete */}
                {activeRole !== 'Resident' && (
                  <div className="p-4 border border-danger rounded-3 bg-danger-light">
                    <h5 className="text-danger fw-bold mb-2">{t('workspace.details.dangerZone', 'Danger Zone')}</h5>
                    <p className="text-muted small mb-3">{t('workspace.details.deleteWarning', 'Deleting this workspace will remove all linked configurations, modules, and logs permanently.')}</p>
                    <CButton color="danger" className="text-white" onClick={() => setShowDeleteModal(true)}>
                      <CIcon icon={cilTrash} className="me-2" />
                      {t('workspace.details.deleteBtn', 'Delete Workspace')}
                    </CButton>
                  </div>
                )}
              </div>
            )}

          </CCardBody>
        </CCard>
      </CContainer>

      {/* 1. Add New Module Modal */}
      <CModal visible={showAddModuleModal} onClose={() => setShowAddModuleModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{t('workspace.details.addModuleModal', 'Add New Sidebar Feature')}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmitAddModule(handleAddModuleSubmit)}>
          <CModalBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormInput
                  label={t('workspace.details.addModName', 'Feature Name *')}
                  placeholder="e.g. Notices Board"
                  {...registerAddModule('moduleName', { required: 'Feature name is required.' })}
                  invalid={!!addModuleErrors.moduleName}
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  label={t('workspace.details.addModKey', 'Feature Key (unique identifier) *')}
                  placeholder="e.g. notices"
                  {...registerAddModule('moduleKey', { required: 'Feature key is required.' })}
                  invalid={!!addModuleErrors.moduleKey}
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  label={t('workspace.details.addModRoute', 'Feature Route (redirect path) *')}
                  placeholder="e.g. /notices"
                  {...registerAddModule('route', { required: 'Route path is required.' })}
                  invalid={!!addModuleErrors.route}
                />
              </CCol>
              <CCol md={6}>
                <CFormSelect
                  label={t('workspace.details.addModIcon', 'Sidebar Icon *')}
                  {...registerAddModule('icon')}
                >
                  {availableIconsList.map((ico) => (
                    <option key={ico.value} value={ico.value}>
                      {ico.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowAddModuleModal(false)}>
              {t('workspace.details.cancel', 'Cancel')}
            </CButton>
            <CButton type="submit" color="primary" className="text-white">
              {t('workspace.details.submit', 'Save')}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* 2. Edit Module Modal */}
      <CModal visible={showEditModuleModal} onClose={() => setShowEditModuleModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{t('workspace.details.editModuleModal', 'Modify Feature Configuration')}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmitEditModule(handleEditModuleSubmit)}>
          <CModalBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormInput
                  label={t('workspace.details.addModName', 'Feature Name *')}
                  {...registerEditModule('moduleName', { required: 'Feature name is required.' })}
                  invalid={!!editModuleErrors.moduleName}
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  label={t('workspace.details.addModKey', 'Feature Key (unique identifier) *')}
                  disabled
                  {...registerEditModule('moduleKey')}
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  label={t('workspace.details.addModRoute', 'Feature Route (redirect path) *')}
                  {...registerEditModule('route', { required: 'Route path is required.' })}
                  invalid={!!editModuleErrors.route}
                />
              </CCol>
              <CCol md={6}>
                <CFormSelect
                  label={t('workspace.details.addModIcon', 'Sidebar Icon *')}
                  {...registerEditModule('icon')}
                >
                  {availableIconsList.map((ico) => (
                    <option key={ico.value} value={ico.value}>
                      {ico.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowEditModuleModal(false)}>
              {t('workspace.details.cancel', 'Cancel')}
            </CButton>
            <CButton type="submit" color="primary" className="text-white">
              {t('workspace.details.submit', 'Save')}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* 3. Delete Workspace Confirmation Modal */}
      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <CModalHeader>
          <CModalTitle>{t('workspace.details.deleteModalTitle', 'Delete Workspace')}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>{t('workspace.details.deleteModalBody', 'Are you absolutely sure you want to permanently delete this workspace? All user details and module structures will be pruned.')}</p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)}>
            {t('workspace.details.cancel', 'Cancel')}
          </CButton>
          <CButton color="danger" className="text-white" onClick={handleDeleteWorkspace}>
            {t('workspace.details.confirmDelete', 'Delete')}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
};

export default WorkspaceDetailsView;
