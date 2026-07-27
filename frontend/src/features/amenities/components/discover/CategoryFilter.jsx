import React, { memo } from 'react'
import { CButton } from '@coreui/react'

const CategoryFilter = memo(({ categories, selectedCategory, onSelect }) => {
  return (
    <div
      className="d-flex gap-2 flex-wrap mb-4 pb-2"
      style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {categories.map((cat) => (
        <CButton
          key={cat}
          color={selectedCategory === cat ? 'primary' : 'light'}
          variant={selectedCategory === cat ? '' : 'outline'}
          shape="rounded-pill"
          onClick={() => onSelect(cat)}
          className="px-4 fw-semibold"
          style={{ whiteSpace: 'nowrap' }}
          aria-pressed={selectedCategory === cat}
        >
          {cat}
        </CButton>
      ))}
    </div>
  )
})

export default CategoryFilter
