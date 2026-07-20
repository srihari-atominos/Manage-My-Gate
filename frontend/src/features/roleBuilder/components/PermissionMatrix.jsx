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

const getCategoryDisplayName = (category) => {
  const map = {
    visitor: 'Visitor Management',
    amenities: 'Amenities & Bookings',
    villas: 'Unit Management',
    users: 'User Management',
    notices: 'Notices Board',
    integrations: 'Integrations Hub',
    complaints: 'Complaints/Maintenance'
  }
  const key = category.toLowerCase()
  return map[key] || (category.charAt(0).toUpperCase() + category.slice(1))
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
        let perms = groupedPermissions[category] || []
        
        // Filter complaints permissions as requested
        if (category.toLowerCase() === 'complaints') {
          const allowedComplaintsPerms = ['dashboard', 'raise_ticket', 'complaint_management', 'staff_vendors', 'assignee', 'track_requests', 'staff'];
          perms = perms.filter(p => {
            const permName = p.name || p.code || p._id || '';
            const action = permName.includes(':') ? permName.split(':')[1] : permName;
            return allowedComplaintsPerms.includes(action.toLowerCase());
          });
        }
        
        const groupCodes = perms.map((p) => p.name || p.code || p._id)
        const isAllGroupSelected = groupCodes.length > 0 && groupCodes.every((code) => selectedIds.includes(code))
        
        // Enforce single visual selection for visitor radios if backend synced multiple
        let firstSelectedVisitorPerm = null
        if (category.toLowerCase() === 'visitor') {
          const selected = perms.find((p) => selectedIds.includes(p.name || p.code || p._id))
          if (selected) {
            firstSelectedVisitorPerm = selected.name || selected.code || selected._id
          }
        }

        return (
          <div key={category} className="permission-category-card">
            <div className="permission-card-header">
              <h6 className="permission-card-title">
                {getCategoryDisplayName(category)} Permissions
              </h6>
              {category.toLowerCase() !== 'visitor' && (
                <CFormCheck
                  id={`select-all-${category}`}
                  label="Select All"
                  checked={isAllGroupSelected}
                  onChange={(e) => onSelectAllGroup(groupCodes, e.target.checked)}
                  className="permission-select-all-check"
                />
              )}
            </div>
            
            <CRow className="g-2">
              {perms.map((perm) => {
                const permValue = perm.name || perm.code || perm._id
                const idSafe = String(permValue).replace(/:/g, '-')
                let isChecked = selectedIds.includes(permValue)
                
                if (category.toLowerCase() === 'visitor') {
                  isChecked = permValue === firstSelectedVisitorPerm
                }

                return (
                  <CCol xs={12} md={6} key={permValue}>
                    <CFormCheck
                      type={category.toLowerCase() === 'visitor' ? 'radio' : 'checkbox'}
                      id={`perm-check-${idSafe}`}
                      label={formatPermissionLabel(perm.name || String(permValue))}
                      checked={isChecked}
                      onChange={(e) => onTogglePermission(permValue, e.target.checked)}
                      onClick={(e) => {
                        // Allow deselecting radio button by clicking it again
                        if (category.toLowerCase() === 'visitor' && isChecked) {
                          // Prevent default to stop native radio behavior
                          e.preventDefault()
                          onTogglePermission(permValue, false)
                        }
                      }}
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
