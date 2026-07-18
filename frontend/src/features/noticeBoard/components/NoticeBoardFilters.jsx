import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { CFormInput, CFormSelect, CButton, CInputGroup } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch } from '@coreui/icons'
import { CATEGORIES, PRIORITIES, STATUSES } from '../store/noticeBoardSlice.js'
import { useTranslation } from 'react-i18next'

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'oldest', label: 'Oldest First', sortBy: 'createdAt', sortOrder: 'asc' },
  { value: 'priority', label: 'Highest Priority', sortBy: 'priorityOrder', sortOrder: 'desc' },
  { value: 'title_asc', label: 'Title (A-Z)', sortBy: 'title', sortOrder: 'asc' },
  { value: 'title_desc', label: 'Title (Z-A)', sortBy: 'title', sortOrder: 'desc' },
]

/**
 * NoticeBoardFilters Component
 * Combines search input, category, priority, status filters, and sorting controls in a horizontal flex bar.
 */
export const NoticeBoardFilters = ({
  search,
  filters,
  sort,
  onSearchChange,
  onFiltersChange,
  onReset,
  hideStatusFilter = false,
  showNoticeTypeFilter = false,
}) => {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState(search)

  // Sync internal search state with external search value
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchTerm(search)
  }, [search])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    onSearchChange(searchTerm)
  }

  const handleSearchInput = (e) => {
    setSearchTerm(e.target.value)
    if (e.target.value === '') {
      onSearchChange('')
    }
  }

  const handleFilterChange = (key, value) => {
    onFiltersChange({ [key]: value })
  }

  const handleSortSelect = (e) => {
    const selected = SORT_OPTIONS.find((opt) => opt.value === e.target.value)
    if (selected) {
      onFiltersChange({ sortBy: selected.sortBy, sortOrder: selected.sortOrder })
    }
  }

  // Find active sorting option key
  const activeSortOption =
    SORT_OPTIONS.find((opt) => opt.sortBy === sort.sortBy && opt.sortOrder === sort.sortOrder)
      ?.value || 'newest'

  return (
    <div className="notice-filter-bar mb-3">
      {/* Search Input */}
      <div className="flex-grow-1" style={{ minWidth: '180px', maxWidth: '300px' }}>
        <form onSubmit={handleSearchSubmit}>
          <CInputGroup size="sm" className="notice-search-group">
            <span className="input-group-text bg-body-secondary text-muted">
              <CIcon icon={cilSearch} size="sm" />
            </span>
            <CFormInput
              type="text"
              placeholder={t('noticeBoard.searchPlaceholder', 'Search Notices')}
              value={searchTerm}
              onChange={handleSearchInput}
              className="bg-body-secondary ps-0"
            />
          </CInputGroup>
        </form>
      </div>

      {/* Category Dropdown */}
      <div style={{ minWidth: '130px' }}>
        <CFormSelect
          size="sm"
          value={filters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="form-select bg-body-secondary"
        >
          <option value="">{t('noticeBoard.filters.allCategories', 'All Categories')}</option>
          {Object.values(CATEGORIES).map((cat) => (
            <option key={cat} value={cat}>
              {t(`noticeBoard.categories.${cat}`, cat)}
            </option>
          ))}
        </CFormSelect>
      </div>

      {/* Priority Dropdown */}
      <div style={{ minWidth: '130px' }}>
        <CFormSelect
          size="sm"
          value={filters.priority || ''}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="form-select bg-body-secondary"
        >
          <option value="">{t('noticeBoard.filters.allPriorities', 'All Priorities')}</option>
          {Object.values(PRIORITIES).map((pri) => (
            <option key={pri} value={pri}>
              {t(`noticeBoard.priorities.${pri}`, pri)}
            </option>
          ))}
        </CFormSelect>
      </div>

      {/* Sort Dropdown ("Newest First") */}
      <div style={{ minWidth: '130px' }}>
        <CFormSelect
          size="sm"
          value={activeSortOption}
          onChange={handleSortSelect}
          className="form-select bg-body-secondary"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(`noticeBoard.sort.${opt.value}`, opt.label)}
            </option>
          ))}
        </CFormSelect>
      </div>

      {/* Notice Type Dropdown (All Notices / Unread / Bookmarks) */}
      {showNoticeTypeFilter && (
        <div style={{ minWidth: '130px' }}>
          <CFormSelect
            size="sm"
            value={
              filters.isBookmarked === 'true' || filters.isBookmarked === true
                ? 'Bookmarks'
                : filters.readStatus === 'Unread'
                  ? 'Unread'
                  : 'All'
            }
            onChange={(e) => {
              const val = e.target.value
              if (val === 'Bookmarks') {
                onFiltersChange({ isBookmarked: 'true', readStatus: '' })
              } else if (val === 'Unread') {
                onFiltersChange({ readStatus: 'Unread', isBookmarked: '' })
              } else {
                onFiltersChange({ readStatus: '', isBookmarked: '' })
              }
            }}
            className="form-select bg-body-secondary"
          >
            <option value="All">{t('noticeBoard.tabs.allNotices', 'All Notices')}</option>
            <option value="Unread">{t('noticeBoard.tabs.unread', 'Unread')}</option>
            <option value="Bookmarks">{t('noticeBoard.tabs.bookmarked', 'Bookmarks')}</option>
          </CFormSelect>
        </div>
      )}

      {/* Status Dropdown (Admin only) */}
      {!hideStatusFilter && (
        <div style={{ minWidth: '130px' }}>
          <CFormSelect
            size="sm"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="form-select bg-body-secondary"
          >
            <option value="">{t('noticeBoard.filters.allStatuses', 'All Statuses')}</option>
            {Object.values(STATUSES).map((st) => (
              <option key={st} value={st}>
                {t(`noticeBoard.statuses.${st}`, st)}
              </option>
            ))}
          </CFormSelect>
        </div>
      )}

      {/* Reset Button */}
      <div className="ms-sm-auto" style={{ minWidth: '80px' }}>
        <CButton
          color="secondary"
          size="sm"
          variant="outline"
          className="w-100 btn-reset-filter"
          onClick={onReset}
        >
          {t('noticeBoard.filters.reset', 'Reset')}
        </CButton>
      </div>
    </div>
  )
}

NoticeBoardFilters.propTypes = {
  search: PropTypes.string.isRequired,
  filters: PropTypes.object.isRequired,
  sort: PropTypes.object.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onFiltersChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  hideStatusFilter: PropTypes.bool,
  showNoticeTypeFilter: PropTypes.bool,
}

export default NoticeBoardFilters
