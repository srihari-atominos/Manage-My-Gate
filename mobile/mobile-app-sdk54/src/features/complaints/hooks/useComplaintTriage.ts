import { useState, useEffect, useCallback, useMemo } from 'react';
import complaintService from '../services/complaintService';

export interface TriageTicket {
  _id: string;
  complaintNumber: string;
  title: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Waiting For Assignment' | 'Assigned' | 'In Progress' | 'On Hold' | 'Work Completed' | 'Resolved' | 'Closed' | 'Escalated' | 'Rejected';
  residentName?: string;
  residentMobile?: string;
  location?: {
    building?: string;
    flat?: string;
    exactLocation?: string;
  };
  assignedTechnicianName?: string;
  assignedTechnicianId?: string;
  department?: string;
  slaDueDate?: string;
  createdAt?: string;
  description?: string;
}

const DEMO_TRIAGE_TICKETS: TriageTicket[] = [
  {
    _id: 'tr-1',
    complaintNumber: 'CMP-2026-0051',
    title: 'Main Water Supply Valve Leakage in Utility Shaft',
    category: 'Plumbing',
    priority: 'Critical',
    status: 'Open',
    residentName: 'Sarah Jenkins',
    residentMobile: '+1 555 111 2233',
    location: { building: 'Tower A', flat: 'Floor 4 Common Shaft' },
    department: 'Plumbing & Hydraulic',
    slaDueDate: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    description: 'High pressure water leaking into electrical conduit trunking.',
  },
  {
    _id: 'tr-2',
    complaintNumber: 'CMP-2026-0048',
    title: 'Lift #2 Emergency Intercom & Display Failure',
    category: 'HVAC',
    priority: 'Critical',
    status: 'Open',
    residentName: 'Building Management',
    residentMobile: '+1 555 999 0000',
    location: { building: 'Tower B', flat: 'Passenger Elevator #2' },
    department: 'Elevator Maintenance',
    slaDueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    description: 'Car floor indicator displays error E-40. Alarm button operational but speaker silent.',
  },
  {
    _id: 'tr-3',
    complaintNumber: 'CMP-2026-0042',
    title: 'Water Pipe Leakage Under Kitchen Sink',
    category: 'Plumbing',
    priority: 'High',
    status: 'In Progress',
    residentName: 'Alexander Wright',
    residentMobile: '+1 555 234 5678',
    location: { building: 'Tower A', flat: 'Villa 104' },
    assignedTechnicianName: 'Suresh Kumar (Plumber)',
    assignedTechnicianId: 'tech-1',
    department: 'Plumbing',
    slaDueDate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'tr-4',
    complaintNumber: 'CMP-2026-0036',
    title: 'Community Gym Treadmill #1 Belt Slipping',
    category: 'Civil',
    priority: 'Medium',
    status: 'Assigned',
    residentName: 'Gym Supervisor',
    residentMobile: '+1 555 333 4444',
    location: { building: 'Clubhouse', flat: 'Ground Floor Gym' },
    assignedTechnicianName: 'Mike Johnson (Technician)',
    assignedTechnicianId: 'tech-2',
    department: 'General Maintenance',
    slaDueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'tr-5',
    complaintNumber: 'CMP-2026-0029',
    title: 'Swimming Pool Filter Pump Pressure High',
    category: 'HVAC',
    priority: 'Low',
    status: 'Resolved',
    residentName: 'Clubhouse Lead',
    location: { building: 'Clubhouse', flat: 'Pool Pump Room' },
    assignedTechnicianName: 'Pool Care Vendor',
    slaDueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
  },
];

export function useComplaintTriage() {
  const [tickets, setTickets] = useState<TriageTicket[]>(DEMO_TRIAGE_TICKETS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  const fetchTriageTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await complaintService.getAll({ limit: 50 });
      const body = res && (res as any).success !== undefined ? res : (res as any)?.data;
      const list = Array.isArray(body?.data || body?.complaints || body) ? body?.data || body?.complaints || body : [];
      if (list.length > 0) {
        setTickets(list);
      } else {
        setTickets(DEMO_TRIAGE_TICKETS);
      }
    } catch {
      setTickets(DEMO_TRIAGE_TICKETS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTriageTickets();
  }, [fetchTriageTickets]);

  const updateTicketStatus = useCallback(async (id: string, newStatus: string, remarks?: string) => {
    try {
      await complaintService.updateStatus(id, { status: newStatus, remarks });
    } catch {
      // Optimistic
    }
    setTickets((prev) =>
      prev.map((t) => (t._id === id ? { ...t, status: newStatus as any } : t))
    );
  }, []);

  const escalateTicket = useCallback(async (id: string, reason: string, priority: string = 'Critical') => {
    try {
      await complaintService.updateStatus(id, { status: 'Escalated', priority, escalationReason: reason });
    } catch {
      // Optimistic
    }
    setTickets((prev) =>
      prev.map((t) => (t._id === id ? { ...t, status: 'Escalated', priority: 'Critical' } : t))
    );
  }, []);

  const assignTicket = useCallback(async (id: string, technicianId: string, technicianName?: string) => {
    try {
      await complaintService.assignTechnician(id, { technicianId });
    } catch {
      // Optimistic
    }
    setTickets((prev) =>
      prev.map((t) =>
        t._id === id
          ? {
              ...t,
              status: 'Assigned',
              assignedTechnicianId: technicianId,
              assignedTechnicianName: technicianName || 'Assigned Staff',
            }
          : t
      )
    );
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchNumber = (ticket.complaintNumber || '').toLowerCase().includes(q);
        const matchTitle = (ticket.title || '').toLowerCase().includes(q);
        const matchResident = (ticket.residentName || '').toLowerCase().includes(q);
        const matchLocation = (ticket.location?.flat || '').toLowerCase().includes(q);
        if (!matchNumber && !matchTitle && !matchResident && !matchLocation) return false;
      }
      // Category filter
      if (selectedCategory !== 'All') {
        if ((ticket.category || '').toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }
      // Priority filter
      if (selectedPriority !== 'All') {
        if ((ticket.priority || '').toLowerCase() !== selectedPriority.toLowerCase()) return false;
      }
      // Status filter
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'UNASSIGNED') {
          if (ticket.status !== 'Open' && ticket.status !== 'Waiting For Assignment') return false;
        } else if (selectedStatus === 'IN_PROGRESS') {
          if (ticket.status !== 'In Progress' && ticket.status !== 'Assigned' && ticket.status !== 'On Hold') return false;
        } else if (selectedStatus === 'RESOLVED') {
          if (ticket.status !== 'Resolved' && ticket.status !== 'Closed' && ticket.status !== 'Work Completed') return false;
        }
      }
      return true;
    });
  }, [tickets, search, selectedCategory, selectedPriority, selectedStatus]);

  const kpis = useMemo(() => {
    const unassigned = tickets.filter((t) => t.status === 'Open' || t.status === 'Waiting For Assignment').length;
    const critical = tickets.filter((t) => t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;
    const inProgress = tickets.filter((t) => t.status === 'In Progress' || t.status === 'Assigned' || t.status === 'On Hold').length;
    const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed' || t.status === 'Work Completed').length;
    return { unassigned, critical, inProgress, resolved, total: tickets.length };
  }, [tickets]);

  return {
    tickets: filteredTickets,
    rawTickets: tickets,
    loading,
    error,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    selectedPriority,
    setSelectedPriority,
    selectedStatus,
    setSelectedStatus,
    kpis,
    fetchTriageTickets,
    updateTicketStatus,
    escalateTicket,
    assignTicket,
  };
}

export default useComplaintTriage;
