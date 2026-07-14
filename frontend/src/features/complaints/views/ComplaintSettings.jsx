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
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(null);

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
      categories: [...(prev.categories || []), { name, description: '', isActive: true, order: 0, suggestedIssues: [] }]
    }));
  };

  const removeCategory = (idx) => {
    setSettings(prev => {
      const cats = [...(prev.categories || [])];
      cats.splice(idx, 1);
      return { ...prev, categories: cats };
    });
    if (activeCategoryIdx === idx) setActiveCategoryIdx(null);
  };

  const addSuggestedIssue = (catIdx, issueName) => {
    if (!issueName) return;
    setSettings(prev => {
      const cats = [...(prev.categories || [])];
      if (!cats[catIdx].suggestedIssues) cats[catIdx].suggestedIssues = [];
      const order = cats[catIdx].suggestedIssues.length;
      cats[catIdx].suggestedIssues.push({ name: issueName, isActive: true, order, usageCount: 0 });
      return { ...prev, categories: cats };
    });
  };

  const removeSuggestedIssue = (catIdx, issueIdx) => {
    setSettings(prev => {
      const cats = [...(prev.categories || [])];
      cats[catIdx].suggestedIssues.splice(issueIdx, 1);
      return { ...prev, categories: cats };
    });
  };

  const toggleSuggestedIssue = (catIdx, issueIdx) => {
    setSettings(prev => {
      const cats = [...(prev.categories || [])];
      cats[catIdx].suggestedIssues[issueIdx].isActive = !cats[catIdx].suggestedIssues[issueIdx].isActive;
      return { ...prev, categories: cats };
    });
  };

  const archiveSuggestedIssue = (catIdx, issueIdx) => {
    setSettings(prev => {
      const cats = [...(prev.categories || [])];
      cats[catIdx].suggestedIssues[issueIdx].isActive = false;
      cats[catIdx].suggestedIssues[issueIdx].isArchived = true;
      return { ...prev, categories: cats };
    });
  };
  
  const moveSuggestedIssue = (catIdx, issueIdx, dir) => {
    setSettings(prev => {
      const cats = [...(prev.categories || [])];
      const issues = cats[catIdx].suggestedIssues;
      if (dir === 'up' && issueIdx > 0) {
        [issues[issueIdx - 1], issues[issueIdx]] = [issues[issueIdx], issues[issueIdx - 1]];
      } else if (dir === 'down' && issueIdx < issues.length - 1) {
        [issues[issueIdx + 1], issues[issueIdx]] = [issues[issueIdx], issues[issueIdx + 1]];
      }
      return { ...prev, categories: cats };
    });
  };

  const activeCategoryData = activeCategoryIdx !== null && settings.categories?.[activeCategoryIdx] ? settings.categories[activeCategoryIdx] : null;

  const issueAnalytics = React.useMemo(() => {
    if (!activeCategoryData || !activeCategoryData.suggestedIssues) return null;
    const issues = activeCategoryData.suggestedIssues;
    const activeCount = issues.filter(i => i.isActive && !i.isArchived).length;
    const disabledCount = issues.filter(i => !i.isActive && !i.isArchived).length;
    const archivedCount = issues.filter(i => i.isArchived).length;
    const neverUsedCount = issues.filter(i => i.usageCount === 0 && !i.isArchived).length;
    const sortedByUsage = [...issues].filter(i => !i.isArchived).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    
    return {
      activeCount,
      disabledCount,
      archivedCount,
      neverUsedCount,
      mostUsed: sortedByUsage[0] || null,
      leastUsed: sortedByUsage[sortedByUsage.length - 1] || null
    };
  }, [activeCategoryData]);

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ margin: 0 }} className="fs-2">System Settings</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }} className="fw-medium">Configure departments, priorities, SLAs, workflows and feedback</p>
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fa-solid fa-save" style={{ marginRight: '8px' }}></i>}
              Save Changes
            </button>
          </div>
      
              <div className="grid grid-2">
                
                {/* Departments & Categories */}
                <div className="card">
                  <h3 style={{ marginBottom: '20px', color: 'var(--ink)' }} className="fs-6">Departments</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {(settings.departments || []).map((dep, idx) => (
                      <span key={idx} className="tag-chip">
                        {dep.name} <i className="small fa-solid fa-xmark" style={{ cursor: 'pointer' }} onClick={() => removeDepartment(idx)}></i>
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

                  <h3 style={{ marginBottom: '20px', color: 'var(--ink)' }} className="fs-6">Categories & Issues</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {(settings.categories || []).map((cat, idx) => (
                      <span key={idx} className={`tag-chip ${activeCategoryIdx === idx ? 'selected' : ''}`} style={activeCategoryIdx === idx ? { backgroundColor: 'var(--primary)', color: 'white' } : { cursor: 'pointer' }} onClick={() => setActiveCategoryIdx(activeCategoryIdx === idx ? null : idx)}>
                        {cat.name} <i className="small fa-solid fa-xmark" style={{ cursor: 'pointer', marginLeft: '6px' }} onClick={(e) => { e.stopPropagation(); removeCategory(idx); }}></i>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <input type="text" id="new-cat-input" placeholder="New category name" style={{ flex: 1, marginBottom: 0 }} className="form-control" />
                    <button className="btn btn-outline-primary" onClick={() => {
                      const input = document.getElementById('new-cat-input');
                      addCategory(input.value);
                      input.value = '';
                    }}>Add Category</button>
                  </div>
                  
                  {activeCategoryData && (
                    <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '16px' }}>
                      <h4 style={{ marginBottom: '16px', color: 'var(--ink)' }} className="small">
                        Suggested Issues for {activeCategoryData.name}
                      </h4>
                      
                      {issueAnalytics && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--ink-soft)' }} className="small">Active vs Disabled</div>
                            <div style={{ color: 'var(--ink)', marginTop: '4px' }} className="fw-bold fs-6">{issueAnalytics.activeCount} / {issueAnalytics.disabledCount}</div>
                          </div>
                          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--ink-soft)' }} className="small">Never Used</div>
                            <div style={{ color: 'var(--warning)', marginTop: '4px' }} className="fw-bold fs-6">{issueAnalytics.neverUsedCount}</div>
                          </div>
                          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--ink-soft)' }} className="small">Most Used</div>
                            <div style={{ color: 'var(--primary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="fw-bold small">{issueAnalytics.mostUsed?.name || 'N/A'}</div>
                          </div>
                          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--ink-soft)' }} className="small">Least Used</div>
                            <div style={{ color: 'var(--danger)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="fw-bold small">{issueAnalytics.leastUsed?.name || 'N/A'}</div>
                          </div>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <input type="text" id="new-issue-input" placeholder="E.g., Tap Leakage" style={{ flex: 1, marginBottom: 0 }} className="form-control form-control-sm" />
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          const input = document.getElementById('new-issue-input');
                          addSuggestedIssue(activeCategoryIdx, input.value);
                          input.value = '';
                        }}>Add Issue</button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {!(activeCategoryData.suggestedIssues?.filter(i => !i.isArchived).length > 0) && (
                          <div style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }} className="small">No active suggested issues added yet.</div>
                        )}
                        {(activeCategoryData.suggestedIssues || []).map((issue, issueIdx) => {
                          if (issue.isArchived) return null;
                          return (
                            <div key={issueIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <i className="fa-solid fa-grip-vertical" style={{ color: 'var(--ink-faint)', cursor: 'grab' }}></i>
                                <span style={{ color: issue.isActive ? 'var(--ink)' : 'var(--ink-faint)', textDecoration: issue.isActive ? 'none' : 'line-through' }} className="small">{issue.name}</span>
                                {issue.usageCount > 0 ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '12px', color: 'var(--ink-soft)' }} className="small">Used {issue.usageCount} times</span>
                                    {issue.lastUsedDate && <span style={{ color: 'var(--ink-faint)' }} className="small">Last used: {new Date(issue.lastUsedDate).toLocaleDateString()}</span>}
                                  </div>
                                ) : (
                                  <span style={{ background: 'var(--warning-soft)', padding: '2px 6px', borderRadius: '12px', color: 'var(--warning)', border: '1px solid var(--warning)' }} className="small">
                                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i> Never Used
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {issue.usageCount === 0 && (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {issue.isActive && <button className="small btn btn-sm btn-outline-warning" style={{ padding: '2px 8px' }} onClick={() => toggleSuggestedIssue(activeCategoryIdx, issueIdx)}>Disable</button>}
                                    <button className="small btn btn-sm btn-outline-secondary" style={{ padding: '2px 8px' }} onClick={() => { if(window.confirm('Archive this suggestion? It will no longer appear in the UI.')) archiveSuggestedIssue(activeCategoryIdx, issueIdx); }}>Archive</button>
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <i className="fa-solid fa-caret-up" style={{ cursor: 'pointer', color: issueIdx === 0 ? 'var(--border)' : 'var(--ink-soft)' }} onClick={() => moveSuggestedIssue(activeCategoryIdx, issueIdx, 'up')}></i>
                                  <i className="fa-solid fa-caret-down" style={{ cursor: 'pointer', color: issueIdx === activeCategoryData.suggestedIssues.length - 1 ? 'var(--border)' : 'var(--ink-soft)' }} onClick={() => moveSuggestedIssue(activeCategoryIdx, issueIdx, 'down')}></i>
                                </div>
                                <label className="switch" style={{ margin: 0 }}>
                                  <input type="checkbox" checked={issue.isActive !== false} onChange={() => toggleSuggestedIssue(activeCategoryIdx, issueIdx)} />
                                  <span className="slider round"></span>
                                </label>
                                <i className="fa-solid fa-trash" style={{ color: 'var(--danger)', cursor: 'pointer' }} onClick={() => { if(window.confirm('Permanently delete this suggestion?')) removeSuggestedIssue(activeCategoryIdx, issueIdx); }}></i>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* SLAs & Priorities */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ color: 'var(--ink)', margin: 0 }} className="fs-6">Service Level Agreements (SLA) & Priorities</h3>
                  </div>
                  
                  {settings.slaRules && settings.slaRules.length > 0 ? (
                    settings.slaRules.map((rule, idx) => (
                      <div className="settings-row" key={idx}>
                        <div>
                          <span className={`badge ${rule.priority.toLowerCase()}`}>{rule.priority}</span>
                          <div style={{ color: 'var(--ink-faint)', marginTop: '4px' }} className="small">Resolve within</div>
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
                          <span style={{ color: 'var(--ink-soft)' }} className="small">Hours</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-faint)' }}>
                      No SLAs configured. Wait for backend sync.
                    </div>
                  )}

                  <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)' }} />
                  <h3 style={{ marginBottom: '16px', color: 'var(--ink)' }} className="small">Working Hours</h3>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label  className="small">Start Time</label>
                      <input type="time" className="form-control" value={settings.workingHours?.start || '09:00'} onChange={(e) => handleChange('workingHours', 'start', e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label  className="small">End Time</label>
                      <input type="time" className="form-control" value={settings.workingHours?.end || '18:00'} onChange={(e) => handleChange('workingHours', 'end', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Workflow Configuration */}
                <div className="card">
                  <h3 style={{ marginBottom: '20px', color: 'var(--ink)' }} className="fs-6">Workflow Configuration</h3>
                  
                  <div className="form-group mb-4">
                    <label className="form-label">Auto Close Days</label>
                    <input type="number" className="form-control" value={settings.workflow?.autoCloseDays || 7} onChange={(e) => handleChange('workflow', 'autoCloseDays', Number(e.target.value))} />
                    <small className="text-muted">Days after resolution to auto-close</small>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">Reopen Limit</label>
                    <input type="number" className="form-control" value={settings.workflow?.reopenLimit || 2} onChange={(e) => handleChange('workflow', 'reopenLimit', Number(e.target.value))} />
                  </div>

                  <h3 style={{ marginBottom: '16px', color: 'var(--ink)' }} className="small">Custom Statuses</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {(settings.workflow?.statuses || []).map((status, idx) => (
                      <span key={idx} className="tag-chip" style={{ backgroundColor: status.color, color: '#fff' }}>
                        {status.name} <i className="small fa-solid fa-xmark" style={{ cursor: 'pointer' }} onClick={() => removeStatus(idx)}></i>
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
                  <h3 style={{ marginBottom: '20px', color: 'var(--ink)' }} className="fs-6">Notification Settings</h3>
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
                              <td  className="fw-medium small">{evt}</td>
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
                  <h3 style={{ marginBottom: '20px', color: 'var(--ink)' }} className="fs-6">Assignment Rules</h3>
                  <div className="form-group mb-3">
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" id="autoAssign" 
                        checked={settings.assignmentRules?.autoAssign || false} 
                        onChange={(e) => handleChange('assignmentRules', 'autoAssign', e.target.checked)} 
                        style={{ width: '40px', height: '20px', cursor: 'pointer', margin: 0 }} />
                      <label className="fw-medium form-check-label" htmlFor="autoAssign" style={{ margin: 0 }}>Enable Auto Assignment</label>
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
                  <h3 style={{ marginBottom: '20px', color: 'var(--ink)' }} className="fs-6">Resident Feedback</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.residentFeedback?.enabled || false} onChange={(e) => handleChange('residentFeedback', 'enabled', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0 }} className="fw-medium">Enable Resident Feedback</label>
                    </div>
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.residentFeedback?.allowAnonymous || false} onChange={(e) => handleChange('residentFeedback', 'allowAnonymous', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0 }} className="fw-medium">Allow Anonymous Feedback</label>
                    </div>
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.residentFeedback?.mandatoryBeforeClosing || false} onChange={(e) => handleChange('residentFeedback', 'mandatoryBeforeClosing', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0 }} className="fw-medium">Mandatory Before Closing</label>
                    </div>
                  </div>

                  <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)' }} />
                  <h3 style={{ marginBottom: '16px', color: 'var(--ink)' }} className="small">Rating Configuration</h3>
                  
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
                  <h3 style={{ marginBottom: '20px', color: 'var(--ink)' }} className="fs-6">Feedback Questions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {(settings.feedbackQuestions || []).map((fq, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span  className="small">{fq.question}</span>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ color: fq.isRequired ? 'var(--danger)' : 'var(--ink-faint)' }} className="small">{fq.isRequired ? 'Required' : 'Optional'}</span>
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
                  <h3 style={{ marginBottom: '16px', color: 'var(--ink)' }} className="small">Comment Settings</h3>
                  <div className="form-group mb-3">
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.commentSettings?.allowComments ?? true} onChange={(e) => handleChange('commentSettings', 'allowComments', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0 }} className="fw-medium">Allow Comments</label>
                    </div>
                  </div>
                  <div className="form-group mb-3">
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.commentSettings?.mandatoryForLowRatings ?? true} onChange={(e) => handleChange('commentSettings', 'mandatoryForLowRatings', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0 }} className="fw-medium">Mandatory for Low Ratings</label>
                    </div>
                  </div>
                </div>

                {/* Feedback Visibility & Analytics */}
                <div className="card">
                  <h3 style={{ marginBottom: '20px', color: 'var(--ink)' }} className="fs-6">Feedback Visibility</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {['resident', 'technician', 'facilityManager', 'admin', 'superAdmin'].map((role) => (
                      <div key={role} className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input className="form-check-input" type="checkbox" role="switch" checked={settings.feedbackVisibility?.[role] ?? true} onChange={(e) => handleChange('feedbackVisibility', role, e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                        <label style={{ margin: 0, textTransform: 'capitalize' }} className="fw-medium">{role.replace(/([A-Z])/g, ' $1').trim()}</label>
                      </div>
                    ))}
                  </div>

                  <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)' }} />
                  <h3 style={{ marginBottom: '16px', color: 'var(--ink)' }} className="small">Feedback Analytics</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {['averageRating', 'technicianRating', 'vendorRating', 'departmentRating', 'monthlyRating', 'residentSatisfaction'].map((metric) => (
                      <div key={metric} className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input className="form-check-input" type="checkbox" role="switch" checked={settings.feedbackAnalytics?.[metric] ?? true} onChange={(e) => handleChange('feedbackAnalytics', metric, e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                        <label style={{ margin: 0, textTransform: 'capitalize' }} className="fw-medium">{metric.replace(/([A-Z])/g, ' $1').trim()}</label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* General Settings */}
                <div className="card">
                  <h3 style={{ marginBottom: '20px', color: 'var(--ink)' }} className="fs-6">General Settings</h3>
                  <div className="form-group mb-3">
                    <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-check-input" type="checkbox" role="switch" checked={settings.general?.duplicateDetection || false} onChange={(e) => handleChange('general', 'duplicateDetection', e.target.checked)} style={{ width: '40px', height: '20px', margin: 0 }} />
                      <label style={{ margin: 0 }} className="fw-medium">Duplicate Complaint Detection</label>
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
        </div>
      </div>
    </div>
  );
};

export default ComplaintSettings;
