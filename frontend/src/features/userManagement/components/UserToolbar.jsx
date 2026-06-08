import React from 'react'
import PropTypes from 'prop-types'
import { CFormInput } from '@coreui/react'

// Import generic filter component
import MultiSelectFilter from '../../../components/common/MultiSelectFilter'

/**
 * UserToolbar Component
 * 
 * Handles search input and multiselect dropdown filters for roles and statuses.
 * Enforces one-component-per-file and consumes the generic `<MultiSelectFilter>` component.
 */
const UserToolbar = ({
  search,
  setSearch,
  selectedRoles,
  handleRoleToggle,
  setSelectedRoles,
  statusFilter,
  handleStatusToggle,
  ROLES,
  STATUS_OPTIONS,
}) => {
  return (
    <>
      {/* Search Bar - Responsive width */}
      <div className="flex-grow-1 flex-md-grow-0" style={{ minWidth: 'min(350px, 100%)', maxWidth: '500px' }}>
        <CFormInput
          id="um-search-input"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="sm"
          className="w-100"
        />
      </div>

      {/* Filter Options */}
      <div className="d-flex flex-wrap gap-2 align-items-center">
        {/* Role Filter */}
        <MultiSelectFilter
          label="Role"
          options={ROLES}
          selectedValues={selectedRoles}
          onToggle={handleRoleToggle}
          onClear={() => setSelectedRoles([])}
        />

        {/* Status Filter */}
        <MultiSelectFilter
          label="Status"
          options={STATUS_OPTIONS}
          selectedValues={statusFilter}
          onToggle={handleStatusToggle}
        />
      </div>
    </>
  )
}

UserToolbar.propTypes = {
  search: PropTypes.string.isRequired,
  setSearch: PropTypes.func.isRequired,
  selectedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  handleRoleToggle: PropTypes.func.isRequired,
  setSelectedRoles: PropTypes.func.isRequired,
  statusFilter: PropTypes.arrayOf(PropTypes.string).isRequired,
  handleStatusToggle: PropTypes.func.isRequired,
  ROLES: PropTypes.arrayOf(PropTypes.string).isRequired,
  STATUS_OPTIONS: PropTypes.arrayOf(PropTypes.string).isRequired,
}

export default UserToolbar
