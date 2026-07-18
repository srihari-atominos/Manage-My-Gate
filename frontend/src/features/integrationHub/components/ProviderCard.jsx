import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { CCard, CCardBody } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronRight } from '@coreui/icons';
import '../styles/_integrationHub.scss';

/**
 * Dumb UI component for rendering supported integration providers.
 */
export const ProviderCard = ({ provider, onClick }) => {
  const { t } = useTranslation();

  const getBrandColor = (id) => {
    switch (id) {
      case 'twilio':
        return '#f22f46';
      case 'openai':
        return '#10a37f';
      case 'resend':
        return '#2563eb';
      case 'firebase':
        return '#FFCA28';
      case 'messageCentral':
        return '#1565C0';
      default:
        return 'var(--cui-primary, #4f46e5)';
    }
  };

  const getDefaultDescription = (provider) => {
    if (provider.id === 'messageCentral') {
      return 'Configure Message Central for SMS OTP and Transactional SMS.';
    }
    return `Connect to ${provider.name} Integration`;
  };

  return (
    <CCard className="provider-card h-100 shadow-sm border-0" onClick={() => onClick(provider)}>
      <CCardBody className="d-flex align-items-center justify-content-between p-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="provider-logo-container d-flex align-items-center justify-content-center"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: `${getBrandColor(provider.id)}15`,
              color: getBrandColor(provider.id),
              fontWeight: 700,
              fontSize: '1.25rem',
            }}
          >
            {provider.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h5 className="provider-name mb-1 fw-semibold">{provider.name}</h5>
            <small className="text-muted">
              {t(`integrationHub.providers.${provider.id}.description`, {
                defaultValue: getDefaultDescription(provider),
              })}
            </small>
          </div>
        </div>
        <div className="provider-card-arrow">
          <CIcon icon={cilChevronRight} className="text-muted" size="lg" />
        </div>
      </CCardBody>
    </CCard>
  );
};

ProviderCard.propTypes = {
  provider: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    fields: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default ProviderCard;
