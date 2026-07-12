import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { getPasses, createPass, updatePassStatus } from '../store/visitorPassSlice.js';
import { fetchBlacklist, addBlockProfile, removeBlockProfile } from '../store/blacklistSlice.js';
import { fetchHistoryLogs, fetchPendingApprovals, resolveWalkIn } from '../store/visitorLogSlice.js';
import useAuth from '../../auth/hooks/useAuth.js';
import apiClient from '../../../services/apiClient.js';

export const useAdminVisitorManagement = () => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
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
  const reduxBlacklist = useSelector(state => state.blacklist.blacklist);
  const reduxLogs = useSelector(state => state.visitorLog.historyLogs);
  const reduxPendingApprovals = useSelector(state => state.visitorLog.pendingApprovals);

  const [dbRoles, setDbRoles] = useState([]);

  useEffect(() => {
    if (activeOrgId) {
      apiClient.get('/roles?limit=100')
        .then(res => {
          setDbRoles(res.data?.data || []);
        })
        .catch(err => {
          console.error('Failed to load roles in admin visitor hook:', err);
        });
    }
  }, [activeOrgId]);

  // Local fallback mock states
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

  const [localWalkins] = useState([
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
    }
  ]);

  const [localLogs] = useState([
    { id: 'L-1', visitorName: 'John Doe', type: 'guest', villa: 'Villa 102', resident: 'David Lee', checkIn: '09 Jul 2026, 09:12 AM', checkOut: '09 Jul 2026, 11:30 AM', status: 'COMPLETED', guard: 'Officer Ramesh' },
    { id: 'L-2', visitorName: 'Zomato Delivery', type: 'cab_delivery', villa: 'Villa 54', resident: 'Sarah Jenkins', checkIn: '09 Jul 2026, 10:15 AM', checkOut: '—', status: 'INSIDE', guard: 'Officer Khan' },
    { id: 'L-3', visitorName: 'Mike the Electrician', type: 'service', villa: 'Villa 12', resident: 'Kumar Swamy', checkIn: '09 Jul 2026, 08:30 AM', checkOut: '—', status: 'INSIDE', guard: 'Officer Ramesh' }
  ]);

  const [localBlacklist, setLocalBlacklist] = useState([
    { id: 'B-1', name: 'Robert Vance', phone: '+971 50 123 4567', plate: 'DXB-88190', reason: 'Unauthorised commercial solicitation', dateAdded: '01 Jul 2026' },
    { id: 'B-2', name: 'Security Bypasser Van', phone: '—', plate: 'SHJ-10229', reason: 'Tailgated resident vehicle through gate barrier', dateAdded: '05 Jul 2026' }
  ]);

  useEffect(() => {
    if (activeOrgId) {
      dispatch(getPasses({ orgId: activeOrgId, params: { page: 1, limit: 10 } }));
      dispatch(fetchBlacklist({ orgId: activeOrgId, params: { page: 1, limit: 10 } }));
      dispatch(fetchHistoryLogs({ orgId: activeOrgId, params: { page: 1, limit: 10 } }));
      dispatch(fetchPendingApprovals(activeOrgId));
    }
  }, [dispatch, activeOrgId]);

  // Merge state definitions
  const passes = activeOrgId ? reduxPasses : localPasses;
  const blacklist = activeOrgId ? reduxBlacklist : localBlacklist;
  const walkins = activeOrgId ? reduxPendingApprovals : localWalkins;
  const logs = activeOrgId ? reduxLogs : localLogs;

  const setWalkins = (updater) => {
    if (!activeOrgId) {
      if (typeof updater === 'function') {
        setLocalWalkins(updater);
      } else {
        setLocalWalkins(updater);
      }
      return;
    }

    if (typeof updater === 'function') {
      const nextList = updater(walkins);
      const currentMap = new Map(walkins.map(w => [w.id || w._id, w.status || w.logStatus]));
      for (const item of nextList) {
        const itemId = item.id || item._id;
        const oldStatus = currentMap.get(itemId);
        const newStatus = item.status || item.logStatus;
        if (oldStatus === 'PENDING' && newStatus !== 'PENDING') {
          const statusAction = newStatus === 'APPROVED' ? 'APPROVE' : 'REJECT';
          dispatch(resolveWalkIn({ id: itemId, status: statusAction }))
            .unwrap()
            .then(() => {
              toast.success(`Entry request successfully ${newStatus.toLowerCase()}!`);
              dispatch(fetchPendingApprovals(activeOrgId));
            })
            .catch(err => {
              toast.error(err.message || 'Failed to resolve walk-in request.');
            });
          break;
        }
      }
    }
  };

  const [formData, setFormData] = useState({
    visitorName: '',
    vehicleNumber: '',
    idProof: '',
    eventName: '',
    orderId: '',
    providerName: ''
  });

  const handleInputChange = (nameOrEvent, value) => {
    if (nameOrEvent && nameOrEvent.target) {
      const { name, value: val } = nameOrEvent.target;
      setFormData(prev => ({ ...prev, [name]: val }));
    } else {
      setFormData(prev => ({ ...prev, [nameOrEvent]: value }));
    }
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
      orgId: activeOrgId || '60c72b2f9b1d8e25d88db652',
      createdById: currentUser?._id || currentUser?.id || '60c72b2f9b1d8e25d88db650',
      roleId: resolvedRoleId || undefined,
      passType: inviteMethod === 'cab_delivery' ? 'CAB' : (inviteMethod === 'group' ? 'GUEST' : inviteMethod.toUpperCase()),
      visitorDetails: {
        name: formData.visitorName || formData.eventName || formData.providerName || `Cab Order #${formData.orderId}`,
        idProofType: guestPassType === 'id_proof' ? 'Aadhaar' : 'None',
        idProofNumber: formData.idProof || ''
      },
      vehicleDetails: {
        number: formData.vehicleNumber || ''
      },
      validity: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 2)
      },
      usageLimit: {
        maxUses: inviteMethod === 'group' ? 100 : 1
      }
    };

    try {
      if (activeOrgId) {
        const created = await dispatch(createPass(payload)).unwrap();
        setGeneratedPass(created);
        toast.success('Pass created successfully.');
      } else {
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
        toast.success('Pass generated locally!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create pass.');
    }

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
        setLocalPasses(prev =>
          prev.map(pass => pass.id === id ? { ...pass, status: 'REVOKED' } : pass)
        );
        toast.success('Local pass revoked.');
      } else {
        await dispatch(updatePassStatus({ id, status: 'REVOKED' })).unwrap();
        toast.success('Pass status updated successfully.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    }
  };

  const handleCopyPass = (pass) => {
    const text = `Pass ID: ${pass.id || pass._id}\nGuest: ${pass.visitorName || pass.visitorDetails?.name}`;
    navigator.clipboard.writeText(text);
    toast.success('Pass invitation details copied!');
  };

  const handleSetBlacklist = async (arg) => {
    // Allows updating either redux or local state log depending on parameter signature
    if (typeof arg === 'function') {
      const records = arg(blacklist);
      const newlyAdded = records[0];
      
      const payload = {
        orgId: activeOrgId || '60c72b2f9b1d8e25d88db652',
        name: newlyAdded.name,
        phone: newlyAdded.phone,
        plate: newlyAdded.plate,
        reason: newlyAdded.reason
      };

      try {
        if (activeOrgId) {
          await dispatch(addBlockProfile(payload)).unwrap();
        } else {
          setLocalBlacklist(records);
        }
      } catch (err) {
        toast.error(err.message || 'Failed to add block profile.');
      }
    } else {
      // Remove triggered (passing raw array minus unbanned ID)
      const difference = localBlacklist.filter(x => !arg.some(y => y.id === x.id));
      if (difference.length > 0) {
        const removed = localBlacklist.find(x => !arg.includes(x));
        if (removed) {
          try {
            if (activeOrgId && !removed.id.startsWith('B-')) {
              await dispatch(removeBlockProfile(removed._id)).unwrap();
            } else {
              setLocalBlacklist(arg);
            }
          } catch (err) {
            toast.error(err.message || 'Failed to unban profile.');
          }
        }
      }
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
    logs,
    blacklist,
    setBlacklist: handleSetBlacklist,
    formData,
    handleInputChange,
    handleCreatePass,
    handleRevokePass,
    handleCopyPass,
    activeOrgId,
    generatedPass,
    setGeneratedPass
  };
};

export default useAdminVisitorManagement;
