import React from 'react';
import PropTypes from 'prop-types';
import { CCard, CCardBody } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPhone, cilHome } from '@coreui/icons';

/**
 * VillaCard Component
 * Displays a single unit card in the community manager grid.
 */
export const VillaCard = ({ villa, onClick }) => {
  const getOccupancyClass = (status) => {
    switch (status) {
      case 'Owner Occupied':
        return 'state-owner';
      case 'Tenant Occupied':
        return 'state-tenant';
      default:
        return 'state-vacant';
    }
  };

  return (
    <CCard 
      className={`villa-card h-100 ${getOccupancyClass(villa.occupancyStatus)}`}
      onClick={() => onClick(villa)}
    >
      <div className="villa-card-header">
        <div className="d-flex flex-column">
          <span className="villa-number">{villa.villaNumber}</span>
          {villa.block && <span className="villa-block mt-1 align-self-start">{villa.block}</span>}
        </div>
        <span className="villa-badge">
          {villa.occupancyStatus}
        </span>
      </div>
      <CCardBody className="villa-card-body d-flex flex-column justify-content-end">
        <div className="villa-meta-item">
          <CIcon icon={cilHome} className="meta-icon" />
          <span>{villa.configuration || 'Not Configured'}</span>
        </div>
        {villa.intercom && (
          <div className="villa-meta-item">
            <CIcon icon={cilPhone} className="meta-icon" />
            <span>Intercom: {villa.intercom}</span>
          </div>
        )}
      </CCardBody>
    </CCard>
  );
};

VillaCard.propTypes = {
  villa: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    villaNumber: PropTypes.string.isRequired,
    block: PropTypes.string,
    intercom: PropTypes.string,
    configuration: PropTypes.string,
    occupancyStatus: PropTypes.string.isRequired,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default VillaCard;
