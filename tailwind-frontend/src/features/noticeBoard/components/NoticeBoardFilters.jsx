import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Search } from 'lucide-react'
import { CATEGORIES, PRIORITIES, STATUSES } from '../store/noticeBoardSlice.js'
import { useTranslation } from 'react-i18next'
import { Input } from 'src/components/ui/input'
import { Button } from 'src/components/ui/button'

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'oldest', label: 'Oldest First', sortBy: 'createdAt', sortOrder: 'asc' },
  { value: 'priority', label: 'Highest Priority', sortBy: 'priorityOrder', sortOrder: 'desc' },
  { value: 'title_asc', label: 'Title (A-Z)', sortBy: 'title', sortOrder: 'asc' },
  { value: 'title_desc', label: 'Title (Z-A)', sortBy: 'title', sortOrder: 'desc' },
]

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
    <div className="bg-white dark:bg-boxdark rounded-lg p-4 shadow-default mb-4 flex flex-wrap items-center gap-3">
      {/* Search Input */}
      <div className="flex-1 min-w-[200px] max-w-xs relative">
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Input
              type="text"
              placeholder={t('noticeBoard.searchPlaceholder', 'Search Notices')}
              value={searchTerm}
              onChange={handleSearchInput}
              className="text-xs bg-slate-50 dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white pr-8 py-2"
            />
            <Search className="absolute right-2.5 top-2.5 h-4.5 w-4.5 text-gray-400" />
          </div>
        </form>
      </div>

      {/* Category Dropdown */}
      <div className="min-w-[130px]">
        <select
          value={filters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="w-full rounded border border-stroke bg-slate-50 py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
        >
          <option value="" className="bg-white dark:bg-boxdark">{t('noticeBoard.filters.allCategories', 'All Categories')}</option>
          {Object.values(CATEGORIES).map((cat) => (
            <option key={cat} value={cat} className="bg-white dark:bg-boxdark">
              {t(`noticeBoard.categories.${cat}`, cat)}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Dropdown */}
      <div className="min-w-[130px]">
        <select
          value={filters.priority || ''}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="w-full rounded border border-stroke bg-slate-50 py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
        >
          <option value="" className="bg-white dark:bg-boxdark">{t('noticeBoard.filters.allPriorities', 'All Priorities')}</option>
          {Object.values(PRIORITIES).map((pri) => (
            <option key={pri} value={pri} className="bg-white dark:bg-boxdark">
              {t(`noticeBoard.priorities.${pri}`, pri)}
            </option>
          ))}
        </select>
      </div>

      {/* Sort Dropdown */}
      <div className="min-w-[130px]">
        <select
          value={activeSortOption}
          onChange={handleSortSelect}
          className="w-full rounded border border-stroke bg-slate-50 py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white dark:bg-boxdark">
              {t(`noticeBoard.sort.${opt.value}`, opt.label)}
            </option>
          ))}
        </select>
      </div>

      {/* Notice Type Dropdown */}
      {showNoticeTypeFilter && (
        <div className="min-w-[130px]">
          <select
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
            className="w-full rounded border border-stroke bg-slate-50 py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
          >
            <option value="All" className="bg-white dark:bg-boxdark">{t('noticeBoard.tabs.allNotices', 'All Notices')}</option>
            <option value="Unread" className="bg-white dark:bg-boxdark">{t('noticeBoard.tabs.unread', 'Unread')}</option>
            <option value="Bookmarks" className="bg-white dark:bg-boxdark">{t('noticeBoard.tabs.bookmarked', 'Bookmarks')}</option>
          </select>
        </div>
      )}

      {/* Status Dropdown (Admin only) */}
      {!hideStatusFilter && (
        <div className="min-w-[130px]">
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full rounded border border-stroke bg-slate-50 py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
          >
            <option value="" className="bg-white dark:bg-boxdark">{t('noticeBoard.filters.allStatuses', 'All Statuses')}</option>
            {Object.values(STATUSES).map((st) => (
              <option key={st} value={st} className="bg-white dark:bg-boxdark">
                {t(`noticeBoard.statuses.${st}`, st)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Reset Button */}
      <div className="sm:ml-auto min-w-[80px]">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
          onClick={onReset}
        >
          {t('noticeBoard.filters.reset', 'Reset')}
        </Button>
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
