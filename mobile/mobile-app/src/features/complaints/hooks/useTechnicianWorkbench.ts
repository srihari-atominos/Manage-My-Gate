import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '@/src/features/auth/store/authSelectors';
import complaintService from '../services/complaintService';

export interface WorkOrderItem {
  _id: string;
  complaintNumber: string;
  title: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Assigned' | 'Accepted' | 'In Progress' | 'On Hold' | 'Work Completed' | 'Completed';
  location?: {
    building?: string;
    flat?: string;
    exactLocation?: string;
  };
  residentName?: string;
  residentMobile?: string;
  description?: string;
  slaDueDate?: string;
  assignedDate?: string;
  workStartedDate?: string;
}

const DEMO_WORK_ORDERS: WorkOrderItem[] = [
  {
    _id: 'wo-1',
    complaintNumber: 'CMP-2026-0042',
    title: 'Water Pipe Leakage Under Kitchen Sink',
    category: 'Plumbing',
    priority: 'High',
    status: 'In Progress',
    location: { building: 'Tower A', flat: 'Villa 104', exactLocation: 'Kitchen Under-sink pipe' },
    residentName: 'Alexander Wright',
    residentMobile: '+1 555 234 5678',
    description: 'Continuous leaking from the primary supply pipe under the kitchen sink. Requires washer replacement.',
    slaDueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    assignedDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    workStartedDate: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
  },
  {
    _id: 'wo-2',
    complaintNumber: 'CMP-2026-0045',
    title: 'Master Bedroom AC Not Cooling / Thermostat Trip',
    category: 'HVAC',
    priority: 'Critical',
    status: 'Assigned',
    location: { building: 'Tower B', flat: 'Villa 208', exactLocation: 'Master Bedroom AC' },
    residentName: 'Fatima Al-Sayed',
    residentMobile: '+971 50 987 6543',
    description: 'Split AC blowing room-temperature air. Compressor trips every 5 minutes.',
    slaDueDate: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    assignedDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'wo-3',
    complaintNumber: 'CMP-2026-0039',
    title: 'Balcony Light Fixture Sparks on Switch On',
    category: 'Electrical',
    priority: 'Medium',
    status: 'Assigned',
    location: { building: 'Tower A', flat: 'Villa 310', exactLocation: 'Balcony' },
    residentName: 'Carlos Gomez',
    residentMobile: '+1 555 456 7890',
    description: 'Switch box creates small spark when switched on.',
    slaDueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    assignedDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'wo-4',
    complaintNumber: 'CMP-2026-0031',
    title: 'Main Door Smart Lock Battery Replacement & Jam',
    category: 'Civil',
    priority: 'Low',
    status: 'Work Completed',
    location: { building: 'Tower C', flat: 'Villa 102', exactLocation: 'Front Entrance' },
    residentName: 'Deepak Sharma',
    residentMobile: '+91 98765 43210',
    description: 'Installed fresh high-drain AA batteries and lubricated lock latch.',
    slaDueDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    assignedDate: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

export function useTechnicianWorkbench() {
  const authUser = useSelector(selectAuthUser);
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>(DEMO_WORK_ORDERS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await complaintService.getAll({
        assignedTechnicianId: authUser?.id || authUser?._id,
        limit: 50,
      });
      const body = res && (res as any).success !== undefined ? res : (res as any)?.data;
      const list = Array.isArray(body?.data || body?.complaints || body) ? body?.data || body?.complaints || body : [];
      if (list.length > 0) {
        setWorkOrders(list);
      } else {
        setWorkOrders(DEMO_WORK_ORDERS);
      }
    } catch {
      // Keep demo list for reliability
      setWorkOrders(DEMO_WORK_ORDERS);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const acceptTask = useCallback(async (id: string) => {
    try {
      await complaintService.acceptAssignment(id);
    } catch {
      // Optimistic state
    }
    setWorkOrders((prev) =>
      prev.map((item) => (item._id === id ? { ...item, status: 'In Progress', workStartedDate: new Date().toISOString() } : item))
    );
  }, []);

  const startJob = useCallback(async (id: string) => {
    try {
      await complaintService.startWork(id);
    } catch {
      // Optimistic state
    }
    setWorkOrders((prev) =>
      prev.map((item) => (item._id === id ? { ...item, status: 'In Progress', workStartedDate: new Date().toISOString() } : item))
    );
  }, []);

  const pauseJob = useCallback(async (id: string, reason?: string) => {
    try {
      await complaintService.pauseWork(id, reason);
    } catch {
      // Optimistic state
    }
    setWorkOrders((prev) =>
      prev.map((item) => (item._id === id ? { ...item, status: 'On Hold' } : item))
    );
  }, []);

  const resumeJob = useCallback(async (id: string) => {
    try {
      await complaintService.resumeWork(id);
    } catch {
      // Optimistic state
    }
    setWorkOrders((prev) =>
      prev.map((item) => (item._id === id ? { ...item, status: 'In Progress' } : item))
    );
  }, []);

  const completeJob = useCallback(async (id: string, data: { notes: string; partsUsed?: string; attachments?: any[] }) => {
    try {
      await complaintService.markWorkCompleted(id, data);
      if (data.notes) {
        await complaintService.addWorkNotes(id, data.notes);
      }
    } catch {
      // Optimistic state
    }
    setWorkOrders((prev) =>
      prev.map((item) => (item._id === id ? { ...item, status: 'Work Completed' } : item))
    );
  }, []);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return workOrders;
    if (statusFilter === 'ASSIGNED') return workOrders.filter((w) => w.status === 'Assigned' || w.status === 'Accepted');
    if (statusFilter === 'IN_PROGRESS') return workOrders.filter((w) => w.status === 'In Progress' || w.status === 'On Hold');
    if (statusFilter === 'COMPLETED') return workOrders.filter((w) => w.status === 'Work Completed' || w.status === 'Completed');
    return workOrders;
  }, [workOrders, statusFilter]);

  const kpis = useMemo(() => {
    const assigned = workOrders.filter((w) => w.status === 'Assigned' || w.status === 'Accepted').length;
    const inProgress = workOrders.filter((w) => w.status === 'In Progress' || w.status === 'On Hold').length;
    const completed = workOrders.filter((w) => w.status === 'Work Completed' || w.status === 'Completed').length;
    return { assigned, inProgress, completed, total: workOrders.length };
  }, [workOrders]);

  return {
    workOrders: filteredOrders,
    rawWorkOrders: workOrders,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    kpis,
    fetchWorkOrders,
    acceptTask,
    startJob,
    pauseJob,
    resumeJob,
    completeJob,
  };
}

export default useTechnicianWorkbench;
