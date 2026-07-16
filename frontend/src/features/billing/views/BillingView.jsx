import React, { useState, useCallback } from 'react';
import BillingTopNav           from '../components/BillingTopNav.jsx';
import AssessmentList          from '../components/AssessmentList.jsx';
import AssessmentDetail        from '../components/AssessmentDetail.jsx';
import AssessmentFormModal     from '../components/AssessmentFormModal.jsx';
import BillingDashboardView    from './BillingDashboardView.jsx';
import ResidentActionCenterView from './ResidentActionCenterView.jsx';
import AssessmentDrawer        from '../../assessment/components/AssessmentDrawer.jsx';
import '../styles/_billing.scss';

/**
 * BillingView — Parent container / entry point for the entire Billing module.
 *
 * Acts as the orchestrator that renders the correct tab panel based on the
 * active nav selection. Individual tab panels will be populated as their
 * components are built out.
 */
export const BillingView = () => {
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [isDrawerOpen, setIsDrawerOpen]   = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  const handleOpenDrawer = useCallback((assessment) => {
    setSelectedAssessment(assessment);
    setIsDrawerOpen(true);
  }, []);

  return (
    <div className="billing-module-wrapper billing-os-theme">

      {/* ── Assessment Form Modal ─────────────────────────────────────── */}
      <AssessmentFormModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* ── Assessment Drawer ────────────────────────────────────────────── */}
      <AssessmentDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        assessment={selectedAssessment}
      />

      <BillingTopNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="view-container">
        <div className="view active" id="view-billing">

          {/* ── Tab: Dashboard ─────────────────────────────────────────── */}
          {activeTab === 'dashboard' && <BillingDashboardView />}

          {/* ── Tab: Action Center ─────────────────────────────────────── */}
          {activeTab === 'action-center' && <ResidentActionCenterView />}

          {/* ── Tab: Assessment Manager ────────────────────────────────── */}
          {activeTab === 'assessment-manager' && (
            <>
              {/* ── Toolbar: Create Button ────────────────────────────── */}
              <div className="billing-section-toolbar" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary billing-create-btn"
                  onClick={() => setIsModalOpen(true)}
                >
                  <i className="fa-solid fa-plus" />
                  Create New Assessment
                </button>
              </div>

              {/* ── Two-column panel grid ─────────────────────────────── */}
              <div className="dashboard-grid">
                {/* Left panel — Assessment templates list */}
                <AssessmentList onConfigure={handleOpenDrawer} />

                {/* Right panel — Configured residents for selected assessment */}
                <AssessmentDetail onConfigure={handleOpenDrawer} />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default BillingView;
