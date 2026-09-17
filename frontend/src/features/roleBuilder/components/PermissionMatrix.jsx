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
    billing: 'Billing & Invoices',
    villas: 'Unit Management',
    users: 'User Management',
    notices: 'Notices Board',
    integrations: 'Integrations Hub',
    complaints: 'Complaints/Maintenance',
  }
  const key = category.toLowerCase()
  return map[key] || category.charAt(0).toUpperCase() + category.slice(1)
}

const AMENITY_TIERS = [
  {
    id: 'resident',
    label: 'Resident',
    description: 'Discovery catalog, booking wizard, wallet & personal passes',
  },
  {
    id: 'security_guard',
    label: 'Security Guard',
    description: 'Gate QR scanner terminal & entry security logs',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Facility master, calendar, maintenance, ledgers, settings & dashboard',
  },
  {
    id: 'none',
    label: 'None',
    description: 'No access to amenity facilities or bookings',
  },
]

const PermissionMatrix = ({
  groupedPermissions,
  selectedIds,
  activeAmenityTier = 'none',
  onSelectAllGroup,
  onTogglePermission,
}) => {
  const [internalTier, setInternalTier] = React.useState('none')
  const currentAmenityTier = activeAmenityTier || internalTier

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
        const isAmenities = category.toLowerCase() === 'amenities'
        const isVisitor = category.toLowerCase() === 'visitor'

        // Filter complaints permissions as requested
        if (category.toLowerCase() === 'complaints') {
          const allowedComplaintsPerms = [
            'dashboard',
            'raise_ticket',
            'complaint_management',
            'staff_vendors',
            'assignee',
            'track_requests',
            'staff',
          ]
          perms = perms.filter((p) => {
            const permName = p.name || p.code || p._id || ''
            const action = permName.includes(':') ? permName.split(':')[1] : permName
            return allowedComplaintsPerms.includes(action.toLowerCase())
          })
        }

        const groupCodes = perms.map((p) => p.name || p.code || p._id)
        const isAllGroupSelected =
          groupCodes.length > 0 && groupCodes.every((code) => selectedIds.includes(code))

        // Enforce single visual selection for visitor radios if backend synced multiple
        let firstSelectedVisitorPerm = null
        if (isVisitor) {
          const selected = perms.find((p) => selectedIds.includes(p.name || p.code || p._id))
          if (selected) {
            firstSelectedVisitorPerm = selected.name || selected.code || selected._id
          }
        }

        const activeAmenityTier = isAmenities ? currentAmenityTier : null

        return (
          <div key={category} className="permission-category-card">
            <div className="permission-card-header">
              <h6 className="permission-card-title">
                {getCategoryDisplayName(category)} Permissions
              </h6>
              {!isVisitor && !isAmenities && (
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
              {isAmenities ? (
                AMENITY_TIERS.map((tier) => {
                  const isChecked = activeAmenityTier === tier.id
                  return (
                    <CCol xs={12} md={6} key={tier.id}>
                      <div
                        className={`p-2 rounded-2 border ${
                          isChecked ? 'border-primary bg-primary-subtle' : 'border-light-subtle bg-body'
                        }`}
                        style={{ cursor: 'pointer', minHeight: '62px' }}
                        onClick={() => {
                          setInternalTier(tier.id)
                          onTogglePermission(`amenities_tier:${tier.id}`, true)
                        }}
                      >
                        <div className="form-check m-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="amenities-role-tier-group"
                            id={`amenities-tier-${tier.id}`}
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <label
                            className="form-check-label fw-semibold text-body"
                            htmlFor={`amenities-tier-${tier.id}`}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            {tier.label}
                          </label>
                          <div
                            className="text-body-secondary small mt-1"
                            style={{ fontSize: '11px', lineHeight: '1.25', userSelect: 'none' }}
                          >
                            {tier.description}
                          </div>
                        </div>
                      </div>
                    </CCol>
                  )
                })
              ) : (
                perms.map((perm) => {
                  const permValue = perm.name || perm.code || perm._id
                  const idSafe = String(permValue).replace(/:/g, '-')

                  let isChecked = selectedIds.includes(permValue)
                  if (isVisitor) {
                    isChecked = permValue === firstSelectedVisitorPerm
                  }

                  return (
                    <CCol xs={12} md={6} key={permValue}>
                      {isVisitor ? (
                        // Use native radio input for visitor permissions to bypass CoreUI CFormCheck
                        // aria-hidden focus blocking issues inside CModal
                        <div className="form-check" style={{ cursor: 'pointer' }}>
                          <input
                            className="form-check-input"
                            type="radio"
                            name="visitor-permission-group-native"
                            id={`perm-check-${idSafe}`}
                            checked={isChecked}
                            // Allow deselecting radio button by clicking it again
                            onClick={(e) => {
                              if (isChecked) {
                                e.preventDefault()
                                onTogglePermission(permValue, false)
                              } else {
                                onTogglePermission(permValue, true)
                              }
                            }}
                            onChange={() => {}} // controlled: suppress React warning, logic is in onClick
                            style={{ cursor: 'pointer' }}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`perm-check-${idSafe}`}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            {formatPermissionLabel(perm.name || String(permValue))}
                          </label>
                        </div>
                      ) : (
                        <CFormCheck
                          type="checkbox"
                          id={`perm-check-${idSafe}`}
                          label={formatPermissionLabel(perm.name || String(permValue))}
                          checked={isChecked}
                          onChange={(e) => onTogglePermission(permValue, e.target.checked)}
                        />
                      )}
                    </CCol>
                  )
                })
              )}
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
  activeAmenityTier: PropTypes.string,
  onSelectAllGroup: PropTypes.func.isRequired,
  onTogglePermission: PropTypes.func.isRequired,
}

export default PermissionMatrix
