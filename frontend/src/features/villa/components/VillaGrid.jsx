import React from 'react'
import PropTypes from 'prop-types'
import VillaCard from './VillaCard'

/**
 * Purely visual Grid component displaying Villa cards.
 */
export const VillaGrid = ({ villas, onCardClick }) => {
  return (
    <div className="villa-grid">
      {villas.map((villa) => (
        <VillaCard key={villa._id} villa={villa} onClick={onCardClick} />
      ))}
    </div>
  )
}

VillaGrid.propTypes = {
  villas: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      unitNumber: PropTypes.string.isRequired,
      blockOrBuilding: PropTypes.string,
      type: PropTypes.string,
      status: PropTypes.string,
      primaryResidentId: PropTypes.string,
    }),
  ).isRequired,
  onCardClick: PropTypes.func.isRequired,
}

export default VillaGrid
