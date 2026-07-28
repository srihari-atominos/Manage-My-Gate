import React, { memo, useState } from 'react';
import {
  formatDate,
  formatStatusBadge,
  getInitials,
} from '../utils/crmFormatters.js';

export const WorkspaceTabs = memo(({
  activeTab = 'Overview',
  onTabChange,
  activeInquiry,
  tasks = [],
  meetings = [],
  activeThread,
  loading = false,
  taskLoading = false,
  onScheduleMeeting,
  onCreateTask,
  onSendMessage,
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [chatInput, setChatInput] = useState('');

  const tabs = [
    { key: 'Overview', label: 'Overview', icon: 'fa-solid fa-chart-pie' },
    { key: 'Tasks', label: 'Action Center Tasks', icon: 'fa-solid fa-list-check' },
    { key: 'Meetings', label: 'Meetings & Demos', icon: 'fa-solid fa-video' },
    { key: 'Communication', label: 'Messages & Threads', icon: 'fa-solid fa-comments' },
  ];

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    if (onCreateTask) {
      onCreateTask({
        title: taskTitle.trim(),
        relatedInquiryId: activeInquiry?._id || null,
        status: 'PENDING',
      });
      setTaskTitle('');
    }
  };

  const handleMeetingSubmit = (e) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingDate) return;
    if (onScheduleMeeting) {
      onScheduleMeeting({
        title: meetingTitle.trim(),
        scheduledAt: meetingDate,
        inquiryId: activeInquiry?._id || null,
        status: 'SCHEDULED',
      });
      setMeetingTitle('');
      setMeetingDate('');
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (onSendMessage && activeInquiry?._id) {
      onSendMessage(activeInquiry._id, {
        senderType: 'AGENT',
        content: chatInput.trim(),
      });
      setChatInput('');
    }
  };

  const badgeInfo = formatStatusBadge(activeInquiry?.status);

  return (
    <div className="crm-workspace-tabs-container">
      {/* ── Top Navigation Tabs ───────────────────────────────────────── */}
      <div className="crm-nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`crm-nav-btn ${activeTab === tab.key ? 'crm-nav-btn--active' : ''}`}
            onClick={() => onTabChange && onTabChange(tab.key)}
          >
            <i className={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content Container ─────────────────────────────────────── */}
      <div className="crm-tab-content">

        {/* ── 1. Tab: Overview ────────────────────────────────────────── */}
        {activeTab === 'Overview' && (
          <div className="crm-workspace-grid">
            {/* Left Card: Customer & Inquiry Details */}
            <div className="crm-card">
              <div className="crm-card__header">
                <h5 className="crm-card__title">
                  <i className="fa-solid fa-circle-info text-primary" />
                  Inquiry Details
                </h5>
                <span className={`crm-badge ${badgeInfo.className}`}>
                  {badgeInfo.label}
                </span>
              </div>
              <div className="crm-card__body">
                {activeInquiry ? (
                  <div className="crm-detail-list">
                    <div className="crm-detail-list__item">
                      <span className="crm-detail-list__label">Inquiry ID</span>
                      <span className="crm-detail-list__value text-primary">{activeInquiry.inquiryId}</span>
                    </div>
                    <div className="crm-detail-list__item">
                      <span className="crm-detail-list__label">Customer Name</span>
                      <span className="crm-detail-list__value">{activeInquiry.customerName}</span>
                    </div>
                    <div className="crm-detail-list__item">
                      <span className="crm-detail-list__label">Contact Email</span>
                      <span className="crm-detail-list__value">{activeInquiry.contactEmail}</span>
                    </div>
                    <div className="crm-detail-list__item">
                      <span className="crm-detail-list__label">Contact Phone</span>
                      <span className="crm-detail-list__value">{activeInquiry.contactPhone || 'N/A'}</span>
                    </div>
                    <div className="crm-detail-list__item">
                      <span className="crm-detail-list__label">Assigned Agent</span>
                      <span className="crm-detail-list__value">
                        {activeInquiry.assignedAgent?.name || 'Unassigned'}
                      </span>
                    </div>
                    <div className="crm-detail-list__item">
                      <span className="crm-detail-list__label">Created Date</span>
                      <span className="crm-detail-list__value">{formatDate(activeInquiry.createdAt)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted">
                    <i className="fa-solid fa-folder-open fa-2x mb-2" />
                    <p className="mb-0">No active inquiry selected. Select or create an inquiry to view details.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Card: Quick Actions */}
            <div className="crm-card">
              <div className="crm-card__header">
                <h5 className="crm-card__title">
                  <i className="fa-solid fa-bolt text-warning" />
                  Quick Actions
                </h5>
              </div>
              <div className="crm-card__body">
                <div className="d-flex flex-column gap-3">
                  <button
                    type="button"
                    className="crm-btn crm-btn--primary w-100"
                    onClick={() => onTabChange && onTabChange('Meetings')}
                  >
                    <i className="fa-solid fa-video" />
                    Schedule Demo Meeting
                  </button>
                  <button
                    type="button"
                    className="crm-btn crm-btn--secondary w-100"
                    onClick={() => onTabChange && onTabChange('Tasks')}
                  >
                    <i className="fa-solid fa-plus" />
                    Add Follow-up Task
                  </button>
                  <button
                    type="button"
                    className="crm-btn crm-btn--secondary w-100"
                    onClick={() => onTabChange && onTabChange('Communication')}
                  >
                    <i className="fa-solid fa-comment-dots" />
                    Send Customer Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. Tab: Tasks ───────────────────────────────────────────── */}
        {activeTab === 'Tasks' && (
          <div className="crm-card">
            <div className="crm-card__header">
              <h5 className="crm-card__title">
                <i className="fa-solid fa-list-check text-info" />
                Action Center Tasks
              </h5>
            </div>
            <div className="crm-card__body">
              {/* Add Task Quick Form */}
              <form onSubmit={handleTaskSubmit} className="d-flex gap-2 mb-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type task title (e.g., Prepare demo presentation)..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
                <button type="submit" className="crm-btn crm-btn--primary">
                  <i className="fa-solid fa-plus" />
                  Add Task
                </button>
              </form>

              {/* Tasks List */}
              {taskLoading ? (
                <div className="p-4 text-center text-muted">
                  <i className="fa-solid fa-spinner fa-spin me-2" />
                  Loading tasks...
                </div>
              ) : tasks.length > 0 ? (
                <div className="table-responsive">
                  <table className="table custom-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => {
                        const statusMeta = formatStatusBadge(task.status);
                        return (
                          <tr key={task._id}>
                            <td className="fw-semibold">{task.title}</td>
                            <td>
                              <span className={`crm-badge ${statusMeta.className}`}>
                                {statusMeta.label}
                              </span>
                            </td>
                            <td>{formatDate(task.dueDate, false)}</td>
                            <td>{task.assignedTo?.name || 'Unassigned'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-muted">
                  <i className="fa-solid fa-tasks fa-2x mb-2" />
                  <p className="mb-0">No tasks created yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 3. Tab: Meetings ────────────────────────────────────────── */}
        {activeTab === 'Meetings' && (
          <div className="crm-card">
            <div className="crm-card__header">
              <h5 className="crm-card__title">
                <i className="fa-solid fa-video text-danger" />
                Scheduled Meetings & Demos
              </h5>
            </div>
            <div className="crm-card__body">
              {/* Schedule Meeting Form */}
              <form onSubmit={handleMeetingSubmit} className="d-flex flex-wrap gap-2 mb-4">
                <input
                  type="text"
                  className="form-control flex-grow-1"
                  placeholder="Meeting Title (e.g. Product Demo)..."
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                />
                <input
                  type="datetime-local"
                  className="form-control"
                  style={{ width: 'auto' }}
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
                <button type="submit" className="crm-btn crm-btn--primary">
                  <i className="fa-solid fa-calendar-plus" />
                  Schedule
                </button>
              </form>

              {/* Meetings List */}
              {meetings.length > 0 ? (
                <div className="table-responsive">
                  <table className="table custom-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Scheduled Date</th>
                        <th>Google Meet Link</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetings.map((meeting) => (
                        <tr key={meeting._id}>
                          <td className="fw-semibold">{meeting.title}</td>
                          <td>{formatDate(meeting.scheduledAt)}</td>
                          <td>
                            {meeting.googleMeetLink ? (
                              <a
                                href={meeting.googleMeetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary fw-semibold"
                              >
                                <i className="fa-solid fa-link me-1" />
                                Join Google Meet
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td>
                            <span className={`crm-badge ${formatStatusBadge(meeting.status).className}`}>
                              {meeting.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-muted">
                  <i className="fa-solid fa-video-slash fa-2x mb-2" />
                  <p className="mb-0">No meetings scheduled.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 4. Tab: Communication / Threads ──────────────────────────── */}
        {activeTab === 'Communication' && (
          <div className="crm-card">
            <div className="crm-card__header">
              <h5 className="crm-card__title">
                <i className="fa-solid fa-comments text-success" />
                Inquiry Thread & Messages
              </h5>
            </div>
            <div className="crm-card__body">
              <div className="crm-thread-box">
                {/* Messages Feed */}
                <div className="crm-thread-box__messages">
                  {activeThread?.messages && activeThread.messages.length > 0 ? (
                    activeThread.messages.map((msg, index) => {
                      const isAgent = msg.senderType === 'AGENT';
                      return (
                        <div
                          key={msg._id || index}
                          className={`crm-thread-box__bubble ${
                            isAgent
                              ? 'crm-thread-box__bubble--agent'
                              : 'crm-thread-box__bubble--customer'
                          }`}
                        >
                          <div className="fw-bold fs-7 mb-1">
                            {isAgent ? 'Agent' : 'Customer'}
                          </div>
                          <div>{msg.content}</div>
                          <div className="text-end opacity-75 mt-1 fs-8">
                            {formatDate(msg.timestamp)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-muted m-auto">
                      <i className="fa-solid fa-comment-dots fa-2x mb-2" />
                      <p className="mb-0">No messages in this thread yet. Start the conversation below!</p>
                    </div>
                  )}
                </div>

                {/* Message Input Composer */}
                <form onSubmit={handleChatSubmit} className="crm-thread-box__composer">
                  <input
                    type="text"
                    className="crm-thread-box__input"
                    placeholder="Type your message to customer..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="crm-btn crm-btn--primary">
                    <i className="fa-solid fa-paper-plane" />
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
});

WorkspaceTabs.displayName = 'WorkspaceTabs';

export default WorkspaceTabs;
