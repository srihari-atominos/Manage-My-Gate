import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useComplaints } from '../hooks/useComplaints';
import toast from 'react-hot-toast';
import ComplaintTopNav from '../components/ComplaintTopNav';
import { userPreferencesService } from '../services/userPreferences.service';
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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateTicketData, setDuplicateTicketData] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [newTicket, setNewTicket] = useState(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedSuggestionIdx, setFocusedSuggestionIdx] = useState(-1);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const activeSuggestedIssues = React.useMemo(() => {
    if (!formData.category) return [];
    const selectedCategoryData = settings?.categories?.find(c => c.name === formData.category);
    
    // Fallback mock data for demonstration if settings are empty
    let issues = selectedCategoryData?.suggestedIssues;
    if (!issues || issues.length === 0) {
      const mockData = {
        'Plumbing': [
          { name: 'Kitchen Tap Leakage', isActive: true, usageCount: 45, isArchived: false, order: 0 },
          { name: 'Bathroom Tap Leakage', isActive: true, usageCount: 30, isArchived: false, order: 1 },
          { name: 'Flush Tank Not Working', isActive: true, usageCount: 25, isArchived: false, order: 2 },
          { name: 'Washbasin Pipe Blocked', isActive: true, usageCount: 20, isArchived: false, order: 3 },
          { name: 'Kitchen Sink Blocked', isActive: true, usageCount: 18, isArchived: false, order: 4 },
          { name: 'No Water Supply in Bathroom', isActive: true, usageCount: 15, isArchived: false, order: 5 },
          { name: 'Low Water Pressure', isActive: true, usageCount: 12, isArchived: false, order: 6 },
          { name: 'Pipe Burst in Utility', isActive: true, usageCount: 5, isArchived: false, order: 7 },
          { name: 'Sewage Smell from Drain', isActive: true, usageCount: 8, isArchived: false, order: 8 },
          { name: 'Shower Head Broken', isActive: true, usageCount: 10, isArchived: false, order: 9 },
          { name: 'Geyser Pipe Leaking', isActive: true, usageCount: 14, isArchived: false, order: 10 },
          { name: 'Water Seepage on Ceiling', isActive: true, usageCount: 3, isArchived: false, order: 11 },
          { name: 'Main Valve Jammed', isActive: true, usageCount: 2, isArchived: false, order: 12 }
        ],
        'Electrical': [
          { name: 'Power Outage in Flat', isActive: true, usageCount: 50, isArchived: false, order: 0 },
          { name: 'MCB Tripping Frequently', isActive: true, usageCount: 35, isArchived: false, order: 1 },
          { name: 'Tube Light Replacement', isActive: true, usageCount: 25, isArchived: false, order: 2 },
          { name: 'Fan Regulator Not Working', isActive: true, usageCount: 20, isArchived: false, order: 3 },
          { name: 'Switch Board Sparking', isActive: true, usageCount: 15, isArchived: false, order: 4 },
          { name: 'Socket Not Working', isActive: true, usageCount: 18, isArchived: false, order: 5 },
          { name: 'Exhaust Fan Repair', isActive: true, usageCount: 12, isArchived: false, order: 6 },
          { name: 'AC Point Not Working', isActive: true, usageCount: 10, isArchived: false, order: 7 },
          { name: 'Geyser Switch Burnt', isActive: true, usageCount: 8, isArchived: false, order: 8 },
          { name: 'Intercom Dead', isActive: true, usageCount: 40, isArchived: false, order: 9 },
          { name: 'Door Bell Not Working', isActive: true, usageCount: 22, isArchived: false, order: 10 },
          { name: 'Balcony Light Issue', isActive: true, usageCount: 14, isArchived: false, order: 11 }
        ],
        'Parking': [
          { name: 'Someone Parked in My Slot', isActive: true, usageCount: 30, isArchived: false, order: 0 },
          { name: 'Unknown Vehicle in Visitor Parking', isActive: true, usageCount: 20, isArchived: false, order: 1 },
          { name: 'Car Wash Area Dirty', isActive: true, usageCount: 15, isArchived: false, order: 2 },
          { name: 'Basement Light Not Working', isActive: true, usageCount: 12, isArchived: false, order: 3 },
          { name: 'Pillar Guard Damaged', isActive: true, usageCount: 5, isArchived: false, order: 4 },
          { name: 'Water Logging in Parking', isActive: true, usageCount: 8, isArchived: false, order: 5 },
          { name: 'Two-Wheeler Parked Improperly', isActive: true, usageCount: 18, isArchived: false, order: 6 },
          { name: 'EV Charger Not Working', isActive: true, usageCount: 10, isArchived: false, order: 7 },
          { name: 'Speed Breaker Damaged', isActive: true, usageCount: 3, isArchived: false, order: 8 },
          { name: 'Parking Sticker Issue', isActive: true, usageCount: 22, isArchived: false, order: 9 }
        ],
        'Security': [
          { name: 'Guard Not Present at Gate', isActive: true, usageCount: 15, isArchived: false, order: 0 },
          { name: 'Unattended Delivery Package', isActive: true, usageCount: 20, isArchived: false, order: 1 },
          { name: 'Visitor Allowed Without Approval', isActive: true, usageCount: 25, isArchived: false, order: 2 },
          { name: 'Main Gate Boom Barrier Broken', isActive: true, usageCount: 5, isArchived: false, order: 3 },
          { name: 'CCTV Camera Not Pointing Right', isActive: true, usageCount: 8, isArchived: false, order: 4 },
          { name: 'Suspicious Person in Block', isActive: true, usageCount: 12, isArchived: false, order: 5 },
          { name: 'Maid Registration Issue', isActive: true, usageCount: 30, isArchived: false, order: 6 },
          { name: 'Patrolling Not Done at Night', isActive: true, usageCount: 10, isArchived: false, order: 7 },
          { name: 'Security App Not Syncing', isActive: true, usageCount: 18, isArchived: false, order: 8 },
          { name: 'ID Card Not Checked', isActive: true, usageCount: 22, isArchived: false, order: 9 }
        ],
        'Housekeeping': [
          { name: 'Corridor Not Swept', isActive: true, usageCount: 35, isArchived: false, order: 0 },
          { name: 'Garbage Not Collected', isActive: true, usageCount: 50, isArchived: false, order: 1 },
          { name: 'Dustbin Smelling in Lobby', isActive: true, usageCount: 20, isArchived: false, order: 2 },
          { name: 'Staircase Dirty', isActive: true, usageCount: 15, isArchived: false, order: 3 },
          { name: 'Lift Not Cleaned', isActive: true, usageCount: 18, isArchived: false, order: 4 },
          { name: 'Clubhouse Restroom Dirty', isActive: true, usageCount: 12, isArchived: false, order: 5 },
          { name: 'Basement Sweeping Pending', isActive: true, usageCount: 10, isArchived: false, order: 6 },
          { name: 'Dead Bird/Animal in Premises', isActive: true, usageCount: 5, isArchived: false, order: 7 },
          { name: 'Spider Webs in Corridor', isActive: true, usageCount: 8, isArchived: false, order: 8 },
          { name: 'Staff Misbehavior', isActive: true, usageCount: 3, isArchived: false, order: 9 }
        ],
        'Amenities': [
          { name: 'Gym AC Not Working', isActive: true, usageCount: 25, isArchived: false, order: 0 },
          { name: 'Treadmill Belt Broken', isActive: true, usageCount: 15, isArchived: false, order: 1 },
          { name: 'Swimming Pool Water Unclean', isActive: true, usageCount: 30, isArchived: false, order: 2 },
          { name: 'Clubhouse TV Not Working', isActive: true, usageCount: 10, isArchived: false, order: 3 },
          { name: 'Table Tennis Rackets Missing', isActive: true, usageCount: 18, isArchived: false, order: 4 },
          { name: 'Badminton Court Net Torn', isActive: true, usageCount: 12, isArchived: false, order: 5 },
          { name: 'Party Hall AC Issue', isActive: true, usageCount: 8, isArchived: false, order: 6 },
          { name: 'Library Lights Not Working', isActive: true, usageCount: 5, isArchived: false, order: 7 },
          { name: 'Steam Room Not Heating', isActive: true, usageCount: 14, isArchived: false, order: 8 },
          { name: 'Booking Conflict', isActive: true, usageCount: 20, isArchived: false, order: 9 }
        ],
        'Landscaping': [
          { name: 'Plants Drying in Garden', isActive: true, usageCount: 15, isArchived: false, order: 0 },
          { name: 'Grass Needs Trimming', isActive: true, usageCount: 20, isArchived: false, order: 1 },
          { name: 'Sprinkler Broken', isActive: true, usageCount: 12, isArchived: false, order: 2 },
          { name: 'Fallen Branches', isActive: true, usageCount: 8, isArchived: false, order: 3 },
          { name: 'Mosquito Fogging Required', isActive: true, usageCount: 40, isArchived: false, order: 4 },
          { name: 'Snake/Reptile Spotted', isActive: true, usageCount: 3, isArchived: false, order: 5 },
          { name: 'Weeds Growing on Pathway', isActive: true, usageCount: 10, isArchived: false, order: 6 },
          { name: 'Garden Lights Not Working', isActive: true, usageCount: 18, isArchived: false, order: 7 },
          { name: 'Fountain Not Working', isActive: true, usageCount: 5, isArchived: false, order: 8 },
          { name: 'Pest Control Needed in Lobby', isActive: true, usageCount: 25, isArchived: false, order: 9 }
        ],
        'Elevators': [
          { name: 'Lift Stuck', isActive: true, usageCount: 15, isArchived: false, order: 0 },
          { name: 'Lift Making Noise', isActive: true, usageCount: 25, isArchived: false, order: 1 },
          { name: 'Lift Fan Not Working', isActive: true, usageCount: 30, isArchived: false, order: 2 },
          { name: 'Lift Light Not Working', isActive: true, usageCount: 20, isArchived: false, order: 3 },
          { name: 'Lift Buttons Unresponsive', isActive: true, usageCount: 12, isArchived: false, order: 4 },
          { name: 'Display Screen Blank', isActive: true, usageCount: 8, isArchived: false, order: 5 },
          { name: 'Door Closing Too Fast', isActive: true, usageCount: 10, isArchived: false, order: 6 },
          { name: 'Jerky Movement', isActive: true, usageCount: 18, isArchived: false, order: 7 },
          { name: 'Service Lift Misused', isActive: true, usageCount: 22, isArchived: false, order: 8 },
          { name: 'Lift Floor Not Cleaned', isActive: true, usageCount: 14, isArchived: false, order: 9 }
        ]
      };
      issues = mockData[formData.category] || [];
    }
    
    const recent = userPreferencesService.getRecentlyUsedIssues(user?._id, formData.category) || [];
    
    return issues
      .filter(issue => issue.isActive !== false)
      .map(issue => ({
        ...issue,
        isRecent: recent.includes(issue.name),
        isTrending: issue.usageCount >= (issues[0]?.usageCount || 0) && issue.usageCount > 5 // simple threshold for trending
      }))
      .sort((a, b) => {
        // 1. Recently Used
        if (a.isRecent && !b.isRecent) return -1;
        if (!a.isRecent && b.isRecent) return 1;
        if (a.isRecent && b.isRecent) return recent.indexOf(a.name) - recent.indexOf(b.name);
        
        // 2. Trending
        if (b.usageCount !== a.usageCount) return (b.usageCount || 0) - (a.usageCount || 0);
        
        // 3. Order
        if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
        return a.name.localeCompare(b.name);
      });
  }, [settings?.categories, formData.category, user?._id]);
    
  const filteredSuggestions = React.useMemo(() => {
    if (!formData.title) return activeSuggestedIssues;
    const lowerTitle = formData.title.toLowerCase();
    
    return [...activeSuggestedIssues].filter(issue => issue.name.toLowerCase().includes(lowerTitle))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // 1. Exact Match
        if (aName === lowerTitle && bName !== lowerTitle) return -1;
        if (bName === lowerTitle && aName !== lowerTitle) return 1;
        
        // 2. Starts With
        const aStarts = aName.startsWith(lowerTitle);
        const bStarts = bName.startsWith(lowerTitle);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // 3. Word Match
        const wordRegex = new RegExp(`\\b${lowerTitle}\\b`);
        const aWord = wordRegex.test(aName);
        const bWord = wordRegex.test(bName);
        if (aWord && !bWord) return -1;
        if (!aWord && bWord) return 1;
        
        // 4. Contains (fallback to default sort)
        return 0;
      });
  }, [activeSuggestedIssues, formData.title]);

  const globalCategoryRecommendations = React.useMemo(() => {
    if (!globalSearchTerm || !settings?.categories) return [];
    const lowerTerm = globalSearchTerm.toLowerCase();
    
    let scores = [];
    settings.categories.forEach(cat => {
      let score = 0;
      if (cat.name.toLowerCase().includes(lowerTerm)) score += 50;
      
      const matchIssues = cat.suggestedIssues?.filter(i => i.isActive !== false && i.name.toLowerCase().includes(lowerTerm)) || [];
      if (matchIssues.length > 0) {
        score += 30;
        // exact match in issues gets more weight
        if (matchIssues.some(i => i.name.toLowerCase() === lowerTerm)) score += 20;
      }
      
      if (score > 0) {
        scores.push({ name: cat.name, score });
      }
    });
    
    return scores.sort((a, b) => b.score - a.score);
  }, [globalSearchTerm, settings?.categories]);

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredSuggestions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestionIdx(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestionIdx(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedSuggestionIdx >= 0 && focusedSuggestionIdx < filteredSuggestions.length) {
        setFormData({ ...formData, title: filteredSuggestions[focusedSuggestionIdx].name });
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

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
          building: user?.building || '',
          tower: user?.villaBlock || user?.tower || '',
          floor: user?.floor || '',
          flat: formData.flat || user?.villaNumber || user?.flat || ''
        },
        residentName: formData.name || user?.username || user?.firstName || '',
        ignoreDuplicateWarning: ignoreWarning
      };
      
      const res = await createNewComplaint(submitData);
      
      if (submitData.title) {
        userPreferencesService.addRecentlyUsedIssue(user?._id, submitData.category, submitData.title);
      }
      
      setNewTicket(res);
      setShowSuccess(true);
      setShowDuplicateWarning(false);
    } catch (err) {
      if (err?.status === 409 || err === 409 || err?.message?.includes('duplicate')) {
        setDuplicateTicketData(err?.data?.duplicateTicket || null);
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
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .success-wrap, .success-wrap * {
              visibility: visible;
            }
            .success-wrap {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
            }
            .success-wrap button {
              display: none !important;
            }
          }
        `}</style>
        <ComplaintTopNav />
        <div className="view-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>Raise a Ticket</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Log a new facility maintenance request</p>
            </div>
          </div>
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
                <button className="btn btn-ghost" onClick={() => window.print()}><i className="fa-solid fa-file-pdf"></i> Download PDF</button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>Raise a Ticket</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Log a new facility maintenance request</p>
            </div>
          </div>
          <div className="form-shell">
            <div className="step-indicator">
              <div className={step >= 1 ? 'done' : ''}></div>
              <div className={step >= 2 ? 'done' : ''}></div>
              <div className={step >= 3 ? 'done' : ''}></div>
              <div className={step >= 4 ? 'done' : ''}></div>
            </div>

            {step === 1 && (
              <div className="form-step active">
                <h3>Select a Category</h3>
                <p className="hint">What kind of issue are you facing?</p>
                
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  <input 
                    type="text" 
                    placeholder="Search for an issue..." 
                    className="form-control"
                    value={globalSearchTerm}
                    onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  />
                  {globalSearchTerm && globalCategoryRecommendations.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: '4px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '8px', fontWeight: 'bold' }}>Recommended Categories</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {globalCategoryRecommendations.slice(0, 3).map((rec, idx) => (
                          <div 
                            key={idx}
                            style={{ padding: '6px 12px', background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: '16px', fontSize: '13px', cursor: 'pointer', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => {
                              setFormData({ ...formData, category: rec.name });
                              setGlobalSearchTerm('');
                              setStep(2);
                            }}
                          >
                            <i className="fa-solid fa-check"></i> {rec.name} ({Math.min(rec.score, 99)}%)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

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
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="e.g., Kitchen tap leaking" 
                    value={formData.title}
                    onChange={e => {
                      setFormData({ ...formData, title: e.target.value });
                      setShowDropdown(true);
                      setFocusedSuggestionIdx(-1);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                  />
                  {showDropdown && filteredSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                      {filteredSuggestions.map((issue, idx) => (
                        <div 
                          key={idx}
                          style={{ padding: '10px 12px', cursor: 'pointer', background: focusedSuggestionIdx === idx ? 'var(--surface-2)' : 'transparent', color: 'var(--ink)' }}
                          onMouseEnter={() => setFocusedSuggestionIdx(idx)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData({ ...formData, title: issue.name });
                            setShowDropdown(false);
                          }}
                        >
                          {issue.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {activeSuggestedIssues.length > 0 && !formData.title && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--ink-soft)', marginBottom: '8px' }}>Top Suggested Issues</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {activeSuggestedIssues.slice(0, 2).map((issue, idx) => (
                        <div 
                          key={idx}
                          style={{ padding: '6px 12px', background: issue.isRecent ? 'var(--primary-soft)' : 'var(--surface-2)', color: issue.isRecent ? 'var(--primary)' : 'var(--ink)', borderRadius: '16px', fontSize: '13px', cursor: 'pointer', border: issue.isRecent ? '1px solid var(--primary)' : '1px solid var(--border)' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData({ ...formData, title: issue.name });
                            setShowDropdown(false);
                          }}
                          title={issue.isRecent ? 'Recently Used' : ''}
                        >
                          {issue.isTrending && <span style={{ marginRight: '4px' }}>🔥</span>}
                          {issue.name}
                        </div>
                      ))}
                      <div 
                        style={{ padding: '6px 12px', background: 'transparent', color: 'var(--primary)', borderRadius: '16px', fontSize: '13px', cursor: 'pointer', border: '1px dashed var(--primary)' }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowDropdown(true);
                          document.querySelector('input[placeholder="e.g., Kitchen tap leaking"]')?.focus();
                        }}
                      >
                        Search more...
                      </div>
                    </div>
                  </div>
                )}
                
                <label className="field-label" style={{ marginTop: activeSuggestedIssues.length > 0 && !formData.title ? '0' : '20px' }}>Detailed Description (Optional)</label>
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
                
                {showDuplicateWarning && (
                  <div style={{ marginTop: '20px', padding: '16px', background: 'var(--warning-soft)', border: '1px solid var(--warning)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--warning)', marginTop: '4px' }}></i>
                      <div>
                        <h4 style={{ fontSize: '14px', margin: '0 0 4px 0', color: 'var(--ink)' }}>This issue looks similar to one already reported.</h4>
                        <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: 0, marginBottom: '12px' }}>You have an active ticket for a similar subject.</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {duplicateTicketData && (
                            <button className="btn btn-outline-primary btn-sm" onClick={() => window.open(`/complaints/${duplicateTicketData._id}`, '_blank')}>View Existing Ticket</button>
                          )}
                          <button className="btn btn-primary btn-sm" onClick={() => submitComplaint(true)}>Continue Anyway</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                  (step === 2 && !formData.title) ||
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
        </div>
      </div>
    </div>
  );
};

export default CreateComplaint;


