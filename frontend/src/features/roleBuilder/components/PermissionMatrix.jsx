import React from 'react'
import PropTypes from 'prop-types'
import { CFormCheck, CRow, CCol } from '@coreui/react'

const formatPermissionLabel = (permissionString) => {
  if (!permissionString) return ''
  let label = permissionString
  if (label.includes(':')) {
    const parts = label.split(':')
    label = parts[parts.length - 1]
  }
  label = label.replace(/_/g, ' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const PermissionMatrix = ({ groupedPermissions, selectedIds, onSelectAllGroup, onTogglePermission }) => {
  if (!groupedPermissions || Object.keys(groupedPermissions).length === 0) {
    return (
      <div className="text-center text-body-secondary py-3 small">
        No permissions found in the system.
      </div>
    )
  }

  return (
    <div className="d-flex flex-column gap-3">
      {Object.keys(groupedPermissions).map((category) => {
        const perms = groupedPermissions[category] || []
        const groupCodes = perms.map((p) => p.name || p.code || p._id)
        const isAllGroupSelected = groupCodes.length > 0 && groupCodes.every((code) => selectedIds.includes(code))

        return (
          <div 
            key={category} 
            style={{
              background: 'var(--surface-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderBottom: '1px solid var(--border-light)', 
                paddingBottom: '16px', 
                marginBottom: '16px' 
              }}
            >
              <h6 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                {category.toLowerCase() === 'amenities' ? 'Amenities & Bookings' : category.charAt(0).toUpperCase() + category.slice(1)} Permissions
              </h6>
              <CFormCheck
                id={`select-all-${category}`}
                label="Select All"
                checked={isAllGroupSelected}
                onChange={(e) => onSelectAllGroup(groupCodes, e.target.checked)}
                style={{ fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}
              />
            </div>
            
            <CRow className="g-2">
              {perms.map((perm) => {
                const permValue = perm.name || perm.code || perm._id
                const idSafe = String(permValue).replace(/:/g, '-')
                const isChecked = selectedIds.includes(permValue)

                return (
                  <CCol xs={12} md={6} key={permValue}>
                    <CFormCheck
                      id={`perm-check-${idSafe}`}
                      label={formatPermissionLabel(perm.name || String(permValue))}
                      checked={isChecked}
                      onChange={(e) => onTogglePermission(permValue, e.target.checked)}
                    />
                  </CCol>
                )
              })}
            </CRow>
          </div>
        )
      })}
    </div>
  )
}

PermissionMatrix.propTypes = {
  groupedPermissions: PropTypes.object.isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelectAllGroup: PropTypes.func.isRequired,
  onTogglePermission: PropTypes.func.isRequired,
}

export default PermissionMatrix
