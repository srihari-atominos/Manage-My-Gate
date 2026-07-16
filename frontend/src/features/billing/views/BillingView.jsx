import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import BillingTopNav           from '../components/BillingTopNav.jsx';
import AssessmentList          from '../components/AssessmentList.jsx';
import AssessmentDetail        from '../components/AssessmentDetail.jsx';
import AssessmentFormModal     from '../components/AssessmentFormModal.jsx';
import BillingDashboardView    from './BillingDashboardView.jsx';
import ResidentActionCenterView from './ResidentActionCenterView.jsx';
import { useAssessment }       from '../../assessment/hooks/useAssessment';
import { useBillingSocket }    from '../hooks/useBillingSocket.js';
import '../styles/_billing.scss';

/**
 * BillingView — Parent container / entry point for the entire Billing module.
 *
 * Acts as the orchestrator that renders the correct tab panel based on the
 * active nav selection.
 */
export const BillingView = () => {
  const user = useSelector((state) => state.auth?.user);
  useBillingSocket(user?.id || user?._id);

  const [activeTab, setActiveTab]         = useState('dashboard');
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);

  const {
    assessmentsList: assessments,
    activeTemplate: selectedAssessment,
    pagination,
    loading,
    loadAssessments,
    deleteTemplate,
    selectTemplate: setSelectedAssessment,
  } = useAssessment();

  useEffect(() => {
    if (activeTab === 'assessment-manager') {
      loadAssessments();
    }
  }, [activeTab, loadAssessments]);

  const handleOpenEditModal = useCallback((assessment) => {
    setEditingAssessment(assessment);
    setIsModalOpen(true);
  }, []);

  const handlePageChange = useCallback((page) => {
    loadAssessments({ page });
  }, [loadAssessments]);

  const handleDeleteAssessment = useCallback(async (assessment) => {
    if (window.confirm(`Are you sure you want to delete the template "${assessment.name}"?`)) {
      try {
        await deleteTemplate(assessment._id);
      } catch (err) {
        console.error('Failed to delete assessment template:', err);
      }
    }
  }, [deleteTemplate]);

  return (
    <div className="billing-module-wrapper billing-os-theme">

      {/* ── Assessment Form Modal ─────────────────────────────────────── */}
      <AssessmentFormModal
        visible={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAssessment(null);
        }}
        onSuccess={loadAssessments}
        assessment={editingAssessment}
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
                <AssessmentList 
                  assessments={assessments}
                  selectedAssessment={selectedAssessment}
                  onSelectAssessment={setSelectedAssessment}
                  loading={loading}
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteAssessment}
                />

                {/* Right panel — Configured residents for selected assessment */}
                <AssessmentDetail 
                  assessment={selectedAssessment}
                  onEdit={handleOpenEditModal}
                />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default BillingView;
