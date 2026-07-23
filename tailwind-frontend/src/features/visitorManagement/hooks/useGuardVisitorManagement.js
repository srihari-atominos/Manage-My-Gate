import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { getPasses, createPass, fetchPassByCode } from '../store/visitorPassSlice.js';
import { getActiveVisitors, processPreApproved, initiateWalkIn, checkoutVisitor } from '../store/visitorLogSlice.js';
import useAuth from '../../auth/hooks/useAuth.js';
import apiClient from '../../../services/apiClient.js';
import useGuardWalkInListener from './useGuardWalkInListener.js';

export const useGuardVisitorManagement = () => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();

  // Activate real-time socket updates for guard walk-in resolution notifications
  useGuardWalkInListener();

  const [activeTab, setActiveTab] = useState('invite');

  // Redux Selectors
  const reduxPasses = useSelector(state => state.visitorPass.passes);
  const reduxActiveVisitors = useSelector(state => state.visitorLog.activeVisitors);
  const activeOrgId = useSelector(state => state.workspace?.activeOrganizationId);

  // Database lists fetched via apiClient
  const [dbVillas, setDbVillas] = useState([]);
  const [dbUsers, setDbUsers] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  // Local fallback mock catalog if database/org is offline
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
    },
    {
      id: 'G-10031',
      method: 'service',
      visitorName: 'Mike Electrician',
      details: 'Work ID: ELEC-901',
      validity: '09 Jul 2026 - 15 Jul 2026',
      uses: '0 / 5',
      status: 'ACTIVE'
    }
  ]);

  const [localLiveEntries, setLocalLiveEntries] = useState([
    { 
      id: 'L-1', 
      visitorName: 'John Doe', 
      type: 'guest', 
      villa: 'Villa 102', 
      resident: 'David Lee', 
      checkIn: '09:12 AM', 
      guard: 'Officer Ramesh' 
    },
    { 
      id: 'L-2', 
      visitorName: 'Amazon Courier', 
      type: 'cab_delivery', 
      villa: 'Villa 54', 
      resident: 'Sarah Jenkins', 
      checkIn: '10:15 AM', 
      guard: 'Officer Khan' 
    }
  ]);

  // Villa intercom listing (used for Tab 4)
  const villas = dbVillas.length > 0 ? dbVillas.map(v => ({
    id: v._id,
    number: v.villaNumber,
    resident: dbUsers.filter(u => u.villaId === v._id).map(u => u.name).join(', ') || 'Unassigned',
    status: v.occupancyStatus || 'Occupied',
    phone: v.intercom || '—'
  })) : [
    { id: 1, number: 'Villa 101', resident: 'Johnathan Parker', status: 'Occupied', phone: '+971 50 441 9022' },
    { id: 2, number: 'Villa 102', resident: 'David Lee', status: 'Occupied', phone: '+971 52 109 2311' },
    { id: 3, number: 'Villa 103', resident: 'Sarah Jenkins', status: 'Occupied', phone: '+971 55 882 1290' },
    { id: 4, number: 'Villa 104', resident: 'Vacant Lot', status: 'Vacant', phone: '—' },
    { id: 5, number: 'Villa 105', resident: 'Kumar Swamy', status: 'Occupied', phone: '+971 56 123 0929' }
  ];

  // Load database lists
  useEffect(() => {
    if (activeOrgId) {
      setLoadingDirectory(true);
      Promise.all([
        apiClient.get('/villas?limit=100')
          .catch(err => {
            console.error('Failed to load villas in guard hook:', err);
            return { data: { data: [] } };
          }),
        apiClient.get('/users?limit=100')
          .catch(err => {
            console.error('Failed to load users in guard hook:', err);
            return { data: { data: [] } };
          }),
        dispatch(getPasses({ orgId: activeOrgId, params: { page: 1, limit: 100, statuses: 'PENDING,ACTIVE,EXPIRED' } }))
          .catch(err => {
            console.error('Failed to load passes in guard hook:', err);
            return null;
          }),
        dispatch(getActiveVisitors(activeOrgId))
          .catch(err => {
            console.error('Failed to load active visitors in guard hook:', err);
            return null;
          })
      ])
        .then(([villasRes, usersRes]) => {
          setDbVillas(villasRes?.data?.data || []);
          setDbUsers(usersRes?.data?.data || []);
        })
        .catch(err => {
          console.error('Failed to sync guard console resources:', err);
        })
        .finally(() => {
          setLoadingDirectory(false);
        });
    }
  }, [dispatch, activeOrgId]);

  // Derived state maps
  const passes = reduxPasses && reduxPasses.length > 0 ? reduxPasses : localPasses;
  
  // Map raw log fields to visual elements
  const liveEntries = reduxActiveVisitors && reduxActiveVisitors.length > 0 ? reduxActiveVisitors.map(log => {
    const matchingPass = passes.find(p => p._id === log.passId || p.id === log.passId);
    
    // Look up host details from user directory to resolve villa number for walk-ins
    const hostUser = dbUsers.find(u => u.id === (log.residentId?._id || log.residentId));
    const villaNumber = log.passId?.villaId?.villaNumber || hostUser?.villaNumber || '';
    
    return {
      id: log._id || log.id,
      passId: log.passId,
      visitorName: log.snapshot?.visitorName || 'Walk-in Visitor',
      type: matchingPass?.passType || log.entryType || 'GUEST',
      villa: villaNumber || '—',
      resident: log.residentId?.username || hostUser?.name || 'Host',
      checkIn: log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
      guard: log.guardId?.username || 'Gate Console',
      vehicleNumber: log.snapshot?.vehicleNumber || '',
      idProofNumber: log.snapshot?.idProofNumber || ''
    };
  }) : localLiveEntries;


  // Check-In handler
  const handleCheckInSuccess = async (newLog) => {
    try {
      if (activeOrgId) {
        const payload = {
          orgId: activeOrgId,
          passId: newLog.passId,
          guardId: currentUser?.id || currentUser?._id || '60c72b2f9b1d8e25d88db651'
        };
        toast.loading('Registering visitor entry check-in...', { id: 'checkin-task' });
        await dispatch(processPreApproved(payload)).unwrap();
        await dispatch(getActiveVisitors(activeOrgId));
        await dispatch(getPasses({ orgId: activeOrgId, params: { page: 1, limit: 100, statuses: 'PENDING,ACTIVE,EXPIRED' } }));
        toast.success('Gate Check-in processed successfully!', { id: 'checkin-task' });
        return true;
      } else {
        const mockLog = {
          id: `L-${Math.floor(100 + Math.random() * 900)}`,
          visitorName: newLog.visitorName,
          type: newLog.type,
          villa: newLog.villa || 'Villa 101',
          resident: newLog.resident || 'Host Resident',
          checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          guard: currentUser?.username || 'Officer Ramesh'
        };
        setLocalLiveEntries(prev => [mockLog, ...prev]);
        toast.success('Local fallback check-in successful.');
        return true;
      }
    } catch (err) {
      toast.error(err.message || 'Failed to check-in visitor', { id: 'checkin-task' });
      return false;
    }
  };

  // Check-Out handler
  const handleCheckOutSuccess = async (id) => {
    try {
      if (id.startsWith('L-')) {
        setLocalLiveEntries(prev => prev.filter(entry => entry.id !== id));
        toast.success('Check-out registered locally.');
        return true;
      } else {
        toast.loading('Registering visitor checkout exit...', { id: 'checkout-task' });
        await dispatch(checkoutVisitor(id)).unwrap();
        await dispatch(getActiveVisitors(activeOrgId));
        await dispatch(getPasses({ orgId: activeOrgId, params: { page: 1, limit: 100, statuses: 'PENDING,ACTIVE,EXPIRED' } }));
        toast.success('Exit checkout logged successfully!', { id: 'checkout-task' });
        return true;
      }
    } catch (err) {
      toast.error(err.message || 'Failed to check-out visitor', { id: 'checkout-task' });
      return false;
    }
  };

  // Walk-In request trigger
  const handleInitiateWalkIn = async (walkInPayload) => {
    try {
      toast.loading('Initiating walk-in approval request...', { id: 'walkin-submit' });
      
      const enrichedPayload = {
        ...walkInPayload,
        orgId: activeOrgId,
        guardId: currentUser?.id || currentUser?._id
      };
      
      const result = await dispatch(initiateWalkIn(enrichedPayload)).unwrap();
      toast.success('Walk-in request sent to host!', { id: 'walkin-submit' });
      
      // Auto reload after request resolves
      setTimeout(() => {
        dispatch(getActiveVisitors(activeOrgId));
      }, 1000);
      
      return { success: true, log: result };
    } catch (err) {
      toast.error(err.message || 'Failed to initiate walk-in request.', { id: 'walkin-submit' });
      return { success: false, error: err };
    }
  };

  return {
    activeTab,
    setActiveTab,
    passes,
    setPasses: setLocalPasses,
    liveEntries,
    setLiveEntries: setLocalLiveEntries,
    villas,
    dbVillas,
    dbUsers,
    loadingDirectory,
    handleCheckInSuccess,
    handleCheckOutSuccess,
    handleInitiateWalkIn
  };
};

export default useGuardVisitorManagement;
