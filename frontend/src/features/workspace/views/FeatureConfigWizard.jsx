import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { CContainer, CRow, CCol, CCard, CCardBody, CButton, CAlert, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilUser, cilShieldAlt, cilLayers } from '@coreui/icons';
import useFeatureConfig from '../hooks/useFeatureConfig.js';
import SetupWorkspace from '../components/SetupWorkspace.jsx';
import '../styles/_workspace.scss';

/**
 * View presenting available modules as interactive cards to configure organization features.
 */
export const FeatureConfigWizard = () => {
  const { t } = useTranslation();
  const activeOrganizationId = useSelector((state) => state.workspace.activeOrganizationId);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isCreateIntent = searchParams.get('intent') === 'create';

  const {
    selectedFeatures,
    loading,
    error,
    toggleFeature,
    submitFeatures,
  } = useFeatureConfig();

  // If user does not have an active organization, or if they explicitly intend to create a new one,
  // they must setup one first.
  if (!activeOrganizationId || isCreateIntent) {
    return <SetupWorkspace />;
  }

  const features = [
    {
      id: 'users',
      titleKey: 'workspace.wizard.users.title',
      descKey: 'workspace.wizard.users.desc',
      icon: cilUser,
    },
    {
      id: 'roles',
      titleKey: 'workspace.wizard.roles.title',
      descKey: 'workspace.wizard.roles.desc',
      icon: cilShieldAlt,
    },
    {
      id: 'integrations',
      titleKey: 'workspace.wizard.integrations.title',
      descKey: 'workspace.wizard.integrations.desc',
      icon: cilLayers,
    },
  ];

  return (
    <div className="feature-config-wizard bg-light">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={9} lg={8} xl={7}>
            <CCard className="shadow-lg border-0 rounded-4">
              <CCardBody className="p-5">
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-dark mb-2">
                    {t('workspace.wizard.title')}
                  </h2>
                  <p className="text-muted">
                    {t('workspace.wizard.subtitle')}
                  </p>
                </div>

                {error && (
                  <CAlert color="danger" className="mb-4">
                    {t(error)}
                  </CAlert>
                )}

                <CRow className="gap-3 gap-md-0 mb-5">
                  {features.map((feature) => {
                    const isSelected = selectedFeatures.includes(feature.id);
                    return (
                      <CCol key={feature.id} md={4} className="mb-3 mb-md-0">
                        <CCard
                          className={`feature-card h-100 border rounded-3 p-3 ${
                            isSelected ? 'selected' : ''
                          }`}
                          onClick={() => toggleFeature(feature.id)}
                          id={`feature-card-${feature.id}`}
                        >
                          <CCardBody className="d-flex flex-column align-items-center text-center p-2">
                            <div
                              className={`rounded-circle d-flex align-items-center justify-content-center mb-3`}
                              style={{
                                width: '60px',
                                height: '60px',
                                backgroundColor: isSelected ? '#321fdb' : '#f8f9fa',
                                transition: 'all 0.25s ease-in-out',
                              }}
                            >
                              <CIcon 
                                icon={feature.icon} 
                                size="xl" 
                                style={{
                                  color: isSelected ? '#ffffff' : '#321fdb',
                                  transition: 'all 0.25s ease-in-out',
                                }} 
                              />
                            </div>
                            <h5 className="fw-semibold text-dark mb-2">
                              {t(feature.titleKey)}
                            </h5>
                            <p className="text-muted small mb-0">
                              {t(feature.descKey)}
                            </p>
                          </CCardBody>
                        </CCard>
                      </CCol>
                    );
                  })}
                </CRow>

                <div className="d-grid">
                  <CButton
                    color="primary"
                    size="lg"
                    className="py-3 fw-semibold rounded-3 text-white border-0"
                    style={{ backgroundColor: '#321fdb' }}
                    onClick={submitFeatures}
                    disabled={loading || selectedFeatures.length === 0}
                    id="submit-features-wizard"
                  >
                    {loading ? (
                      <>
                        <CSpinner size="sm" className="me-2 text-white" />
                        {t('workspace.wizard.loading')}
                      </>
                    ) : (
                      t('workspace.wizard.submit')
                    )}
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default FeatureConfigWizard;
