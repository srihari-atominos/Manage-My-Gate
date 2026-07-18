import React from 'react'
import PropTypes from 'prop-types'
import {
  CCard,
  CCardBody,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CPagination,
  CPaginationItem,
  CSpinner,
} from '@coreui/react'

/**
 * DataTable Component
 *
 * Reusable enterprise data table with:
 * - Card containment (reduced padding)
 * - Sticky headers & vertical scrolling limit
 * - Spaced rows & typography enhancements
 * - Pagination footer & page sizer controls
 */
const DataTable = ({
  columns,
  data,
  toolbar,
  renderRowActions,
  currentPage = 1,
  totalPages = 1,
  rowsPerPage = 10,
  rowsPerPageOptions = [10, 20, 50],
  onPageChange = () => {},
  onRowsPerPageChange = () => {},
  loading = false,
}) => {
  return (
    <CCard className="mb-4 border-0 shadow-sm">
      <CCardBody className="p-3">
        {/* Responsive Toolbar */}
        {toolbar && <div className="d-flex flex-wrap gap-3 align-items-center mb-3">{toolbar}</div>}

        {/* Scrollable Container with sticky header support */}
        <div
          style={{
            maxHeight: '50vh',
            overflowY: 'auto',
            border: '1px solid var(--cui-border-color, #dee2e6)',
            borderRadius: '6px',
          }}
        >
          <CTable className="um-table m-0" hover responsive bordered={false} align="middle">
            <CTableHead>
              <CTableRow align="middle">
                {columns.map((col) => (
                  <CTableHeaderCell
                    key={col.key}
                    className="text-body-secondary bg-body-tertiary border-bottom"
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      paddingTop: '12px',
                      paddingBottom: '12px',
                    }}
                  >
                    {col.label}
                  </CTableHeaderCell>
                ))}
                {renderRowActions && (
                  <CTableHeaderCell
                    className="text-body-secondary bg-body-tertiary border-bottom"
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      paddingTop: '12px',
                      paddingBottom: '12px',
                    }}
                  >
                    Actions
                  </CTableHeaderCell>
                )}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow align="middle">
                  <CTableDataCell
                    colSpan={columns.length + (renderRowActions ? 1 : 0)}
                    className="text-center py-5"
                  >
                    <CSpinner color="primary" size="sm" className="me-2" />
                    <span className="text-body-secondary" style={{ fontSize: '0.9rem' }}>
                      Loading users...
                    </span>
                  </CTableDataCell>
                </CTableRow>
              ) : data.length === 0 ? (
                <CTableRow align="middle">
                  <CTableDataCell
                    colSpan={columns.length + (renderRowActions ? 1 : 0)}
                    className="text-center text-muted py-5"
                    style={{ fontSize: '0.9rem' }}
                  >
                    No records found.
                  </CTableDataCell>
                </CTableRow>
              ) : (
                data.map((row, index) => (
                  <CTableRow key={row.id || index} align="middle">
                    {columns.map((col) => (
                      <CTableDataCell
                        key={col.key}
                        style={{
                          fontSize: '0.9rem',
                          paddingTop: '12px',
                          paddingBottom: '12px',
                        }}
                      >
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </CTableDataCell>
                    ))}
                    {renderRowActions && (
                      <CTableDataCell
                        style={{
                          fontSize: '0.9rem',
                          paddingTop: '12px',
                          paddingBottom: '12px',
                        }}
                      >
                        {renderRowActions(row)}
                      </CTableDataCell>
                    )}
                  </CTableRow>
                ))
              )}
            </CTableBody>
          </CTable>
        </div>

        {/* Pagination & Sizer Footer */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-3 pt-2 border-top">
          {/* Left: Rows Per Page Sizer */}
          <div className="d-flex align-items-center gap-2">
            <span className="datatable-sizer-text">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
              className="form-select form-select-sm datatable-sizer-select"
            >
              {rowsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Pagination Navigation */}
          {totalPages >= 1 && (
            <CPagination className="mb-0" size="sm" aria-label="Page navigation">
              <CPaginationItem
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className={`datatable-page-item ${currentPage === 1 ? 'disabled' : ''}`}
              >
                Previous
              </CPaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <CPaginationItem
                  key={page}
                  active={page === currentPage}
                  onClick={() => onPageChange(page)}
                  className="datatable-page-item"
                >
                  {page}
                </CPaginationItem>
              ))}
              <CPaginationItem
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className={`datatable-page-item ${currentPage === totalPages ? 'disabled' : ''}`}
              >
                Next
              </CPaginationItem>
            </CPagination>
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      render: PropTypes.func,
    }),
  ).isRequired,
  data: PropTypes.array.isRequired,
  toolbar: PropTypes.node,
  renderRowActions: PropTypes.func,
  currentPage: PropTypes.number,
  totalPages: PropTypes.number,
  rowsPerPage: PropTypes.number,
  rowsPerPageOptions: PropTypes.arrayOf(PropTypes.number),
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  loading: PropTypes.bool,
}

export default DataTable
