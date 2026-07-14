import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody } from '@coreui/react'

/**
 * LoadingSkeleton Component
 * Renders pulse animations imitating vertically stacked notice cards during load transitions.
 */
export const LoadingSkeleton = ({ count = 3 }) => {
  const skeletons = Array.from({ length: count })

  return (
    <div className="notice-loading-skeleton d-flex flex-column gap-3">
      {skeletons.map((_, idx) => (
        <CCard
          key={idx}
          className="border-0 shadow-sm notice-skeleton-card position-relative overflow-hidden"
          style={{ borderRadius: '16px', minHeight: '160px' }}
        >
          <CCardBody className="p-4 d-flex flex-column skeleton-pulse">
            {/* Header Badges Placeholder */}
            <div className="d-flex gap-2 mb-3">
              <div
                className="skeleton-line bg-secondary opacity-25 rounded"
                style={{ width: '80px', height: '18px' }}
              />
              <div
                className="skeleton-line bg-secondary opacity-25 rounded"
                style={{ width: '60px', height: '18px' }}
              />
              <div
                className="skeleton-line bg-secondary opacity-25 rounded ms-auto"
                style={{ width: '50px', height: '18px' }}
              />
            </div>

            {/* Title Placeholder */}
            <div
              className="skeleton-line bg-secondary opacity-25 rounded mb-2"
              style={{ width: '70%', height: '22px' }}
            />

            {/* Description lines */}
            <div
              className="skeleton-line bg-secondary opacity-25 rounded mb-2"
              style={{ width: '100%', height: '14px' }}
            />
            <div
              className="skeleton-line bg-secondary opacity-25 rounded mb-4"
              style={{ width: '90%', height: '14px' }}
            />

            {/* Footer Metadata & Actions */}
            <div className="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
              <div
                className="skeleton-line bg-secondary opacity-25 rounded"
                style={{ width: '150px', height: '14px' }}
              />
              <div
                className="skeleton-line bg-secondary opacity-25 rounded"
                style={{ width: '65px', height: '26px' }}
              />
            </div>
          </CCardBody>
        </CCard>
      ))}
    </div>
  )
}

LoadingSkeleton.propTypes = {
  count: PropTypes.number,
}

export default LoadingSkeleton
