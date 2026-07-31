import React from 'react'
import PropTypes from 'prop-types'
import {
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CFormCheck,
  CBadge,
} from '@coreui/react'

/**
 * MultiSelectFilter Component
 *
 * Reusable generic dropdown filter rendering checkbox options.
 * Integrates standard CoreUI secondary outlines, count badges, and clear actions.
 */
const MultiSelectFilter = ({ label, options, selectedValues, onToggle, onClear }) => {
  return (
    <CDropdown>
      <CDropdownToggle
        color="secondary"
        variant="outline"
        size="sm"
        caret
        style={{ fontSize: '0.8rem', minWidth: '120px' }}
      >
        {label}
        {selectedValues.length > 0 && (
          <CBadge color="secondary" shape="rounded-pill" className="ms-2">
            {selectedValues.length}
          </CBadge>
        )}
      </CDropdownToggle>
      <CDropdownMenu style={{ minWidth: '180px' }}>
        {options.map((opt) => (
          <CDropdownItem
            key={opt}
            as="label"
            htmlFor={`filter-${label.toLowerCase()}-${opt.replace(/\s+/g, '-').toLowerCase()}`}
            style={{ cursor: 'pointer', fontSize: '0.85rem' }}
          >
            <CFormCheck
              id={`filter-${label.toLowerCase()}-${opt.replace(/\s+/g, '-').toLowerCase()}`}
              label={opt}
              checked={selectedValues.includes(opt)}
              onChange={() => onToggle(opt)}
              style={{ pointerEvents: 'none' }}
            />
          </CDropdownItem>
        ))}
        {onClear && selectedValues.length > 0 && (
          <>
            <div className="dropdown-divider" />
            <CDropdownItem
              onClick={onClear}
              style={{ fontSize: '0.8rem', color: 'var(--cui-danger)', cursor: 'pointer' }}
            >
              Clear filter
            </CDropdownItem>
          </>
        )}
      </CDropdownMenu>
    </CDropdown>
  )
}

MultiSelectFilter.propTypes = {
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedValues: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func.isRequired,
  onClear: PropTypes.func,
}

export default MultiSelectFilter
