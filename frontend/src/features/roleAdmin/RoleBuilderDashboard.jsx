import React, { useState, useEffect } from 'react';
import roleApi from './roleApi.js';
import usePermission from '../../hooks/usePermission.js';
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CButton,
  CFormCheck,
  CFormInput,
  CFormTextarea,
  CAlert,
  CSpinner,
  CListGroup,
  CListGroupItem,
} from '@coreui/react';
import logger from '../../utils/logger.js';

export const RoleBuilderDashboard = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // RBAC Permission checks
  const canReadRoles = usePermission('roles', 'read');
  const canUpdateRoles = usePermission('roles', 'update');
  const canCreateRoles = usePermission('roles', 'create');

  useEffect(() => {
    if (canReadRoles) {
      loadInitialData();
    }
  }, [canReadRoles]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const rolesRes = await roleApi.fetchRoles();
      const permsRes = await roleApi.fetchPermissions();
      
      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);

      if (rolesRes.data && rolesRes.data.length > 0) {
        handleSelectRole(rolesRes.data[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load Roles/Permissions');
      logger.error('Failed to load Role Builder dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (role) => {
    setSelectedRole(role);
    setError(null);
    setSuccess(null);
    try {
      const res = await roleApi.fetchRolePermissions(role._id);
      // res.data is an array of permission objects mapped to this role
      const mappedIds = res.data.map((p) => p._id);
      setSelectedPermissions(mappedIds);
    } catch (err) {
      setError(`Failed to load permissions for role: ${role.name}`);
      logger.error('Failed to load role permissions', err);
    }
  };

  const handleTogglePermission = (permissionId) => {
    if (!canUpdateRoles) return;
    
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSaveMappings = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await roleApi.updateRolePermissions(selectedRole._id, selectedPermissions);
      setSuccess(`Successfully updated permissions for role "${selectedRole.name}"!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save mappings');
      logger.error('Failed to save role-permission mappings', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await roleApi.createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
      });
      setRoles((prev) => [...prev, res.data]);
      setNewRoleName('');
      setNewRoleDesc('');
      setSuccess(`Role "${res.data.name}" created successfully!`);
      handleSelectRole(res.data);
    } catch (err) {
      setError(err.message || 'Failed to create role');
      logger.error('Failed to create role', err);
    }
  };

  // Group permissions by their feature name
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const { feature } = perm;
    if (!acc[feature]) acc[feature] = [];
    acc[feature].push(perm);
    return acc;
  }, {});

  if (!canReadRoles) {
    return (
      <div style={styles.deniedContainer}>
        <div style={styles.deniedCard}>
          <div style={styles.deniedIcon}>🔒</div>
          <h2>Access Denied</h2>
          <p>You do not have the required permissions (`roles:read`) to view the Role Builder Dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Dynamic Role Builder Dashboard</h1>
      <p style={styles.pageSubtitle}>Manage system roles and dynamically map granular resource permissions.</p>

      {error && <CAlert color="danger" style={styles.alert}>{error}</CAlert>}
      {success && <CAlert color="success" style={styles.alert}>{success}</CAlert>}

      {loading ? (
        <div style={styles.spinnerContainer}>
          <CSpinner color="primary" />
        </div>
      ) : (
        <CRow>
          {/* Roles List Panel */}
          <CCol lg={4} className="mb-4">
            <CCard style={styles.card}>
              <CCardBody>
                <h3 style={styles.cardTitle}>System Roles</h3>
                <CListGroup style={styles.listGroup}>
                  {roles.map((role) => (
                    <CListGroupItem
                      key={role._id}
                      active={selectedRole && selectedRole._id === role._id}
                      onClick={() => handleSelectRole(role)}
                      style={{
                        ...styles.listItem,
                        ...(selectedRole && selectedRole._id === role._id ? styles.listItemActive : {}),
                      }}
                    >
                      <div style={styles.roleHeader}>
                        <strong>{role.name}</strong>
                      </div>
                      <small style={styles.roleDesc}>{role.description}</small>
                    </CListGroupItem>
                  ))}
                </CListGroup>

                {/* Create Role Form */}
                {canCreateRoles && (
                  <form onSubmit={handleCreateRole} style={styles.createForm}>
                    <h4 style={styles.formTitle}>Create New Role</h4>
                    <CFormInput
                      style={styles.input}
                      placeholder="Role Name (e.g. Moderator)"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="mb-2"
                    />
                    <CFormTextarea
                      style={styles.input}
                      placeholder="Role Description"
                      value={newRoleDesc}
                      onChange={(e) => setNewRoleDesc(e.target.value)}
                      rows={2}
                      className="mb-3"
                    />
                    <CButton type="submit" color="primary" style={styles.createBtn} disabled={!newRoleName.trim()}>
                      Create Role
                    </CButton>
                  </form>
                )}
              </CCardBody>
            </CCard>
          </CCol>

          {/* Permissions Mapper Panel */}
          <CCol lg={8} className="mb-4">
            <CCard style={styles.card}>
              <CCardBody>
                {selectedRole ? (
                  <>
                    <div style={styles.mapperHeader}>
                      <div>
                        <h3 style={styles.cardTitle}>Permission Mapping</h3>
                        <p style={styles.mapperSubtitle}>
                          Mapping permissions for: <strong style={{ color: '#818cf8' }}>{selectedRole.name}</strong>
                        </p>
                      </div>
                      {canUpdateRoles && (
                        <CButton color="success" style={styles.saveBtn} onClick={handleSaveMappings} disabled={saving}>
                          {saving ? <CSpinner size="sm" /> : 'Save Mappings'}
                        </CButton>
                      )}
                    </div>

                    <div style={styles.groupedContainer}>
                      {Object.keys(groupedPermissions).map((featureName) => (
                        <div key={featureName} style={styles.featureBlock}>
                          <h4 style={styles.featureBlockTitle}>
                            Feature: {featureName.toUpperCase()}
                          </h4>
                          <div style={styles.permissionsGrid}>
                            {groupedPermissions[featureName].map((perm) => (
                              <div key={perm._id} style={styles.permCheckWrapper}>
                                <CFormCheck
                                  id={perm._id}
                                  label={`${perm.action} (${perm.name})`}
                                  checked={selectedPermissions.includes(perm._id)}
                                  onChange={() => handleTogglePermission(perm._id)}
                                  disabled={!canUpdateRoles}
                                  style={styles.checkbox}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={styles.noRoleSelected}>Select a role from the left panel to map permissions.</p>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    color: '#f3f4f6',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    background: 'linear-gradient(to right, #f3f4f6, #9ca3af)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  pageSubtitle: {
    color: '#a1a1aa',
    fontSize: '15px',
    marginBottom: '32px',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '60px 0',
  },
  alert: {
    borderRadius: '12px',
    fontSize: '14px',
    marginBottom: '24px',
  },
  card: {
    background: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    color: '#ffffff',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#ffffff',
  },
  listGroup: {
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  listItem: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#e5e7eb',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  listItemActive: {
    background: 'rgba(99, 102, 241, 0.15) !important',
    borderColor: 'rgba(99, 102, 241, 0.4) !important',
    color: '#ffffff !important',
  },
  roleHeader: {
    fontSize: '15px',
    marginBottom: '4px',
  },
  roleDesc: {
    color: '#9ca3af',
    fontSize: '12px',
  },
  createForm: {
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#e5e7eb',
  },
  input: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '14px',
  },
  createBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
    border: 'none',
    fontWeight: '600',
    padding: '10px',
    borderRadius: '8px',
  },
  mapperHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  mapperSubtitle: {
    color: '#9ca3af',
    fontSize: '14px',
    margin: 0,
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    fontWeight: '600',
    padding: '10px 20px',
    borderRadius: '8px',
  },
  groupedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  featureBlock: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '16px',
  },
  featureBlockTitle: {
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '14px',
    color: '#a1a1aa',
    borderLeft: '3px solid #818cf8',
    paddingLeft: '8px',
  },
  permissionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  permCheckWrapper: {
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  checkbox: {
    color: '#ffffff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  noRoleSelected: {
    color: '#9ca3af',
    fontSize: '15px',
    textAlign: 'center',
    padding: '40px 0',
  },
  deniedContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: '#f3f4f6',
  },
  deniedCard: {
    background: 'rgba(239, 68, 68, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '420px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  deniedIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
};

export default RoleBuilderDashboard;
