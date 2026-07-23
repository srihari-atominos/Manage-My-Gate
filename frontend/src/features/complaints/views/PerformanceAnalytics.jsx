import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useComplaints } from '../hooks/useComplaints';
import ComplaintTopNav from '../components/ComplaintTopNav';
import '../styles/_complaints.scss';
import { useComplaintAnalyticsSocket } from '../hooks/useComplaintAnalyticsSocket';

const PerformanceAnalytics = () => {
  useComplaintAnalyticsSocket();
  const { dashboardAnalytics: data, loadDashboardAnalytics, isLoading } = useComplaints();
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    loadDashboardAnalytics({});
  }, []);

  const kpis = data?.kpis || {};
  const priorityBreakdown = data?.priorityBreakdown || [];
  const categoryBreakdown = data?.categoryBreakdown || [];
  const techPerformance = data?.technicianPerformance || [];

  const getPriorityCount = (level) => priorityBreakdown.find(p => p._id === level)?.count || 0;
  const getPriorityPercent = (level) => {
    if (!kpis.total) return 0;
    return Math.round((getPriorityCount(level) / kpis.total) * 100);
  };

  return (
    <div className="complaints-module-wrapper complaints-os-theme">
      <ComplaintTopNav />
      <div className="view-container">
        <div className="view active" id="analytics">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ margin: 0 }} className="fs-2">Performance Analytics</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }} className="fw-medium">Helpdesk efficiency metrics and feedback</p>
            </div>
            <button className="btn btn-secondary" onClick={() => {
                window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/complaints/export?auth_token=${token}`, '_blank');
              }}>
              <i className="fa-solid fa-file-export" style={{ marginRight: '8px' }}></i> Export Report
            </button>
          </div>
          <div className="section-title" style={{ marginTop: '0' }}><h3>Dashboard Summary</h3></div>
          <div className="grid grid-4" style={{ marginBottom: '16px' }}>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><i className="fa-solid fa-ticket-simple"></i></div><div><div className="value">{isLoading ? '...' : kpis.total || 0}</div><div className="label">Total Complaints</div></div></div>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--warning-light)', color: '#D97706' }}><i className="fa-solid fa-envelope-open-text"></i></div><div><div className="value">{isLoading ? '...' : kpis.open || 0}</div><div className="label">Open Complaints</div></div></div>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--info-light)', color: '#0284C7' }}><i className="fa-solid fa-user-check"></i></div><div><div className="value">{isLoading ? '...' : kpis.assigned || 0}</div><div className="label">Assigned Complaints</div></div></div>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><i className="fa-regular fa-clock"></i></div><div><div className="value">{isLoading ? '...' : kpis.inProgress || 0}</div><div className="label">In Progress</div></div></div>
          </div>
          <div className="grid grid-4" style={{ marginBottom: '16px' }}>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--success-light)', color: '#059669' }}><i className="fa-solid fa-check-double"></i></div><div><div className="value">{isLoading ? '...' : kpis.resolved || 0}</div><div className="label">Completed</div></div></div>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--bg)', color: 'var(--ink-soft)' }}><i className="fa-solid fa-lock"></i></div><div><div className="value">{isLoading ? '...' : kpis.closed || 0}</div><div className="label">Closed</div></div></div>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--critical-light)', color: '#DC2626' }}><i className="fa-solid fa-angles-up"></i></div><div><div className="value">{isLoading ? '...' : kpis.escalated || 0}</div><div className="label">Escalated</div></div></div>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--critical-light)', color: '#991B1B' }}><i className="fa-solid fa-triangle-exclamation"></i></div><div><div className="value">{isLoading ? '...' : kpis.critical || 0}</div><div className="label">Critical Complaints</div></div></div>
          </div>
          <div className="grid grid-4" style={{ marginBottom: '40px' }}>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--success-light)', color: '#059669' }}><i className="fa-solid fa-shield-halved"></i></div><div><div className="value">{isLoading ? '...' : kpis.withinSla || 0}</div><div className="label">SLA Met</div></div></div>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--critical-light)', color: '#DC2626' }}><i className="fa-solid fa-shield-virus"></i></div><div><div className="value">{isLoading ? '...' : kpis.slaBreached || 0}</div><div className="label">SLA Breached</div></div></div>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--info-light)', color: '#0284C7' }}><i className="fa-solid fa-stopwatch"></i></div><div><div className="value">{isLoading ? '...' : Math.round(kpis.averageResponseHours || 0)}h</div><div className="label">Avg Response Time</div></div></div>
            <div className="card stat-card card-hover"><div className="icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><i className="fa-solid fa-stopwatch-20"></i></div><div><div className="value">{isLoading ? '...' : Math.round(kpis.averageResolutionHours || 0)}h</div><div className="label">Avg Resolution Time</div></div></div>
          </div>

          <div className="section-title"><h3>Complaint Priority Summary</h3></div>
          <div className="grid grid-4" style={{ marginBottom: '40px' }}>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #DC2626' }}>
              <div style={{ color: 'var(--ink-soft)', textTransform: 'uppercase' }} className="fw-semibold small">Critical</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ color: 'var(--ink)' }} className="fw-bold fs-2">{getPriorityCount('Critical')}</span>
                <span style={{ color: 'var(--ink-soft)' }} className="small">({getPriorityPercent('Critical')}%)</span>
              </div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #F59E0B' }}>
              <div style={{ color: 'var(--ink-soft)', textTransform: 'uppercase' }} className="fw-semibold small">High</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ color: 'var(--ink)' }} className="fw-bold fs-2">{getPriorityCount('High')}</span>
                <span style={{ color: 'var(--ink-soft)' }} className="small">({getPriorityPercent('High')}%)</span>
              </div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ color: 'var(--ink-soft)', textTransform: 'uppercase' }} className="fw-semibold small">Medium</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ color: 'var(--ink)' }} className="fw-bold fs-2">{getPriorityCount('Medium')}</span>
                <span style={{ color: 'var(--ink-soft)' }} className="small">({getPriorityPercent('Medium')}%)</span>
              </div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #10B981' }}>
              <div style={{ color: 'var(--ink-soft)', textTransform: 'uppercase' }} className="fw-semibold small">Low</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ color: 'var(--ink)' }} className="fw-bold fs-2">{getPriorityCount('Low')}</span>
                <span style={{ color: 'var(--ink-soft)' }} className="small">({getPriorityPercent('Low')}%)</span>
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
            <div>
              <div className="section-title" style={{ marginTop: 0 }}><h3>Complaint Category Summary</h3></div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="ent-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Total</th>
                      <th>Open</th>
                      <th>Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryBreakdown.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>No categories found</td></tr>
                    )}
                    {categoryBreakdown.map((cat, idx) => (
                      <tr key={idx}>
                        <td><b style={{ color: 'var(--ink)' }}>{cat._id || 'Others'}</b></td>
                        <td>{cat.count}</td>
                        <td><span className="badge open">{cat.open}</span></td>
                        <td><span className="badge resolved">{cat.resolved}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div className="section-title" style={{ marginTop: 0 }}><h3>SLA Summary</h3></div>
              <div className="card grid" style={{ gap: '16px', padding: '20px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink-soft)' }} className="fw-medium small">Within SLA</span>
                    <span style={{ color: '#059669' }} className="fw-bold fs-6">{kpis.withinSla || 0}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink-soft)' }} className="fw-medium small">Near SLA Breach</span>
                    <span style={{ color: '#D97706' }} className="fw-bold fs-6">{kpis.nearSlaBreach || 0}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink-soft)' }} className="fw-medium small">Breached</span>
                    <span style={{ color: '#DC2626' }} className="fw-bold fs-6">{kpis.slaBreached || 0}</span>
                 </div>
                 <div style={{ height: '1px', background: 'var(--border)' }}></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink-soft)' }} className="fw-medium small">Avg Resolution Time</span>
                    <span style={{ color: 'var(--ink)' }} className="fw-bold small">{Math.round(kpis.averageResolutionHours || 0)} hours</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink-soft)' }} className="fw-medium small">Fastest Resolution</span>
                    <span style={{ color: 'var(--ink)' }} className="fw-bold small">{Math.round(kpis.fastestResolutionHours || 0)} hours</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink-soft)' }} className="fw-medium small">Slowest Resolution</span>
                    <span style={{ color: 'var(--ink)' }} className="fw-bold small">{Math.round(kpis.slowestResolutionHours || 0)} hours</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="section-title"><h3>Technician Summary</h3></div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '40px' }}>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ent-table">
              <thead>
                <tr>
                  <th>Technician Name</th>
                  <th>Status</th>
                  <th>Pending Assignments</th>
                  <th>Completed Today</th>
                  <th>Avg Resolution Time</th>
                </tr>
              </thead>
              <tbody>
                {techPerformance.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>No technicians active</td></tr>
                )}
                {techPerformance.map((tech, idx) => {
                   const isBusy = tech.pending > 0;
                   return (
                     <tr key={idx}>
                       <td>
                         <div style={{ display: 'flex', alignItems: 'center' }}>
                           <div className="avatar-sm" style={{ marginRight: '10px' }}>{tech._id.name?.charAt(0) || 'T'}</div>
                           <b style={{ color: 'var(--ink)' }}>{tech._id.name || 'Unknown'}</b>
                         </div>
                       </td>
                       <td>
                         {isBusy ? (
                           <span className="badge progress">Busy</span>
                         ) : (
                           <span className="badge resolved">Available</span>
                         )}
                       </td>
                       <td>{tech.pending || 0}</td>
                       <td>{tech.completedToday || 0}</td>
                       <td>{tech.completed > 0 ? Math.round(tech.totalTime / tech.completed) + ' hrs' : '-'}</td>
                     </tr>
                   );
                })}
              </tbody>
            </table>
          </div>

          <div className="section-title"><h3>Resident Feedback</h3></div>
          <div className="card" style={{ padding: '24px' }}>
            {data?.recentComplaints?.filter(c => c.rating).length > 0 ? (
               data.recentComplaints.filter(c => c.rating).map((c, i) => (
                 <div className="feedback-card" key={i}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                     <b style={{ color: 'var(--ink)' }} className="small">
                       {c.residentName} <span style={{ color: 'var(--ink-faint)' }} className="fw-medium">&middot; #{c.complaintNumber}</span>
                     </b>
                     <div className="feedback-stars">
                       {[...Array(5)].map((_, idx) => (
                         <i key={idx} className={idx < c.rating ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                       ))}
                     </div>
                   </div>
                   {c.feedback && <p style={{ color: 'var(--ink-soft)', margin: '4px 0 0 0' }} className="small">"{c.feedback}"</p>}
                   <div style={{ color: 'var(--ink-faint)', marginTop: '8px' }} className="small">
                     {new Date(c.updatedAt || c.createdAt).toLocaleDateString('en-GB')}
                   </div>
                 </div>
               ))
            ) : (
               <div style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>No feedback available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
