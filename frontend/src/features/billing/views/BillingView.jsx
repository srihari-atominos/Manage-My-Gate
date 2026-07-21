import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton
} from '@coreui/react';
import BillingTopNav           from '../components/BillingTopNav.jsx';
import AssessmentList          from '../components/AssessmentList.jsx';
import AssessmentDetail        from '../components/AssessmentDetail.jsx';
import AssessmentFormModal     from '../components/AssessmentFormModal.jsx';
import BillingDashboardView    from './BillingDashboardView.jsx';
import ResidentActionCenterView from './ResidentActionCenterView.jsx';
import { useAssessment }       from '../../assessment/hooks/useAssessment';
import { useBillingSocket }    from '../hooks/useBillingSocket.js';
import usePermission           from '../../../hooks/usePermission';
import '../styles/_billing.scss';

/**
 * BillingView — Parent container / entry point for the entire Billing module.
 *
 * Acts as the orchestrator that renders the correct tab panel based on the
 * active nav selection.
 */
export const BillingView = () => {
  const user = useSelector((state) => state.auth?.user);
  const activeOrgId = useSelector((state) => state.workspace?.activeOrganizationId);
  useBillingSocket(user?.id || user?._id, activeOrgId);

  const hasDashboard = usePermission('billing', 'dashboard');
  const hasActionCenter = usePermission('billing', 'action_center');
  const hasAssessmentManager = usePermission('billing', 'assessment_manager');

  const [searchParams] = useSearchParams();

  // Dynamically resolve default tab based on user permissions
  const defaultTab = hasDashboard 
    ? 'dashboard' 
    : (hasActionCenter ? 'action-center' : (hasAssessmentManager ? 'assessment-manager' : ''));

  const [activeTab, setActiveTab]         = useState(defaultTab);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [deleteTargetTemplate, setDeleteTargetTemplate] = useState(null);

  // Sync activeTab if defaultTab changes (e.g. on async auth hydration)
  useEffect(() => {
    if (defaultTab && !activeTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, activeTab]);

  // Sync activeTab from query param if provided (e.g. when clicked from notification)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['dashboard', 'action-center', 'assessment-manager'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const {
    assessmentsList: assessments,
    activeTemplate: selectedAssessment,
    pagination,
    loading,
    loadAssessments,
    deleteTemplate,
    selectTemplate: setSelectedAssessment,
    triggerBilling,
  } = useAssessment();

  const handleRunBilling = useCallback(async (assessment) => {
    try {
      await triggerBilling(assessment._id).unwrap();
      toast.success(`Successfully generated invoices for "${assessment.name}"!`);
    } catch (err) {
      toast.error(`Failed to run billing cycle: ${err}`);
    }
  }, [triggerBilling]);

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

  const handleDeleteAssessment = useCallback((assessment) => {
    setDeleteTargetTemplate(assessment);
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTargetTemplate) return;
    try {
      await deleteTemplate(deleteTargetTemplate._id);
      toast.success('Assessment template deleted successfully.');
    } catch (err) {
      toast.error('Failed to delete template: ' + err.message);
    } finally {
      setDeleteTargetTemplate(null);
    }
  };

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
          {activeTab === 'dashboard' && hasDashboard && <BillingDashboardView />}

          {/* ── Tab: Action Center ─────────────────────────────────────── */}
          {activeTab === 'action-center' && hasActionCenter && <ResidentActionCenterView />}

          {/* ── Tab: Assessment Manager ────────────────────────────────── */}
          {activeTab === 'assessment-manager' && hasAssessmentManager && (
            <>
              {/* ── Toolbar: Create Button ────────────────────────────── */}
              <div className="billing-section-toolbar justify-content-end">
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
                  onRunBilling={handleRunBilling}
                />
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Confirm Delete Template Modal ─────────────────────────────── */}
      <CModal visible={!!deleteTargetTemplate} onClose={() => setDeleteTargetTemplate(null)} alignment="center">
        <CModalHeader>
          <CModalTitle className="fw-semibold text-danger">Delete Assessment Template</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete the template <strong>"{deleteTargetTemplate?.name}"</strong>? This action will archive or delete the template based on associated invoices history.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" size="sm" onClick={() => setDeleteTargetTemplate(null)}>
            Cancel
          </CButton>
          <CButton color="danger" size="sm" className="text-white" onClick={handleConfirmDelete}>
            Delete
          </CButton>
        </CModalFooter>
      </CModal>

    </div>
  );
};

export default BillingView;
