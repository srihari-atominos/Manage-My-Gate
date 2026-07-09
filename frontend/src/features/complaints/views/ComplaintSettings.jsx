import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaintSettings, updateComplaintSettings } from '../store/complaintSettingsSlice';
import ComplaintTopNav from '../components/ComplaintTopNav';
import toast from 'react-hot-toast';
import '../styles/_complaints.scss';

const ComplaintSettings = () => {
  const dispatch = useDispatch();
  const { data: settingsData, status, error } = useSelector((state) => state.complaintSettings);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    dispatch(fetchComplaintSettings());
  }, [dispatch]);

  useEffect(() => {
    if (status === 'succeeded' && settingsData) {
      setSettings(settingsData);
      setLoading(false);
    } else if (status === 'failed') {
      toast.error(error || 'Failed to load settings');
      setLoading(false);
    }
  }, [status, settingsData, error]);

  const handleChange = (section, field, value) => {
    setSettings(prev => {
      if (section) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await dispatch(updateComplaintSettings(settings)).unwrap();
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error(err || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addDepartment = (name) => {
    if (!name) return;
    setSettings(prev => ({
      ...prev,
      departments: [...(prev.departments || []), { name, description: '', isActive: true }]
    }));
  };

  const removeDepartment = (idx) => {
    setSettings(prev => {
      const deps = [...(prev.departments || [])];
      deps.splice(idx, 1);
      return { ...prev, departments: deps };
    });
  };

  const addCategory = (name) => {
    if (!name) return;
    setSettings(prev => ({
      ...prev,
      categories: [...(prev.categories || []), { name, description: '', isActive: true, order: 0 }]
    }));
  };

  const removeCategory = (idx) => {
    setSettings(prev => {
      const cats = [...(prev.categories || [])];
      cats.splice(idx, 1);
      return { ...prev, categories: cats };
    });
  };

  const addStatus = (name) => {
    if (!name) return;
    setSettings(prev => ({
      ...prev,
      workflow: {
        ...prev.workflow,
        statuses: [...(prev.workflow?.statuses || []), { name, enabled: true, color: '#000000' }]
      }
    }));
  };

  const removeStatus = (idx) => {
    setSettings(prev => {
      const statuses = [...(prev.workflow?.statuses || [])];
      statuses.splice(idx, 1);
      return {
        ...prev,
        workflow: { ...prev.workflow, statuses }
      };
    });
  };

  const addQuestion = (question) => {
    if (!question) return;
    setSettings(prev => ({
      ...prev,
      feedbackQuestions: [...(prev.feedbackQuestions || []), { question, isRequired: false, isActive: true, order: 0 }]
    }));
  };

  const removeQuestion = (idx) => {
    setSettings(prev => {
      const q = [...(prev.feedbackQuestions || [])];
      q.splice(idx, 1);
      return { ...prev, feedbackQuestions: q };
    });
  };

  if (loading || !settings) {
    return (
      <div className="complaints-module-wrapper complaints-os-theme d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
      </div>
    );
  }

  return (
    <div className="complaints-module-wrapper complaints-os-theme">
      <ComplaintTopNav />
      <div className="view-container">
        <div className="view active" id="settings">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 id="pageTitle">System Settings</h1>
              <div className="sub" id="pageSub">Configure departments, priorities, SLAs, workflows and feedback</div>
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fa-solid fa-save" style={{ marginRight: '8px' }}></i>}
              Save Changes
            </button>
          </div>
      
          <div className="content">
            <section className="screen active" id="settings">
              <div className="grid grid-2">
                
                {/* Departments & Categories */}
                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--ink)' }}>Departments</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {(settings.departments || []).map((dep, idx) => (
                      <span key={idx} className="tag-chip">
                        {dep.name} <i className="fa-solid fa-xmark" style={{ fontSize: '12px', cursor: 'pointer' }} onClick={() => removeDepartment(idx)}></i>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    <input type="text" id="new-dept-input" placeholder="New dept name" style={{ flex: 1, marginBottom: 0 }} className="form-control" />
                    <button className="btn btn-outline-primary" onClick={() => {
                      const input = document.getElementById('new-dept-input');
                      addDepartment(input.value);
                      input.value = '';
                    }}>Add</button>
                  </div>

                  <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--ink)' }}>Categories</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {(settings.categories || []).map((cat, idx) => (
                      <span key={idx} className="tag-chip">
                        {cat.name} <i className="fa-solid fa-xmark" style={{ fontSize: '12px', cursor: 'pointer' }} onClick={() => removeCategory(idx)}></i>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="text" id="new-cat-input" placeholder="New category name" style={{ flex: 1, marginBottom: 0 }} className="form-control" />
                    <button className="btn btn-outline-primary" onClick={() => {
                      const input = document.getElementById('new-cat-input');
                      addCategory(input.value);
                      input.value = '';
                    }}>Add</button>
                  </div>
                </div>

                {/* SLAs & Priorities */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--ink)', margin: 0 }}>Service Level Agreements (SLA) & Priorities</h3>
                  </div>
                  
                  {settings.slaRules && settings.slaRules.length > 0 ? (
                    settings.slaRules.map((rule, idx) => (
                      <div className="settings-row" key={idx}>
                        <div>
                          <span className={`badge ${rule.priority.toLowerCase()}`}>{rule.priority}</span>
                          <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginTop: '4px' }}>Resolve within</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="number" 
                            value={rule.resolveWithinHours || 0} 
                            onChange={(e) => {
                              const newRules = [...settings.slaRules];
                              newRules[idx].resolveWithinHours = Number(e.target.value);
                              handleChange(null, 'slaRules', newRules);
                            }}
                            style={{ width: '70px', marginBottom: 0, fontWeight: 600 }} 
                            className="form-control"
                          />
                          <span style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Hours</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-faint)' }}>
                      No SLAs configured. Wait for backend sync.
                    </div>
                  )}

                  <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)' }} />
                  <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--ink)' }}>Working Hours</h3>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Start Time</label>
                      <input type="time" className="form-control" value={settings.workingHours?.start || '09:00'} onChange={(e) => handleChange('workingHours', 'start', e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>End Time</label>
                      <input type="time" className="form-control" value={settings.workingHours?.end || '18:00'} onChange={(e) => handleChange('workingHours', 'end', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Workflow Configuration */}
                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--ink)' }}>Workflow Configuration</h3>
                  
                  <div className="form-group mb-4">
                    <label className="form-label">Auto Close Days</label>
                    <input type="number" className="form-control" value={settings.workflow?.autoCloseDays || 7} onChange={(e) => handleChange('workflow', 'autoCloseDays', Number(e.target.value))} />
                    <small className="text-muted">Days after resolution to auto-close</small>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">Reopen Limit</label>
                    <input type="number" className="form-control" value={settings.workflow?.reopenLimit || 2} onChange={(e) => handleChange('workflow', 'reopenLimit', Number(e.target.value))} />
                  </div>

                  <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--ink)' }}>Custom Statuses</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {(settings.workflow?.statuses || []).map((status, idx) => (
                      <span key={idx} className="tag-chip" style={{ backgroundColor: status.color, color: '#fff' }}>
                        {status.name} <i className="fa-solid fa-xmark" style={{ fontSize: '12px', cursor: 'pointer' }} onClick={() => removeStatus(idx)}></i>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="text" id="new-status-input" placeholder="New status name" style={{ flex: 1, marginBottom: 0 }} className="form-control" />
                    <button className="btn btn-outline-primary" onClick={() => {
                      const input = document.getElementById('new-status-input');
                      addStatus(input.value);
                      input.value = '';
                    }}>Add</button>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--ink)' }}>Notification Settings</h3>
                  <div className="table-responsive">
                    <table className="table table-borderless table-hover">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Email</th>
                          <th>SMS</th>
                          <th>Push</th>
                          <th>In-App</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Complaint Created', 'Assigned', 'Accepted', 'Started', 'Completed', 'Closed', 'Reopened', 'Escalated', 'Cancelled'].map((evt, idx) => {
                          const rule = (settings.notifications?.events || []).find(r => r.event === evt) || { email: true, sms: false, push: true, inApp: true };
                          const updateRule = (channel, checked) => {
                            const events = [...(settings.notifications?.events || [])];
                            const existingIdx = events.findIndex(r => r.event === evt);
                            if (existingIdx >= 0) {
                              events[existingIdx] = { ...events[existingIdx], [channel]: checked };
                            } else {
                              events.push({ ...rule, event: evt, [channel]: checked });
                            }
                            handleChange('notifications', 'events', events);
                          };
                          return (
                            <tr key={idx}>
                              <td style={{ fontSize: '13px', fontWeight: 500 }}>{evt}</td>
                              <td><input type="checkbox" checked={rule.email} onChange={(e) => updateRule('email', e.target.checked)} /></td>
                              <td><input type="checkbox" checked={rule.sms} onChange={(e) => updateRule('sms', e.target.checked)} /></td>
                              <td><input type="checkbox" checked={rule.push} onChange={(e) => updateRule('push', e.target.checked)} /></td>
                              <td><input type="checkbox" checked={rule.inApp} onChange={(e) => updateRule('inApp', e.target.checked)} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Technician Assignment Rules */}
                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--ink)' }}>Assignment Rules</h3>
                  <div className="form-group mb-3">
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" id="autoAssign" 
                        checked={settings.assignmentRules?.autoAssign || false} 
                        onChange={(e) => handleChange('assignmentRules', 'autoAssign', e.target.checked)} 
                        style={{ width: '40px', height: '20px', cursor: 'pointer', margin: 0 }} />
                      <label className="form-check-label" htmlFor="autoAssign" style={{ margin: 0, fontWeight: 500 }}>Enable Auto Assignment</label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assignment Method</label>
                    <select className="form-control" value={settings.assignmentRules?.method || 'Manual'} onChange={(e) => handleChange('assignmentRules', 'method', e.target.value)}>
                      <option value="Manual">Manual</option>
                      <option value="Round Robin">Round Robin</option>
                      <option value="Workload Based">Workload Based</option>
                      <option value="Skill Based">Skill Based</option>
                      <option value="Department Based">Department Based</option>
                      <option value="Vendor Assignment">Vendor Assignment</option>
                    </select>
                  </div>
                </div>

                {/* Resident Feedback & Rating */}
                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--ink)' }}>Resident Feedback</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.residentFeedback?.enabled || false} onChange={(e) => handleChange('residentFeedback', 'enabled', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0, fontWeight: 500 }}>Enable Resident Feedback</label>
                    </div>
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.residentFeedback?.allowAnonymous || false} onChange={(e) => handleChange('residentFeedback', 'allowAnonymous', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0, fontWeight: 500 }}>Allow Anonymous Feedback</label>
                    </div>
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.residentFeedback?.mandatoryBeforeClosing || false} onChange={(e) => handleChange('residentFeedback', 'mandatoryBeforeClosing', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0, fontWeight: 500 }}>Mandatory Before Closing</label>
                    </div>
                  </div>

                  <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)' }} />
                  <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--ink)' }}>Rating Configuration</h3>
                  
                  <div className="form-group mb-3">
                    <label className="form-label">Rating Scale</label>
                    <select className="form-control" value={settings.ratingConfig?.scale || 5} onChange={(e) => handleChange('ratingConfig', 'scale', Number(e.target.value))}>
                      <option value={3}>3 Stars</option>
                      <option value={5}>5 Stars</option>
                      <option value={10}>10 Stars</option>
                    </select>
                  </div>
                </div>

                {/* Feedback Questions & Comments */}
                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--ink)' }}>Feedback Questions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {(settings.feedbackQuestions || []).map((fq, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '14px' }}>{fq.question}</span>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: fq.isRequired ? 'var(--danger)' : 'var(--ink-faint)' }}>{fq.isRequired ? 'Required' : 'Optional'}</span>
                          <i className="fa-solid fa-trash text-danger" style={{ cursor: 'pointer' }} onClick={() => removeQuestion(idx)}></i>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <input type="text" id="new-question-input" placeholder="e.g. Rate the technician behaviour" style={{ flex: 1, marginBottom: 0 }} className="form-control" />
                    <button className="btn btn-outline-primary" onClick={() => {
                      const input = document.getElementById('new-question-input');
                      addQuestion(input.value);
                      input.value = '';
                    }}>Add</button>
                  </div>
                  
                  <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)' }} />
                  <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--ink)' }}>Comment Settings</h3>
                  <div className="form-group mb-3">
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.commentSettings?.allowComments ?? true} onChange={(e) => handleChange('commentSettings', 'allowComments', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0, fontWeight: 500 }}>Allow Comments</label>
                    </div>
                  </div>
                  <div className="form-group mb-3">
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.commentSettings?.mandatoryForLowRatings ?? true} onChange={(e) => handleChange('commentSettings', 'mandatoryForLowRatings', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0, fontWeight: 500 }}>Mandatory for Low Ratings</label>
                    </div>
                  </div>
                </div>

                {/* Feedback Visibility & Analytics */}
                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--ink)' }}>Feedback Visibility</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {['resident', 'technician', 'facilityManager', 'admin', 'superAdmin'].map((role) => (
                      <div key={role} className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input className="form-check-input" type="checkbox" role="switch" checked={settings.feedbackVisibility?.[role] ?? true} onChange={(e) => handleChange('feedbackVisibility', role, e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                        <label style={{ margin: 0, fontWeight: 500, textTransform: 'capitalize' }}>{role.replace(/([A-Z])/g, ' $1').trim()}</label>
                      </div>
                    ))}
                  </div>

                  <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)' }} />
                  <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--ink)' }}>Feedback Analytics</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {['averageRating', 'technicianRating', 'vendorRating', 'departmentRating', 'monthlyRating', 'residentSatisfaction'].map((metric) => (
                      <div key={metric} className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input className="form-check-input" type="checkbox" role="switch" checked={settings.feedbackAnalytics?.[metric] ?? true} onChange={(e) => handleChange('feedbackAnalytics', metric, e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                        <label style={{ margin: 0, fontWeight: 500, textTransform: 'capitalize' }}>{metric.replace(/([A-Z])/g, ' $1').trim()}</label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* General Settings */}
                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--ink)' }}>General Settings</h3>
                  <div className="form-group mb-3">
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.general?.duplicateDetection || false} onChange={(e) => handleChange('general', 'duplicateDetection', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0, fontWeight: 500 }}>Duplicate Complaint Detection</label>
                    </div>
                  </div>
                  <div className="form-group mb-3">
                    <label className="form-label">Duplicate Time Window (Hours)</label>
                    <input type="number" className="form-control" value={settings.general?.duplicateTimeWindowHours || 24} onChange={(e) => handleChange('general', 'duplicateTimeWindowHours', Number(e.target.value))} />
                  </div>
                  <div className="form-group mb-3">
                    <label className="form-label">Max Attachment Size (MB)</label>
                    <input type="number" className="form-control" value={settings.attachments?.maxSizeMB || 10} onChange={(e) => handleChange('attachments', 'maxSizeMB', Number(e.target.value))} />
                  </div>
                  <div className="form-group mb-3">
                    <label className="form-label">Complaint Number Prefix</label>
                    <input type="text" className="form-control" value={settings.ticketFormat?.prefix || 'CMP'} onChange={(e) => handleChange('ticketFormat', 'prefix', e.target.value)} />
                  </div>
                </div>

              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintSettings;
