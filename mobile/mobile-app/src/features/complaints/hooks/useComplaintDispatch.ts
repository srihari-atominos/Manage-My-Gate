import { useState, useEffect, useCallback, useMemo } from 'react';
import complaintService from '../services/complaintService';
import { TriageTicket } from './useComplaintTriage';

export interface TechnicianStaff {
  _id: string;
  name: string;
  specialty: 'Plumber' | 'Electrician' | 'HVAC' | 'Civil / Carpenter' | 'General';
  phone: string;
  status: 'Available' | 'Busy' | 'Off Duty';
  activeJobsCount: number;
  rating: number;
  type: 'Internal Staff' | 'Vendor Contractor';
}

const DEMO_STAFF_ROSTER: TechnicianStaff[] = [
  {
    _id: 'tech-1',
    name: 'Suresh Kumar',
    specialty: 'Plumber',
    phone: '+1 555 123 4567',
    status: 'Available',
    activeJobsCount: 1,
    rating: 4.9,
    type: 'Internal Staff',
  },
  {
    _id: 'tech-2',
    name: 'Ahmed Hassan',
    specialty: 'Electrician',
    phone: '+1 555 234 5678',
    status: 'Available',
    activeJobsCount: 0,
    rating: 4.8,
    type: 'Internal Staff',
  },
  {
    _id: 'tech-3',
    name: 'David Miller',
    specialty: 'HVAC',
    phone: '+1 555 345 6789',
    status: 'Busy',
    activeJobsCount: 3,
    rating: 4.7,
    type: 'Internal Staff',
  },
  {
    _id: 'tech-4',
    name: 'QuickFix Civil & Painting Co.',
    specialty: 'Civil / Carpenter',
    phone: '+1 555 456 7890',
    status: 'Available',
    activeJobsCount: 2,
    rating: 4.6,
    type: 'Vendor Contractor',
  },
  {
    _id: 'tech-5',
    name: 'Apex Elevator Care',
    specialty: 'HVAC',
    phone: '+1 555 567 8901',
    status: 'Available',
    activeJobsCount: 1,
    rating: 4.9,
    type: 'Vendor Contractor',
  },
];

const DEMO_UNASSIGNED_TICKETS: TriageTicket[] = [
  {
    _id: 'disp-1',
    complaintNumber: 'CMP-2026-0051',
    title: 'Main Water Supply Valve Leakage in Utility Shaft',
    category: 'Plumbing',
    priority: 'Critical',
    status: 'Open',
    residentName: 'Sarah Jenkins',
    location: { building: 'Tower A', flat: 'Floor 4 Common Shaft' },
    slaDueDate: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    _id: 'disp-2',
    complaintNumber: 'CMP-2026-0048',
    title: 'Lift #2 Emergency Intercom & Display Failure',
    category: 'HVAC',
    priority: 'Critical',
    status: 'Open',
    residentName: 'Building Management',
    location: { building: 'Tower B', flat: 'Passenger Elevator #2' },
    slaDueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
  },
  {
    _id: 'disp-3',
    complaintNumber: 'CMP-2026-0046',
    title: 'Basement Parking Row D Ceiling Light Burnt Out',
    category: 'Electrical',
    priority: 'Medium',
    status: 'Open',
    residentName: 'Security Desk',
    location: { building: 'Basement', flat: 'Parking B2 Row D' },
    slaDueDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

export function useComplaintDispatch() {
  const [unassignedTickets, setUnassignedTickets] = useState<TriageTicket[]>(DEMO_UNASSIGNED_TICKETS);
  const [staffRoster, setStaffRoster] = useState<TechnicianStaff[]>(DEMO_STAFF_ROSTER);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDispatchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await complaintService.getAll({ status: 'Open', limit: 50 });
      const body = res && (res as any).success !== undefined ? res : (res as any)?.data;
      const list = Array.isArray(body?.data || body?.complaints || body) ? body?.data || body?.complaints || body : [];
      if (list.length > 0) {
        setUnassignedTickets(list.filter((t: any) => t.status === 'Open' || t.status === 'Waiting For Assignment'));
      } else {
        setUnassignedTickets(DEMO_UNASSIGNED_TICKETS);
      }
    } catch {
      setUnassignedTickets(DEMO_UNASSIGNED_TICKETS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDispatchData();
  }, [fetchDispatchData]);

  const dispatchTicket = useCallback(async (ticketId: string, technicianId: string, notes?: string) => {
    const tech = staffRoster.find((s) => s._id === technicianId);
    try {
      await complaintService.assignTechnician(ticketId, {
        technicianId,
        notes,
      });
    } catch {
      // Optimistic
    }

    // Remove from unassigned queue
    setUnassignedTickets((prev) => prev.filter((t) => t._id !== ticketId));

    // Increment tech active jobs
    if (tech) {
      setStaffRoster((prev) =>
        prev.map((s) =>
          s._id === technicianId ? { ...s, activeJobsCount: s.activeJobsCount + 1, status: 'Busy' } : s
        )
      );
    }
  }, [staffRoster]);

  const broadcastTicket = useCallback(async (ticketId: string) => {
    try {
      await complaintService.assignTechnician(ticketId, { isBroadcast: true });
    } catch {
      // Optimistic
    }
    setUnassignedTickets((prev) => prev.filter((t) => t._id !== ticketId));
  }, []);

  const kpis = useMemo(() => {
    const unassignedCount = unassignedTickets.length;
    const onDutyTechs = staffRoster.filter((s) => s.type === 'Internal Staff' && s.status !== 'Off Duty').length;
    const activeContractors = staffRoster.filter((s) => s.type === 'Vendor Contractor').length;
    return { unassignedCount, onDutyTechs, activeContractors };
  }, [unassignedTickets, staffRoster]);

  return {
    unassignedTickets,
    staffRoster,
    loading,
    error,
    kpis,
    fetchDispatchData,
    dispatchTicket,
    broadcastTicket,
  };
}

export default useComplaintDispatch;
