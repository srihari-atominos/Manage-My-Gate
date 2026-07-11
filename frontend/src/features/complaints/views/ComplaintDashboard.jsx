import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ComplaintTopNav from '../components/ComplaintTopNav';
import { useAuth } from '../../auth/hooks/useAuth';
import { useAmenities } from '../../amenities/hooks/useAmenities';
import { useComplaints } from '../hooks/useComplaints';
import toast from 'react-hot-toast';
import '../styles/_complaints.scss';

const ComplaintDashboard = () => {
  const navigate = useNavigate();
  const { currentUser: user } = useAuth();
  
  const { amenities, loading } = useAmenities();

  const maintenanceNotices = useMemo(() => {
    const notices = [];
    if (amenities && amenities.length > 0) {
      amenities.forEach(amenity => {
        if (amenity.status === 'maintenance' || amenity.maintenanceSchedules?.length > 0) {
          const activeSchedules = amenity.maintenanceSchedules?.filter(s => 
            s.status !== 'completed' && s.status !== 'cancelled'
          ) || [];
          
          if (amenity.status === 'maintenance' && activeSchedules.length === 0) {
            notices.push({
              id: `amn-${amenity._id}`,
              title: `${amenity.name} is Closed`,
              message: `The ${amenity.name} is currently temporarily unavailable due to maintenance.`,
              timestamp: new Date(amenity.updatedAt || Date.now())
            });
          }

          activeSchedules.forEach(schedule => {
            notices.push({
              id: `amn-sch-${schedule._id}`,
              title: schedule.title || `${amenity.name} Maintenance`,
              message: schedule.description || `Maintenance scheduled from ${schedule.startDate} to ${schedule.endDate}.`,
              timestamp: new Date(schedule.startDate)
            });
          });
        }
      });
    }
    return notices.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [amenities]);

  const { createNewComplaint } = useComplaints();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!generalFeedback.trim()) {
      toast.error('Please enter your feedback before submitting.');
      return;
    }
    try {
      setIsSubmittingFeedback(true);
      await createNewComplaint({
        title: 'Resident Feedback',
        description: generalFeedback,
        category: 'Feedback',
        priority: 'Medium',
        department: 'Management',
        flat: user?.flat || '',
        name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Resident',
        isEmergency: false,
        location: {
          building: user?.building || '',
          tower: user?.tower || '',
          floor: user?.floor || '',
          flat: user?.flat || ''
        }
      });
      toast.success('Thank you! Your feedback has been submitted successfully.');
      setGeneralFeedback('');
      setShowFeedbackModal(false);
    } catch (error) {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="complaints-module-wrapper complaints-os-theme">
      <ComplaintTopNav />
      <div className="view-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '28px', margin: 0 }}>Complaints Dashboard</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Block {user?.block || 'A'}, Flat {user?.flat || '704'} &middot; {user?.tenantId?.name || 'Greenview Society'}</p>
          </div>
        </div>
            
            {/* WELCOME SECTION */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
                Welcome back, {user?.firstName || user?.name || 'Ananya'}!
              </h2>
              <p style={{ color: '#64748B', fontSize: '15px', margin: 0 }}>
                How can we help you with your facility today?
              </p>
            </div>
            
            {/* PRIMARY ACTIONS - Centered like image */}
            <div className="grid grid-3" style={{ gap: '24px', marginBottom: '48px' }}>
              <div 
                className="resident-action-centered" 
                onClick={() => navigate('/admin/complaints/create')}
              >
                <div className="action-icon-circle" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                  <i className="fa-solid fa-screwdriver-wrench"></i>
                </div>
                <b className="action-title">Raise a Ticket</b>
                <span className="action-desc">Report electrical, plumbing, or facility issues.</span>
              </div>

              <div 
                className="resident-action-centered" 
                onClick={() => navigate('/admin/complaints/my-tickets')}
              >
                <div className="action-icon-circle" style={{ background: '#FEF3C7', color: '#D97706' }}>
                  <i className="fa-solid fa-magnifying-glass-location"></i>
                </div>
                <b className="action-title">Track Requests</b>
                <span className="action-desc">Check the status of your reported issues.</span>
              </div>

              <div 
                className="resident-action-centered" 
                onClick={() => setShowFeedbackModal(true)}
              >
                <div className="action-icon-circle" style={{ background: '#FCE7F3', color: '#DB2777' }}>
                  <i className="fa-solid fa-comment-dots"></i>
                </div>
                <b className="action-title">Provide Feedback</b>
                <span className="action-desc">Share your suggestions or overall feedback.</span>
              </div>
            </div>

            {/* MAINTENANCE BOARD */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', margin: '0 0 16px 0' }}>
                Maintenance Board
              </h3>
              
              {loading ? (
                <div className="notice-card-simple" style={{ justifyContent: 'center', color: '#94A3B8' }}>
                  Loading maintenance updates...
                </div>
              ) : maintenanceNotices.length > 0 ? (
                <div className="notice-list">
                  {maintenanceNotices.map((notice) => (
                    <div key={notice.id} className="notice-card-simple">
                      <div className="notice-icon-simple">
                        <i className="fa-solid fa-bullhorn"></i>
                      </div>
                      <div className="notice-content-simple">
                        <div className="notice-title-simple">{notice.title}</div>
                        <div className="notice-desc-simple">{notice.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="notice-card-simple" style={{ justifyContent: 'center', color: '#94A3B8' }}>
                  No active maintenance announcements.
                </div>
              )}
            </div>


      </div>

      {showFeedbackModal && (
        <div className="modal-overlay active" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, padding: '20px' }}>
          <div className="modal-box" style={{ width: '100%', maxWidth: '500px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>General Feedback</h4>
              <button onClick={() => setShowFeedbackModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Your Feedback</label>
                  <textarea 
                    rows="5" 
                    className="form-control" 
                    value={generalFeedback}
                    onChange={e => setGeneralFeedback(e.target.value)}
                    placeholder="Tell us what's on your mind... (e.g. maintenance team is doing a great job, or suggestions for improvement)"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setShowFeedbackModal(false)} disabled={isSubmittingFeedback}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFeedbackSubmit} disabled={isSubmittingFeedback}>
                {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintDashboard;
