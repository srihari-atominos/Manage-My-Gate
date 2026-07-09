import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ComplaintTopNav from '../components/ComplaintTopNav';
import { useAuth } from '../../auth/hooks/useAuth';
import { useAmenities } from '../../amenities/hooks/useAmenities';
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

  return (
    <div className="complaints-module-wrapper complaints-os-theme">
      <ComplaintTopNav />
      <div className="view-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div className="page-header" style={{ marginBottom: '40px' }}>
          <h1 id="pageTitle" style={{ fontSize: '22px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
            Complaints Dashboard
          </h1>
          <div className="sub" id="pageSub" style={{ fontSize: '14px', color: '#64748B' }}>
            Block {user?.block || 'A'}, Flat {user?.flat || '704'} &middot; {user?.tenantId?.name || 'Greenview Society'}
          </div>
        </div>
      
        <div className="content">
          <section className="screen active" id="dashboard">
            
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
            <div className="grid grid-2" style={{ gap: '24px', marginBottom: '48px' }}>
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

          </section>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDashboard;
