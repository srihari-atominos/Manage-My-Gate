import React from 'react'
import PropTypes from 'prop-types'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from 'src/components/ui/button'
import { useTranslation } from 'react-i18next'

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
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-stroke dark:border-strokedark">
      <div className="text-gray-400 dark:text-gray-500 text-xs font-semibold">
        {t('noticeBoard.pagination.info', {
          start: (currentPage - 1) * limit + 1,
          end: Math.min(currentPage * limit, totalRecords),
          total: totalRecords,
          defaultValue: 'Showing {{start}} to {{end}} of {{total}} notices',
        })}
      </div>

      <div className="flex items-center gap-1">
        {/* Previous page item */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={onPrevious}
          className="text-xs font-semibold h-8 w-8 p-0 border-stroke dark:border-strokedark text-black dark:text-white"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Numeric page items */}
        {pageNumbers.map((num) => (
          <Button
            key={num}
            variant={num === currentPage ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(num)}
            className={`text-xs font-semibold h-8 w-8 p-0 ${
              num === currentPage 
                ? 'bg-primary text-white border-0' 
                : 'border-stroke dark:border-strokedark text-black dark:text-white'
            }`}
          >
            {num}
          </Button>
        ))}

        {/* Next page item */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={onNext}
          className="text-xs font-semibold h-8 w-8 p-0 border-stroke dark:border-strokedark text-black dark:text-white"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
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
