import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { getPasses, createPass, updatePassStatus } from '../store/visitorPassSlice.js';
import { resolveWalkIn } from '../store/visitorLogSlice.js';
import useAuth from '../../auth/hooks/useAuth.js';
import apiClient from '../../../services/apiClient.js';

export const useResidentVisitorManagement = () => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('create');
  const [generatedPass, setGeneratedPass] = useState(null);
  const [inviteMethod, setInviteMethod] = useState('guest');
  const [guestPassType, setGuestPassType] = useState('default');
  const [cabPassType, setCabPassType] = useState('default');
  const [cabUsageType, setCabUsageType] = useState('one_time');
  const [servicePassType, setServicePassType] = useState('default');
  const [serviceUsageType, setServiceUsageType] = useState('one_time');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  // Redux Selectors
  const reduxPasses = useSelector(state => state.visitorPass.passes);
  const activeOrgId = useSelector(state => state.workspace?.activeOrganizationId);
  const reduxPendingApprovals = useSelector(state => state.visitorLog.pendingApprovals);

  const [dbRoles, setDbRoles] = useState([]);

  useEffect(() => {
    if (activeOrgId) {
      apiClient.get('/roles?limit=100')
        .then(res => {
          setDbRoles(res.data?.data || []);
        })
        .catch(err => {
          console.error('Failed to load roles in resident visitor hook:', err);
        });
    }
  }, [activeOrgId]);

  // Local mock fallbacks if database is empty
  const [localPasses, setLocalPasses] = useState([
    {
      id: 'G-10029',
      method: 'guest',
      visitorName: 'Alice Smith',
      details: 'Aadhaar Card: 8872-9018-1234',
      validity: '08 Jul 2026 - 10 Jul 2026',
      uses: '0 / 2',
      status: 'ACTIVE'
    },
    {
      id: 'G-10030',
      method: 'guest',
      visitorName: 'Robert Johnson',
      details: 'Default Guest Pass',
      validity: '08 Jul 2026 - 08 Jul 2026',
      uses: '1 / 1',
      status: 'EXPIRED'
    }
  ]);

  const [localWalkins, setLocalWalkins] = useState([
    {
      id: 'W-901',
      visitorName: 'David Miller',
      company: 'FedEx Courier',
      purpose: 'Delivery of Parcel',
      vehicle: 'DL-3C-AS-8812',
      guardName: 'Officer Ramesh',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
      timestamp: 'Just now',
      status: 'PENDING'
    },
    {
      id: 'W-902',
      visitorName: 'Sarah Jenkins',
      company: 'Urban Company',
      purpose: 'Salon Service booking #882',
      vehicle: 'None',
      guardName: 'Officer Ramesh',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100',
      timestamp: '10 mins ago',
      status: 'PENDING'
    },
    {
      id: 'W-903',
      visitorName: 'Kumar Swamy',
      company: 'Local Handyman',
      purpose: 'Plumbing Repair work request',
      vehicle: 'KA-51-EF-1022',
      guardName: 'Officer Khan',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
      timestamp: '1 hour ago',
      status: 'APPROVED'
    }
  ]);

  useEffect(() => {
    if (activeOrgId) {
      dispatch(getPasses({ orgId: activeOrgId, params: { page: 1, limit: 10 } }));
    }
  }, [dispatch, activeOrgId]);

  // Merge redux state or local mock list
  const passes = activeOrgId ? reduxPasses : localPasses;
  const walkins = activeOrgId ? reduxPendingApprovals : localWalkins;

  const [formData, setFormData] = useState({
    visitorName: '',
    vehicleNumber: '',
    idProof: '',
    eventName: '',
    orderId: '',
    providerName: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreatePass = async (e) => {
    e.preventDefault();
    if (inviteMethod === 'guest' && !formData.visitorName.trim()) {
      toast.error('Visitor Name is required.');
      return;
    }
    if (inviteMethod === 'guest' && guestPassType === 'id_proof' && !formData.idProof.trim()) {
      toast.error('ID Proof description is required.');
      return;
    }
    if (inviteMethod === 'group' && !formData.eventName.trim()) {
      toast.error('Event Name is required.');
      return;
    }
    if (inviteMethod === 'cab_delivery' && !formData.orderId.trim()) {
      toast.error('Order ID is required.');
      return;
    }
    if (inviteMethod === 'service' && !formData.providerName.trim()) {
      toast.error('Service Provider Name is required.');
      return;
    }

    const userRoleName = currentUser?.role;
    const matchedRoleObj = dbRoles.find(r => r.name === userRoleName);
    const resolvedRoleId = matchedRoleObj ? matchedRoleObj._id : null;

    const payload = {
      orgId: activeOrgId || '60c72b2f9b1d8e25d88db652', // Default Org ID if not loaded
      createdById: currentUser?._id || currentUser?.id || '60c72b2f9b1d8e25d88db650',
      villaId: currentUser?.villaId || '60c72b2f9b1d8e25d88db661',
      roleId: resolvedRoleId || null,
      passType: inviteMethod === 'cab_delivery' ? 'CAB' : inviteMethod.toUpperCase(),
      visitorDetails: {
        name: formData.visitorName || formData.eventName || formData.providerName || `Cab Order #${formData.orderId}`,
        idProofType: (inviteMethod === 'guest' && guestPassType === 'id_proof') || (inviteMethod === 'service' && servicePassType === 'id_proof') ? 'Aadhaar' : 'None',
        idProofNumber: formData.idProof || ''
      },
      vehicleDetails: {
        number: formData.vehicleNumber || ''
      },
      validity: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 2) // 2 days validity
      },
      usageLimit: {
        maxUses: inviteMethod === 'group' ? 100 : 1
      }
    };

    try {
      if (activeOrgId) {
        const created = await dispatch(createPass(payload)).unwrap();
        setGeneratedPass(created);
        toast.success('Visitor Invitation Code generated via Redux!');
      } else {
        // Local state fallback
        const fallbackPass = {
          id: `G-${Math.floor(10000 + Math.random() * 90000)}`,
          method: inviteMethod,
          visitorName: payload.visitorDetails.name,
          details: guestPassType === 'id_proof' ? `ID: ${formData.idProof}` : 'Default pre-approved',
          validity: '09 Jul 2026 - 10 Jul 2026',
          uses: '0 / 1',
          status: 'ACTIVE'
        };
        setLocalPasses(prev => [fallbackPass, ...prev]);
        setGeneratedPass(fallbackPass);
        toast.success('Visitor Invitation Code generated!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create pass');
    }

    // Reset Form fields
    setFormData({
      visitorName: '',
      vehicleNumber: '',
      idProof: '',
      eventName: '',
      orderId: '',
      providerName: ''
    });
  };

  const handleRevokePass = async (id) => {
    try {
      if (id.startsWith('G-')) {
        // Local fallback pass
        setLocalPasses(prev =>
          prev.map(pass => pass.id === id ? { ...pass, status: 'REVOKED' } : pass)
        );
        toast.success('Local pass revoked.');
      } else {
        await dispatch(updatePassStatus({ id, status: 'REVOKED' })).unwrap();
        toast.success('Pass revoked successfully.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to revoke pass');
    }
  };

  const handleCopyPass = (pass) => {
    const text = `Pass ID: ${pass.id || pass._id}\nGuest: ${pass.visitorName || pass.visitorDetails?.name}\nValidity: ${pass.validity}`;
    navigator.clipboard.writeText(text);
    toast.success('Pass invitation details copied!');
  };

  const handleApproveEntry = async (id) => {
    try {
      if (id.startsWith('W-')) {
        setLocalWalkins(prev =>
          prev.map(w => w.id === id ? { ...w, status: 'APPROVED' } : w)
        );
        toast.success('Visitor entry approved.');
      } else {
        await dispatch(resolveWalkIn({ id, status: 'APPROVE' })).unwrap();
        toast.success('Visitor entry approved.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to resolve request');
    }
  };

  const handleDenyEntry = async (id) => {
    try {
      if (id.startsWith('W-')) {
        setLocalWalkins(prev =>
          prev.map(w => w.id === id ? { ...w, status: 'DENIED' } : w)
        );
        toast.error('Visitor entry denied.');
      } else {
        await dispatch(resolveWalkIn({ id, status: 'REJECT' })).unwrap();
        toast.error('Visitor entry denied.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to resolve request');
    }
  };

  return {
    activeTab,
    setActiveTab,
    inviteMethod,
    setInviteMethod,
    guestPassType,
    setGuestPassType,
    cabPassType,
    setCabPassType,
    cabUsageType,
    setCabUsageType,
    servicePassType,
    setServicePassType,
    serviceUsageType,
    setServiceUsageType,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    passes,
    walkins,
    setWalkins: setLocalWalkins,
    formData,
    handleInputChange,
    handleCreatePass,
    handleRevokePass,
    handleCopyPass,
    handleApproveEntry,
    handleDenyEntry,
    generatedPass,
    setGeneratedPass
  };
};

export default useResidentVisitorManagement;
