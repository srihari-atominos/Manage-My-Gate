import React, { useEffect } from 'react';
import LifecycleStepper from '../components/LifecycleStepper.jsx';
import WorkspaceTabs from '../components/WorkspaceTabs.jsx';
import { useCrmWorkspace } from '../hooks/useCrmWorkspace.js';
import '../styles/_crmWorkspace.scss';

/**
 * CrmWorkspaceView — Top-level view container for the Unified Customer/Deal Workspace.
 *
 * Strictly adheres to Frontend Workflow rules:
 * - Uses useCrmWorkspace hook exclusively for logic and state (Thin View pattern).
 * - Layout structure strictly mirrors BillingView for platform-wide consistency.
 */
export const CrmWorkspaceView = () => {
  const {
    activeInquiry,
    inquiries,
    tasks,
    meetings,
    activeThread,
    activeTab,
    loading,
    taskLoading,
    handleTabChange,
    fetchInquiriesList,
    fetchTasksList,
    fetchMeetingsList,
    fetchThreadData,
    createTaskItem,
    scheduleMeetingItem,
    sendChatMessage,
  } = useCrmWorkspace();

  // Load initial data on mount
  useEffect(() => {
    fetchInquiriesList({ page: 1, limit: 10 });
    fetchTasksList({ page: 1, limit: 10 });
    fetchMeetingsList({ page: 1, limit: 10 });
  }, [fetchInquiriesList, fetchTasksList, fetchMeetingsList]);

  // Load thread data when active inquiry changes or communication tab is selected
  useEffect(() => {
    if (activeInquiry?._id && activeTab === 'Communication') {
      fetchThreadData(activeInquiry._id);
    }
  }, [activeInquiry?._id, activeTab, fetchThreadData]);

  return (
    <div className="billing-module-wrapper billing-os-theme crm-workspace-theme">
      <div className="view-container">
        <div className="view active" id="view-crm-workspace">

          {/* ── Page Header Toolbar ───────────────────────────────────── */}
          <div className="crm-header-toolbar">
            <div>
              <h4 className="crm-header-toolbar__title">
                Customer & Deal Workspace
              </h4>
              <p className="crm-header-toolbar__sub">
                Unified hub for managing customer inquiries, follow-ups, meetings, and deals.
              </p>
            </div>
            <div className="crm-header-toolbar__actions">
              <button
                type="button"
                className="crm-btn crm-btn--primary"
                onClick={() => fetchInquiriesList({ page: 1, limit: 10 })}
              >
                <i className="fa-solid fa-rotate me-1" />
                Refresh Workspace
              </button>
            </div>
          </div>

          {/* ── Visual Deal Lifecycle Stepper ─────────────────────────── */}
          <LifecycleStepper status={activeInquiry?.status || 'NEW'} />

          {/* ── Workspace Tabbed Panels ───────────────────────────────── */}
          <WorkspaceTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            activeInquiry={activeInquiry || inquiries[0] || null}
            tasks={tasks}
            meetings={meetings}
            activeThread={activeThread}
            loading={loading}
            taskLoading={taskLoading}
            onCreateTask={createTaskItem}
            onScheduleMeeting={scheduleMeetingItem}
            onSendMessage={sendChatMessage}
          />

        </div>
      </div>
    </div>
  );
};

export default CrmWorkspaceView;
