import React from 'react';
import PropTypes from 'prop-types';
import { CCard, CCardBody } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilHome } from '@coreui/icons';
import { useTranslation } from 'react-i18next';

/**
 * VillaCard Component
 * Displays a single unit card in the community manager grid.
 */
export const VillaCard = ({ villa, onClick }) => {
  const { t } = useTranslation();

  const getOccupancyClass = (status) => {
    switch (status) {
      case 'Occupied':
        return 'state-owner';
      case 'Under Maintenance':
        return 'state-tenant';
      default:
        return 'state-vacant';
    }
  };

  return (
    <CCard 
      className={`villa-card h-100 ${getOccupancyClass(villa.status)}`}
      onClick={() => onClick(villa)}
      style={{ cursor: 'pointer' }}
    >
      <div className="villa-card-header">
        <div className="d-flex flex-column">
          <span className="villa-number">{villa.unitNumber}</span>
          {villa.blockOrBuilding && (
            <span className="villa-block mt-1 align-self-start">{villa.blockOrBuilding}</span>
          )}
        </div>
        <span className="villa-badge">
          {t(`villas.statusTypes.${villa.status}`, villa.status)}
        </span>
      </div>
      <CCardBody className="villa-card-body d-flex flex-column justify-content-end">
        <div className="villa-meta-item">
          <CIcon icon={cilHome} className="meta-icon me-2" />
          <span>{t(`villas.types.${villa.type}`, villa.type)}</span>
        </div>
        {villa.floorAreaSqFt && (
          <div className="villa-meta-item mt-1">
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
              {villa.floorAreaSqFt} Sq Ft
            </span>
          </div>
        )}
      </CCardBody>
    </CCard>
  );
};

VillaCard.propTypes = {
  villa: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    unitNumber: PropTypes.string.isRequired,
    blockOrBuilding: PropTypes.string,
    type: PropTypes.string,
    status: PropTypes.string.isRequired,
    floorAreaSqFt: PropTypes.number,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default VillaCard;
