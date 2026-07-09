import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useComplaints } from '../hooks/useComplaints';
import toast from 'react-hot-toast';
import ComplaintTopNav from '../components/ComplaintTopNav';
import '../styles/_complaints.scss';

const defaultIcons = {
  'Electrical': 'fa-bolt',
  'Plumbing': 'fa-faucet-drip',
  'Parking': 'fa-car',
  'Security': 'fa-shield-halved',
  'Housekeeping': 'fa-broom',
  'Amenities': 'fa-dumbbell',
  'Landscaping': 'fa-leaf',
  'Elevators': 'fa-elevator'
};

const getCategoryIcon = (name) => defaultIcons[name] || 'fa-screwdriver-wrench';

const CreateComplaint = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { createNewComplaint, uploadFiles, loadSettings, settings, resetErrors } = useComplaints();
  
  // Auto-populate from auth user
  const authUser = useSelector(state => state.auth?.user);
  const user = {
    name: authUser?.firstName ? `${authUser.firstName} ${authUser.lastName || ''}`.trim() : 'Resident',
    id: authUser?._id || 'RES-101',
    flat: authUser?.flat || '',
    floor: authUser?.floor || '',
    block: authUser?.block || '',
    tower: authUser?.tower || '',
    building: authUser?.building || '',
    organization: authUser?.orgId || '',
    mobile: authUser?.mobile || '',
    email: authUser?.email || ''
  };

  useEffect(() => {
    loadSettings();
    return () => resetErrors();
  }, []);

  const dynamicCategories = settings?.categories?.filter(c => c.isActive) || [];

  const displayCategories = [...(dynamicCategories.length > 0 ? dynamicCategories : [
    { name: 'Electrical' }, { name: 'Plumbing' }, { name: 'Parking' }, { name: 'Security' },
    { name: 'Housekeeping' }, { name: 'Amenities' }, { name: 'Landscaping' }, { name: 'Elevators' }
  ]), { name: 'Others' }];

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    name: user.name !== 'Resident' ? user.name : '',
    flat: user.flat ? `${user.block ? user.block + '-' : ''}${user.flat}` : '',
    category: '',
    department: '',
    title: '',
    description: '',
    priority: 'Medium',
    isEmergency: false,
    ignoreDuplicateWarning: false
  });
  const [customCategory, setCustomCategory] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [newTicket, setNewTicket] = useState(null);

  useEffect(() => {
    if (formData.isEmergency) {
      setFormData(prev => ({ ...prev, priority: 'Critical' }));
    }
  }, [formData.isEmergency]);

  const submitComplaint = async (ignoreWarning = false) => {
    try {
      setIsSubmitting(true);
      
      let uploadedUrls = [];
      if (selectedFiles.length > 0) {
        const uploadData = new FormData();
        selectedFiles.forEach(f => uploadData.append('attachments', f));
        uploadedUrls = await uploadFiles(uploadData);
      }

      const submitData = {
        ...formData,
        category: formData.category === 'Others' ? customCategory : formData.category,
        attachments: uploadedUrls,
        location: {
          building: user.building,
          tower: user.tower,
          floor: user.floor,
          flat: formData.flat || user.flat
        },
        residentName: formData.name,
        ignoreDuplicateWarning: ignoreWarning
      };
      
      const res = await createNewComplaint(submitData);
      setNewTicket(res);
      setShowSuccess(true);
      setShowDuplicateWarning(false);
    } catch (err) {
      if (err?.status === 409 || err === 409 || err?.message?.includes('duplicate')) {
        setShowDuplicateWarning(true);
      } else {
        toast.error('Failed to submit ticket');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.category) {
        toast.error('Please select a category');
        return;
      }
      if (formData.category === 'Others' && !customCategory.trim()) {
        toast.error('Please specify the category');
        return;
      }
    }
    
    if (step < 4) {
      setStep(step + 1);
    } else {
      submitComplaint(formData.ignoreDuplicateWarning);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const resetForm = () => {
    setFormData({ 
      name: user.name !== 'Resident' ? user.name : '',
      flat: user.flat ? `${user.block ? user.block + '-' : ''}${user.flat}` : '',
      category: '', department: '', title: '', description: '', priority: 'Medium', isEmergency: false, ignoreDuplicateWarning: false 
    });
    setSelectedFiles([]);
    setStep(1);
    setShowSuccess(false);
    setNewTicket(null);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (validFiles.length < files.length) {
      toast.error('Some files exceed the 10MB limit');
    }
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  if (showSuccess) {
    return (
      <div className="complaints-module-wrapper complaints-os-theme">
        <ComplaintTopNav />
        <div className="view-container">
          <div className="page-header">
            <h1 id="pageTitle">Raise a Ticket</h1>
            <div className="sub" id="pageSub">Log a new facility maintenance request</div>
          </div>
          <div className="content">
            <div className="success-wrap">
              <div className="success-icon"><i className="fa-solid fa-check"></i></div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)' }}>Ticket Submitted</h3>
              <p style={{ color: 'var(--ink-soft)', marginTop: '8px', fontSize: '15px' }}>Your request has been routed to the facility management team.</p>
              
              <div className="ticket-pill" style={{ marginTop: '20px' }}>Ticket ID: #{newTicket?.complaintNumber}</div>
              
              <div className="card" style={{ background: 'var(--bg)', border: 'none', marginTop: '24px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Status</span><b>{newTicket?.status}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Priority</span><b>{newTicket?.priority}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Expected SLA</span><b>{newTicket?.expectedSLA}</b>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                <button className="btn btn-ghost btn-full" onClick={resetForm}>Raise Another</button>
                <button className="btn btn-primary btn-full" onClick={() => navigate('/admin/complaints/my-tickets')}>Track Request</button>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => window.print()}><i className="fa-solid fa-print"></i> Print</button>
                <button className="btn btn-ghost"><i className="fa-solid fa-file-pdf"></i> Download PDF</button>
                <button className="btn btn-ghost"><i className="fa-solid fa-share-nodes"></i> Share</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="complaints-module-wrapper complaints-os-theme">
      <ComplaintTopNav />
      <div className="view-container">
        <div className="view active" id="report">
          <div className="page-header">
            <h1 id="pageTitle">Raise a Ticket</h1>
            <div className="sub" id="pageSub">Log a new facility maintenance request</div>
          </div>
      
      <div className="content">
        <section className="screen active" id="report">
          <div className="form-shell">
            <div className="step-indicator">
              <div className={step >= 1 ? 'done' : ''}></div>
              <div className={step >= 2 ? 'done' : ''}></div>
              <div className={step >= 3 ? 'done' : ''}></div>
              <div className={step >= 4 ? 'done' : ''}></div>
            </div>

            {step === 1 && (
              <div className="form-step active">
                <h3>Select a category</h3>
                <p className="hint">Help us route this ticket to the right department.</p>
                <div className="category-grid">
                  {displayCategories.map((c, i) => (
                    <div 
                      key={i} 
                      className={`category-tile ${formData.category === c.name ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, category: c.name, department: c.name !== 'Others' ? c.name : '' })}
                    >
                      <i className={`fa-solid ${getCategoryIcon(c.name)}`}></i>
                      <span>{c.name}</span>
                    </div>
                  ))}
                </div>
                {formData.category === 'Others' && (
                  <div className="form-group" style={{ marginTop: '20px' }}>
                    <label className="field-label">Please specify category</label>
                    <input 
                      type="text" 
                      placeholder="Enter category name..." 
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="form-step active">


                <h3>Describe the issue</h3>
                <p className="hint">Provide clear details for the maintenance team.</p>
                <label className="field-label">Subject</label>
                <input 
                  type="text" 
                  placeholder="e.g., Kitchen tap leaking" 
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
                
                <label className="field-label">Detailed Description</label>
                <textarea 
                  placeholder="Please describe the problem, exact location, and when it started..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>
            )}

            {step === 3 && (
              <div className="form-step active">
                <h3>Upload Supporting Images</h3>
                <p className="hint">Visuals help our team resolve issues faster. (Optional)</p>
                <input type="file" id="fileUpload" multiple style={{ display: 'none' }} onChange={handleFileSelect} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,video/mp4,video/webm" />
                <label htmlFor="fileUpload" className="photo-drop" style={{ display: 'block', cursor: 'pointer' }}>
                  <i className="fa-solid fa-cloud-arrow-up" style={{fontSize: '24px', marginBottom: '8px'}}></i>
                  <b style={{ display: 'block', marginBottom: '4px', color: 'var(--ink)' }}>Click to upload</b>
                  <span style={{ fontSize: '13px' }}>Images, PDF, Docs, Video (Max 5 files, 10MB each)</span>
                </label>
                <div className="photo-thumbs">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="photo-thumb" style={{ position: 'relative', overflow: 'hidden' }}>
                      <i className="fa-solid fa-file" style={{ fontSize: '24px', color: 'var(--ink-soft)' }}></i>
                      <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', textAlign: 'center' }}>
                        {file.name.substring(0, 10)}
                      </div>
                      <button 
                        onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="form-step active">
                <h3>Set Urgency</h3>
                <p className="hint">Select the priority level for this request.</p>
                <div className="priority-row" style={{ opacity: formData.isEmergency ? 0.5 : 1, pointerEvents: formData.isEmergency ? 'none' : 'auto' }}>
                  <div 
                    className={`priority-pill ${formData.priority === 'Low' || formData.priority === 'Medium' ? 'selected' : ''}`} 
                    style={{ color: 'var(--ink-soft)', borderColor: 'var(--border)' }}
                    onClick={() => setFormData({ ...formData, priority: 'Medium' })}
                  >
                    Standard<br/><span style={{ fontSize: '12px', fontWeight: 400 }}>48h SLA</span>
                  </div>
                  <div 
                    className={`priority-pill ${formData.priority === 'High' ? 'selected' : ''}`} 
                    style={{ color: '#D97706', borderColor: '#FDE68A' }}
                    onClick={() => setFormData({ ...formData, priority: 'High' })}
                  >
                    High<br/><span style={{ fontSize: '12px', fontWeight: 400 }}>24h SLA</span>
                  </div>
                  <div 
                    className={`priority-pill ${formData.priority === 'Critical' ? 'selected' : ''}`} 
                    style={{ color: '#DC2626', borderColor: '#FECACA' }}
                    onClick={() => setFormData({ ...formData, priority: 'Critical' })}
                  >
                    Critical<br/><span style={{ fontSize: '12px', fontWeight: 400 }}>Immediate</span>
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="emergencyToggle" 
                    checked={formData.isEmergency} 
                    onChange={e => setFormData({ ...formData, isEmergency: e.target.checked })}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <label htmlFor="emergencyToggle" style={{ margin: 0, fontWeight: 600, color: '#DC2626' }}>
                    🚨 This is an Emergency
                  </label>
                </div>

                <h3 style={{ marginTop: '24px' }}>Ticket Summary</h3>
                <div className="card" style={{ background: 'var(--bg)', border: 'none', marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>Department</span><b>{formData.category || 'Not Selected'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>Priority</span><b>{formData.priority}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                    <span>Attachments</span><b>{selectedFiles.length} files</b>
                  </div>
                </div>
              </div>
            )}

            {showDuplicateWarning && (
              <div style={{ padding: '16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ color: '#D97706', fontWeight: 600, marginBottom: '8px' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> Possible Duplicate Complaint
                </p>
                <p style={{ fontSize: '14px', marginBottom: '12px' }}>
                  A similar complaint already exists. Do you still want to continue?
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-primary" onClick={() => submitComplaint(true)}>Yes, Continue</button>
                  <button className="btn btn-ghost" onClick={() => setShowDuplicateWarning(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div className="form-nav">
              <button 
                className="btn btn-ghost" 
                onClick={prevStep} 
                style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
                disabled={isSubmitting || showDuplicateWarning}
              >
                <i className="fa-solid fa-arrow-left"></i> Back
              </button>
              
              <button 
                className="btn btn-primary" 
                onClick={nextStep}
                disabled={
                  (step === 1 && !formData.category) ||
                  (step === 2 && (!formData.title || !formData.description)) ||
                  isSubmitting || showDuplicateWarning
                }
              >
                {step === 4 ? (
                  isSubmitting ? 'Submitting...' : <>Submit Ticket <i className="fa-solid fa-paper-plane"></i></>
                ) : (
                  <>Continue <i className="fa-solid fa-arrow-right"></i></>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
        </div>
      </div>
    </div>
  );
};

export default CreateComplaint;


