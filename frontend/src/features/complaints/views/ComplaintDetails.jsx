import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useComplaints } from '../hooks/useComplaints';
import toast from 'react-hot-toast';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ComplaintDetails ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="complaint-modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.7)', position: 'fixed', top: 0, bottom: 0, left: 0, right: 0 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ color: 'red' }}>Something went wrong.</h2>
            <p style={{ fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
            <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
            <button className="btn btn-primary" onClick={() => this.props.onClose()}>Close</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ComplaintDetails = ({ complaintId, onClose, onProvideFeedback }) => {
  const { currentComplaint: complaint, isDetailsLoading, loadComplaintDetails, addComment, updateStatus, assignTechnician, cancelComplaint, reopenComplaint, confirmCompletion } = useComplaints({}, { disableAutoFetch: true });
  const authUser = useSelector((state) => state.auth?.user || {});
  const userRole = authUser.role || 'Resident';
  
  const [localLoading, setLocalLoading] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [assignmentType, setAssignmentType] = useState('staff');
  const [assignForm, setAssignForm] = useState({ 
    technicianId: '', 
    technicianName: '', 
    temporaryName: '', 
    temporaryPhone: '', 
    adminInstructions: '' 
  });
  const [updateForm, setUpdateForm] = useState({ status: '', remarks: '', priority: '' });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    overallRating: 5,
    technicianRating: 5,
    serviceRating: 5,
    cleanlinessRating: 5,
    communicationRating: 5,
    remarks: ''
  });

  const handlePrint = () => {
    window.print();
  };

  const handleEscalate = async () => {
    try {
      await updateStatus(complaintId, { status: 'Escalated', remarks: 'Escalated by administrator' });
      toast.success('Complaint escalated');
    } catch (err) {
      toast.error('Failed to escalate complaint');
    }
  };

  // Mock technicians for dropdown
  const technicians = [
    { id: '1', name: 'Ravi Kumar (In-House)' },
    { id: '2', name: 'QuickFix Plumbing Co. (External)' }
  ];

  useEffect(() => {
    if (complaintId) {
      setLocalLoading(true);
      loadComplaintDetails(complaintId)
        .catch(err => {
          toast.error('Failed to load complaint details');
        })
        .finally(() => {
          setLocalLoading(false);
        });
    }
  }, [complaintId]);

  useEffect(() => {
    if (complaint) {
      setUpdateForm({ status: complaint.status, remarks: '', priority: complaint.priority || 'Medium' });
    }
  }, [complaint]);

  if (isDetailsLoading || localLoading) {
    return (
      <div className="complaint-modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)' }}>
        <div style={{ background: '#ffffff', padding: '40px', borderRadius: '12px', textAlign: 'center', minWidth: '300px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <h3 style={{ margin: 0, color: '#1E293B', fontSize: '18px', fontWeight: 'bold' }}>Loading Details...</h3>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="complaint-modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)' }}>
        <div style={{ background: '#ffffff', padding: '40px', borderRadius: '12px', textAlign: 'center', minWidth: '300px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B', margin: '0 0 12px 0' }}>Ticket Not Found</h3>
          <p style={{ color: '#475569', margin: '0 0 24px 0' }}>We couldn't find the details for this ticket.</p>
          <button style={{ background: '#2F6FED', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getWorkflowStepIndex = (status) => {
    if (['Closed', 'Completed'].includes(status)) return 4;
    if (['Resolved', 'Work Completed', 'Waiting For Resident Confirmation'].includes(status)) return 3;
    if (status === 'In Progress') return 2;
    if (['Assigned', 'Accepted'].includes(status)) return 1;
    return 0; // Submitted/Open/Waiting For Assignment
  };

  const renderWorkflowFlow = () => {
    if (complaint.status === 'Cancelled') {
      const steps = [
        { label: 'Submitted', isCompleted: true },
        { label: 'Cancelled', isActive: true, isError: true }
      ];
      return renderSteps(steps);
    }
    if (complaint.status === 'Rejected') {
      const steps = [
        { label: 'Submitted', isCompleted: true },
        { label: 'Rejected', isActive: true, isError: true }
      ];
      return renderSteps(steps);
    }
    if (complaint.vendor === 'Temporary Vendor' || complaint.vendor === 'External Vendor') {
      const getTempVendorIndex = (s) => {
        if (['Closed', 'Completed', 'Resolved'].includes(s)) return 2;
        if (['Assigned', 'In Progress'].includes(s)) return 1;
        return 0;
      };
      const idx = getTempVendorIndex(complaint.status);
      const tempSteps = [
        { label: 'Submitted', isCompleted: idx > 0, isActive: idx === 0 },
        { label: 'Assigned', isCompleted: idx > 1, isActive: idx === 1 },
        { label: 'Closed', isCompleted: idx > 2, isActive: idx === 2 }
      ];
      return renderSteps(tempSteps);
    }
    
    const currentStepIndex = getWorkflowStepIndex(complaint.status);
    const steps = [
      { label: 'Submitted', isCompleted: currentStepIndex > 0, isActive: currentStepIndex === 0 },
      { label: 'Assigned', isCompleted: currentStepIndex > 1, isActive: currentStepIndex === 1 },
      { label: 'In Progress', isCompleted: currentStepIndex > 2, isActive: currentStepIndex === 2 },
      { label: 'Resolved', isCompleted: currentStepIndex > 3, isActive: currentStepIndex === 3 },
      { label: 'Closed', isCompleted: currentStepIndex > 4, isActive: currentStepIndex === 4 }
    ];
    return renderSteps(steps);
  };

  const renderSteps = (steps) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
        {steps.map((step, idx) => {
          // Circle styles
          let circleBg = 'var(--bg)';
          let circleColor = 'var(--ink-soft)';
          let circleBorder = '1px solid var(--border)';
          
          if (step.isCompleted) {
            circleBg = 'var(--success)';
            circleColor = '#fff';
            circleBorder = '1px solid var(--success)';
          } else if (step.isActive) {
            if (step.isError) {
              circleBg = 'var(--critical)';
              circleColor = '#fff';
              circleBorder = '2px solid #B91C1C';
            } else {
              circleBg = 'var(--primary)';
              circleColor = '#fff';
              circleBorder = '2px solid var(--primary-dark)';
            }
          }

          return (
            <div key={idx} style={{ display: 'flex', position: 'relative', paddingBottom: idx === steps.length - 1 ? '0' : '20px' }}>
              {/* Connector Line */}
              {idx !== steps.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: '11px',
                  top: '24px',
                  bottom: 0,
                  width: '2px',
                  background: step.isCompleted ? 'var(--success)' : 'var(--border)',
                  zIndex: 0
                }} />
              )}
              
              {/* Step Indicator Circle */}
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                background: circleBg,
                color: circleColor,
                border: circleBorder,
                zIndex: 1,
                marginRight: '12px',
                flexShrink: 0
              }}>
                {step.isCompleted ? <i className="fa-solid fa-check" style={{ fontSize: '10px' }}></i> : idx + 1}
              </div>
              
              {/* Step Details */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: step.isActive ? 700 : 600,
                  color: step.isActive ? (step.isError ? 'var(--critical)' : 'var(--primary)') : (step.isCompleted ? 'var(--ink)' : 'var(--ink-faint)')
                }}>
                  {step.label}
                </span>
                {step.isActive && (
                  <span style={{ fontSize: '11px', color: step.isError ? 'var(--critical)' : 'var(--ink-soft)' }}>
                    {step.isError ? 'Request Terminated' : 'Current Stage'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment(complaintId, { remarks: newComment, attachments: [], isInternal: isInternalComment });
      setNewComment('');
      setIsInternalComment(false);
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const handleAssign = async () => {
    try {
      const payload = {
        adminInstructions: assignForm.adminInstructions
      };
      
      if (assignmentType === 'staff') {
        payload.technicianId = assignForm.technicianId;
        payload.technicianName = assignForm.technicianName;
        payload.vendor = 'In-House';
      } else {
        payload.technicianId = null;
        payload.technicianName = assignForm.temporaryName;
        payload.vendor = 'External Vendor';
        if (assignForm.temporaryPhone) {
          payload.adminInstructions = `${assignForm.adminInstructions || ''}\n[Temporary Vendor Phone: ${assignForm.temporaryPhone}]`.trim();
        }
      }

      await assignTechnician(complaintId, payload);
      setShowAssignModal(false);
      setAssignForm({
        technicianId: '',
        technicianName: '',
        temporaryName: '',
        temporaryPhone: '',
        adminInstructions: ''
      });
      setAssignmentType('staff');
      toast.success('Technician assigned successfully');
    } catch (err) {
      toast.error('Failed to assign technician');
    }
  };

  const handleUpdateStatus = async () => {
    try {
      await updateStatus(complaintId, updateForm);
      setShowUpdateModal(false);
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <ErrorBoundary onClose={onClose}>
    <div className="complaint-modal-overlay" style={{ zIndex: 1000, overflowY: 'auto' }}>
      <div className="complaint-modal" style={{ width: '90%', maxWidth: '1000px', margin: '40px auto', background: 'var(--bg)', display: 'block' }}>
        <div className="page-header" style={{ padding: '24px', borderBottom: '1px solid var(--border)', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--ink-soft)', cursor: 'pointer', marginBottom: '8px' }} onClick={onClose}>
                <i className="fa-solid fa-arrow-left"></i> Back to List
              </div>
            <h1 id="pageTitle" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              Ticket {complaint.complaintNumber}
              <span className={`badge ${['Resolved', 'Closed'].includes(complaint.status) ? 'resolved' : ['In Progress', 'Assigned'].includes(complaint.status) ? 'progress' : 'open'}`}>
                {complaint.status}
              </span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['Admin', 'FacilityManager', 'Manager', 'Super Admin'].includes(userRole) && (
              <>
                {!['Cancelled', 'Closed', 'Resolved'].includes(complaint.status) && (
                  <>
                    <button className="btn btn-ghost" onClick={() => setShowUpdateModal(true)}>Update Status</button>
                    <button className="btn btn-ghost" onClick={handleEscalate}>Escalate</button>
                  </>
                )}
                <button className="btn btn-ghost" onClick={handlePrint}><i className="fa-solid fa-print"></i> Print / PDF</button>
                {!['Cancelled', 'Closed', 'Resolved'].includes(complaint.status) && (
                  <button className="btn btn-primary" onClick={() => setShowAssignModal(true)}>Assign Technician</button>
                )}
              </>
            )}
            {(
              (['Admin', 'FacilityManager', 'Manager', 'Super Admin'].includes(userRole) && ['Submitted', 'Open', 'Assigned', 'In Progress'].includes(complaint.status)) ||
              (userRole?.toLowerCase() === 'resident' && ['Submitted', 'Open', 'Assigned'].includes(complaint.status))
            ) && (
              <button className="btn btn-ghost" style={{ color: '#DC2626' }} onClick={() => {
                const reason = prompt('Reason for cancellation:');
                if (reason) {
                  cancelComplaint(complaintId, reason).then(() => toast.success('Complaint Cancelled'));
                }
              }}>Cancel Request</button>
            )}
            {userRole?.toLowerCase() === 'resident' && ['Resolved', 'Waiting For Resident Confirmation'].includes(complaint.status) && (
              <>
                <button className="btn btn-ghost" onClick={() => {
                  const reason = prompt('Reason for reopening:');
                  if (reason) {
                    reopenComplaint(complaintId, reason).then(() => toast.success('Complaint Reopened'));
                  }
                }}>Reopen</button>
                <button className="btn btn-primary" onClick={() => {
                  setShowFeedbackModal(true);
                }}>Confirm Completion</button>
              </>
            )}
          </div>
        </div>
      </div>
      

          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
            
            {/* Left Column */}
            <div>
              <div className="card" style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 16px 0' }}>{complaint.title}</h2>
                <p style={{ color: 'var(--ink-soft)', fontSize: '15px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {complaint.description}
                </p>

                {complaint.attachments && complaint.attachments.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--ink)', marginBottom: '12px' }}>Attached Files</h4>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {complaint.attachments.map((att, i) => {
                        const fileUrl = typeof att === 'string' ? att : att.url;
                        const isImage = fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                        return (
                          <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                            {isImage ? (
                              <img 
                                src={fileUrl} 
                                alt={`Attachment ${i + 1}`} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                                onClick={() => setEnlargedImage(fileUrl)}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>
                                <i className="fa-solid fa-file-pdf fa-lg" style={{ marginBottom: '8px' }}></i>
                                <a href={fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none' }}>View</a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '24px' }}>Activity & Updates</h3>
                <div className="timeline">
                  {complaint.timeline?.filter(evt => !evt.isInternal || userRole !== 'Resident').map((evt, idx) => (
                    <div className="tl-item done" key={idx}>
                      <div className="tl-node" style={evt.isInternal ? { background: '#F59E0B', borderColor: '#F59E0B' } : {}}><i className="fa-solid fa-check"></i></div>
                      <div className="tl-content">
                        <b>
                          {evt.action}
                          {evt.isInternal && <span className="badge warning" style={{ fontSize: '10px', padding: '2px 6px', marginLeft: '8px', background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}>Internal</span>}
                        </b>
                        <span>{evt.userName ? `${evt.userName} (${evt.userRole})` : evt.userRole} • {formatDate(evt.date || evt.timestamp || evt.createdAt || new Date())}</span>
                        {evt.remarks && <p style={{ fontSize: '13.5px', color: 'var(--ink-soft)', marginTop: '8px', background: evt.isInternal ? '#FFFBEB' : 'var(--bg)', padding: '12px', borderRadius: 'var(--radius-md)', border: evt.isInternal ? '1px dashed #FDE68A' : 'none' }}>{evt.remarks}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                  <textarea 
                    placeholder="Type an update or comment..." 
                    style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', fontSize: '14px', minHeight: '80px', marginBottom: '12px' }}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                  ></textarea>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div />
                    <button className="btn btn-primary" onClick={handleAddComment}>Post Update</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Ticket Info</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '8px' }}>
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Ticket Flow</span>
                    {renderWorkflowFlow()}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Created</span>
                      <div style={{ color: 'var(--ink)', fontSize: '13px' }}>{formatDate(complaint.createdAt)}</div>
                    </div>
                    {complaint.slaDueDate && (
                      <div>
                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Expected SLA</span>
                        <div style={{ color: 'var(--ink)', fontSize: '13px' }}>{formatDate(complaint.slaDueDate)}</div>
                      </div>
                    )}
                    {complaint.resolvedAt && (
                      <div>
                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Resolved</span>
                        <div style={{ color: 'var(--ink)', fontSize: '13px' }}>{formatDate(complaint.resolvedAt)}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {complaint.vendor === 'Temporary Vendor' && ['Assigned', 'In Progress'].includes(complaint.status) && (
                      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
                        confirmCompletion(complaintId, { remarks: 'Work marked as done for temporary vendor.' })
                          .then(() => toast.success('Work marked as done.'))
                          .catch(e => toast.error(e.response?.data?.message || 'Error marking as done'));
                      }}>
                        Work Done
                      </button>
                    )}
                    <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>
                      Cancel
                    </button>
                  </div>
                </div>              </div>

              {complaint.assignedTechnicianName && (
                <div className="card">
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Assignee Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Name</span>
                      <div style={{ color: 'var(--ink)', fontSize: '13px', fontWeight: 600 }}>{complaint.assignedTechnicianName}</div>
                    </div>
                    {true && (
                      <div>
                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Phone Number</span>
                        <div style={{ color: 'var(--ink)', fontSize: '13px' }}>
                          {(() => {
                            if (complaint.assignedTechnicianPhone) {
                              return complaint.assignedTechnicianPhone;
                            }
                            if (complaint.assignedTechnicianId?.phone) {
                              return complaint.assignedTechnicianId.phone;
                            }
                            if (complaint.vendor === 'Temporary Vendor') {
                              const assignEvent = complaint.timeline?.find(t => t.action === 'Complaint Assigned' && t.remarks?.includes('Assigned to:'));
                              if (assignEvent && assignEvent.remarks) {
                                const match = assignEvent.remarks.match(/Phone:\s*([\d\+\-\(\)\s]+)/i);
                                if (match && match[1]) return match[1].trim();
                              }
                            }
                            return 'N/A';
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}



              {['Resolved', 'Closed', 'Completed', 'Waiting For Resident Confirmation'].includes(complaint.status) && (complaint.resolutionSummary || complaint.resolutionNotes || complaint.workDone || complaint.technicianRemarks || (complaint.workNotes && complaint.workNotes.length > 0) || (complaint.workAttachments && complaint.workAttachments.length > 0)) && (
                <div className="card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#166534', marginBottom: '16px', borderBottom: '1px solid #BBF7D0', paddingBottom: '12px' }}>Resolution Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {complaint.resolutionSummary && (
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: '#166534', opacity: 0.8, fontWeight: 600, textTransform: 'uppercase' }}>Resolution Summary</span>
                        <div style={{ color: '#14532D', fontSize: '13px' }}>{complaint.resolutionSummary}</div>
                      </div>
                    )}
                    {complaint.resolutionNotes && (
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: '#166534', opacity: 0.8, fontWeight: 600, textTransform: 'uppercase' }}>Resolution Notes</span>
                        <div style={{ color: '#14532D', fontSize: '13px' }}>{complaint.resolutionNotes}</div>
                      </div>
                    )}
                    {complaint.workDone && (
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: '#166534', opacity: 0.8, fontWeight: 600, textTransform: 'uppercase' }}>Work Done</span>
                        <div style={{ color: '#14532D', fontSize: '13px' }}>{complaint.workDone}</div>
                      </div>
                    )}
                    {complaint.technicianRemarks && (
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: '#166534', opacity: 0.8, fontWeight: 600, textTransform: 'uppercase' }}>Technician Remarks</span>
                        <div style={{ color: '#14532D', fontSize: '13px' }}>{complaint.technicianRemarks}</div>
                      </div>
                    )}
                    {complaint.workNotes && complaint.workNotes.length > 0 && (
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: '#166534', opacity: 0.8, fontWeight: 600, textTransform: 'uppercase' }}>Work Notes</span>
                        <ul style={{ color: '#14532D', fontSize: '13px', margin: 0, paddingLeft: '20px' }}>
                          {complaint.workNotes.map((note, idx) => (
                            <li key={idx}><strong>{formatDate(note.createdAt)}</strong>: {note.note} (by {note.authorName})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {complaint.workAttachments && complaint.workAttachments.length > 0 && (
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: '#166534', opacity: 0.8, fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Work Photos</span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {complaint.workAttachments.map((url, i) => (
                            <div key={i} style={{ width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #BBF7D0', cursor: 'pointer' }} onClick={() => setEnlargedImage(url)}>
                              <img src={url} alt={`Work Photo ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {complaint.completionDate && (
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: '#166534', opacity: 0.8, fontWeight: 600, textTransform: 'uppercase' }}>Completion Date</span>
                        <div style={{ color: '#14532D', fontSize: '13px' }}>{formatDate(complaint.completionDate)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {['Resolved', 'Closed', 'Completed'].includes(complaint.status) && complaint.feedback && (
                <div className="card" style={{ background: 'var(--primary-light)', borderColor: '#C7D2FE' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '12px' }}>Resolution Feedback</h3>
                  <div className="feedback-stars" style={{ fontSize: '16px', marginBottom: '12px' }}>
                    {[1,2,3,4,5].map(star => (
                      <i key={star} className={star <= (complaint.feedback.overallRating || complaint.feedback.rating) ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                    ))}
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--ink-soft)', fontStyle: 'italic', margin: 0 }}>
                    "{complaint.feedback.remarks}"
                  </p>
                  {complaint.feedback.feedbackDate && (
                    <div style={{ fontSize: '11px', color: 'var(--ink-faint)', marginTop: '8px' }}>
                      Submitted: {formatDate(complaint.feedback.feedbackDate)}
                    </div>
                  )}
                </div>
              )}

              {['Resolved', 'Closed', 'Completed'].includes(complaint.status) && !(complaint.feedback && (complaint.feedback.overallRating || complaint.feedback.rating)) && onProvideFeedback && (
                <div style={{ marginTop: '16px' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => onProvideFeedback(complaint._id)}
                  >
                    <i className="fa-solid fa-star"></i> Provide Feedback
                  </button>
                </div>
              )}


            </div>
            
          </div>


      {/* Modals */}
      {showAssignModal && (
        <div className="complaint-modal-overlay">
          <div className="complaint-modal" style={{ display: 'block', maxWidth: '560px' }}>
            <div className="complaint-modal-header" style={{ borderBottom: 'none', marginBottom: '16px' }}>
              <h3 className="complaint-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Assign Technician <span style={{ color: 'var(--ink-faint)', fontWeight: 500, fontSize: '15px' }}>{complaint.complaintNumber}</span>
              </h3>
              <i className="fa-solid fa-xmark complaint-modal-close" onClick={() => setShowAssignModal(false)}></i>
            </div>

            {/* Notification Block */}
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <i className="fa-solid fa-bell" style={{ color: '#2563EB', marginTop: '2px' }}></i>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: '#1E3A8A', marginBottom: '6px' }}>Automated Notifications</strong>
                <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#1E40AF', lineHeight: '1.6' }}>
                  <li><strong>Assignee:</strong> Receives WhatsApp/SMS with ticket details.</li>
                  <li><strong>Resident:</strong> Receives an in-app notification containing the Assignee's name.</li>
                </ol>
              </div>
            </div>

            {/* Radio Group Selector */}
            <div style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '20px',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '16px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', margin: 0 }}>
                <input 
                  type="radio" 
                  name="assignmentType" 
                  checked={assignmentType === 'staff'} 
                  onChange={() => setAssignmentType('staff')} 
                />
                Select Existing Staff
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', margin: 0 }}>
                <input 
                  type="radio" 
                  name="assignmentType" 
                  checked={assignmentType === 'vendor'} 
                  onChange={() => setAssignmentType('vendor')} 
                />
                Assign Temporary Vendor
              </label>
            </div>

            {/* Conditional Fields */}
            {assignmentType === 'staff' ? (
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px', display: 'block' }}>Select Department Staff / Vendor</label>
                <select 
                  value={assignForm.technicianId} 
                  onChange={e => {
                    const tech = technicians.find(t => t.id === e.target.value);
                    setAssignForm({ ...assignForm, technicianId: e.target.value, technicianName: tech ? tech.name : '' });
                  }}
                  style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px' }}
                >
                  <option value="">-- Choose Assignee --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px', display: 'block' }}>Temporary Assignee Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Local Plumber (Raj)" 
                    value={assignForm.temporaryName}
                    onChange={e => setAssignForm({ ...assignForm, temporaryName: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px', display: 'block' }}>Phone Number (For WhatsApp Notification)</label>
                  <input 
                    type="text" 
                    placeholder="+91 00000 00000" 
                    value={assignForm.temporaryPhone}
                    onChange={e => setAssignForm({ ...assignForm, temporaryPhone: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px' }}
                  />
                </div>
              </>
            )}

            {/* Admin Instructions (Optional) */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px', display: 'block' }}>Admin Instructions (Optional)</label>
              <textarea 
                placeholder="E.g., Call the resident before heading to the flat..."
                value={assignForm.adminInstructions}
                onChange={e => setAssignForm({ ...assignForm, adminInstructions: e.target.value })}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', fontSize: '14px', minHeight: '80px' }}
              ></textarea>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button 
                className="btn btn-ghost" 
                style={{ padding: '10px 24px', fontSize: '14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', color: 'var(--ink-soft)' }} 
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                style={{ padding: '10px 24px', fontSize: '14px', borderRadius: '6px', background: '#2563EB', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={handleAssign} 
                disabled={assignmentType === 'staff' ? !assignForm.technicianId : !assignForm.temporaryName}
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="complaint-modal-overlay">
          <div className="complaint-modal" style={{ display: 'block' }}>
            <div className="complaint-modal-header">
              <h3 className="complaint-modal-title">Update Status</h3>
              <i className="fa-solid fa-xmark complaint-modal-close" onClick={() => setShowUpdateModal(false)}></i>
            </div>
            <div className="form-group">
              <label>New Status</label>
              <select value={updateForm.status} onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}>
                <option>Submitted</option>
                <option>Assigned</option>
                <option>In Progress</option>
                <option>Resolved</option>
                <option>Closed</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>Priority</label>
              <select value={updateForm.priority} onChange={e => setUpdateForm({ ...updateForm, priority: e.target.value })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label>Internal Note / Remarks</label>
              <textarea 
                placeholder="Reason for update..."
                value={updateForm.remarks}
                onChange={e => setUpdateForm({ ...updateForm, remarks: e.target.value })}
              ></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-ghost" onClick={() => setShowUpdateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateStatus}>Save Update</button>
            </div>
          </div>
        </div>
      )}

      {enlargedImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setEnlargedImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <button 
              onClick={() => setEnlargedImage(null)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img src={enlargedImage} alt="Enlarged Attachment" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', display: 'block' }} onClick={e => e.stopPropagation()} />
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <a href={enlargedImage} download target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                <i className="fa-solid fa-download" style={{ marginRight: '8px' }}></i> Download Image
              </a>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="modal-overlay active" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, padding: '20px' }}>
          <div className="modal-box" style={{ width: '100%', maxWidth: '500px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Provide Feedback</h4>
              <button onClick={() => setShowFeedbackModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Overall Rating', key: 'overallRating' },
                  { label: 'Technician Rating', key: 'technicianRating' },
                  { label: 'Service Quality', key: 'serviceRating' },
                  { label: 'Cleanliness', key: 'cleanlinessRating' },
                  { label: 'Communication', key: 'communicationRating' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 500, color: '#334155' }}>{item.label}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <i 
                          key={star} 
                          className="fa-solid fa-star" 
                          style={{ color: star <= feedbackForm[item.key] ? '#f59e0b' : '#cbd5e1', cursor: 'pointer', fontSize: '20px' }}
                          onClick={() => setFeedbackForm({ ...feedbackForm, [item.key]: star })}
                        ></i>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Additional Remarks</label>
                  <textarea 
                    rows="3" 
                    className="form-control" 
                    value={feedbackForm.remarks}
                    onChange={e => setFeedbackForm({ ...feedbackForm, remarks: e.target.value })}
                    placeholder="Tell us about your experience..."
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                confirmCompletion(complaintId, feedbackForm).then(() => {
                  toast.success('Completed and feedback submitted');
                  setShowFeedbackModal(false);
                });
              }}>Submit & Confirm</button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
    </ErrorBoundary>
  );
};

export default ComplaintDetails;
