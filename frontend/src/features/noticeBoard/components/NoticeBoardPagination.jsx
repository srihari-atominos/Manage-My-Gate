import React from 'react'
import PropTypes from 'prop-types'
import { CPagination, CPaginationItem } from '@coreui/react'
import { useTranslation } from 'react-i18next'

/**
 * NoticeBoardPagination Component
 * Renders standard page navigation buttons.
 */
export const NoticeBoardPagination = ({ pagination, onPageChange, onNext, onPrevious }) => {
  const { t } = useTranslation()
  const { currentPage, totalPages, totalRecords, limit } = pagination

  if (totalPages <= 1) {
    return null
  }

  // Generate page numbers array
  const pageNumbers = []
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i)
  }

  return (
    <div className="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-3 notice-pagination-bar">
      <div className="text-secondary small">
        {t('noticeBoard.pagination.info', {
          start: (currentPage - 1) * limit + 1,
          end: Math.min(currentPage * limit, totalRecords),
          total: totalRecords,
          defaultValue: 'Showing {{start}} to {{end}} of {{total}} notices',
        })}
      </div>

      <CPagination className="mb-0" size="sm" aria-label="Notice pagination">
        {/* Previous page item */}
        <CPaginationItem
          aria-label="Previous"
          disabled={currentPage === 1}
          onClick={onPrevious}
          style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
        >
          <span aria-hidden="true">&laquo;</span>
        </CPaginationItem>

        {/* Numeric page items */}
        {pageNumbers.map((num) => (
          <CPaginationItem
            key={num}
            active={num === currentPage}
            onClick={() => onPageChange(num)}
            style={{ cursor: 'pointer' }}
          >
            {num}
          </CPaginationItem>
        ))}

        {/* Next page item */}
        <CPaginationItem
          aria-label="Next"
          disabled={currentPage === totalPages}
          onClick={onNext}
          style={{ cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
        >
          <span aria-hidden="true">&raquo;</span>
        </CPaginationItem>
      </CPagination>
    </div>
  )
}

NoticeBoardPagination.propTypes = {
  pagination: PropTypes.shape({
    currentPage: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    totalRecords: PropTypes.number.isRequired,
    limit: PropTypes.number.isRequired,
  }).isRequired,
  onPageChange: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onPrevious: PropTypes.func.isRequired,
}

export default NoticeBoardPagination
