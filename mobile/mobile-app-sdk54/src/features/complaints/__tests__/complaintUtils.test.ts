describe('Complaints Helper & Utility Logic', () => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Closed':
      case 'Completed':
        return 'success';
      case 'Work Completed':
      case 'Waiting For Resident Confirmation':
        return 'warning';
      case 'In Progress':
      case 'Assigned':
      case 'Accepted':
        return 'info';
      case 'Escalated':
      case 'Rejected':
      case 'Cancelled':
        return 'danger';
      case 'Submitted':
      case 'Open':
      case 'Waiting For Assignment':
      default:
        return 'neutral';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'critical';
      case 'High':
        return 'danger';
      case 'Medium':
        return 'warning';
      case 'Low':
      default:
        return 'neutral';
    }
  };

  const checkSLABreach = (slaDueDate?: string, status?: string) => {
    if (['Closed', 'Completed', 'Cancelled'].includes(status || '')) {
      return { isBreached: false };
    }
    if (slaDueDate) {
      const dueTime = new Date(slaDueDate).getTime();
      const nowTime = Date.now();
      if (dueTime - nowTime < 0) {
        return { isBreached: true, label: 'SLA Breached' };
      }
    }
    return { isBreached: false };
  };

  describe('getStatusBadgeVariant', () => {
    it('should map Closed and Completed to success', () => {
      expect(getStatusBadgeVariant('Closed')).toBe('success');
      expect(getStatusBadgeVariant('Completed')).toBe('success');
    });

    it('should map Work Completed to warning', () => {
      expect(getStatusBadgeVariant('Work Completed')).toBe('warning');
    });

    it('should map In Progress and Assigned to info', () => {
      expect(getStatusBadgeVariant('In Progress')).toBe('info');
      expect(getStatusBadgeVariant('Assigned')).toBe('info');
    });

    it('should map Escalated and Cancelled to danger', () => {
      expect(getStatusBadgeVariant('Escalated')).toBe('danger');
      expect(getStatusBadgeVariant('Cancelled')).toBe('danger');
    });

    it('should fallback Open to neutral', () => {
      expect(getStatusBadgeVariant('Open')).toBe('neutral');
    });
  });

  describe('getPriorityBadgeVariant', () => {
    it('should map Critical to critical', () => {
      expect(getPriorityBadgeVariant('Critical')).toBe('critical');
    });

    it('should map High to danger', () => {
      expect(getPriorityBadgeVariant('High')).toBe('danger');
    });

    it('should map Medium to warning', () => {
      expect(getPriorityBadgeVariant('Medium')).toBe('warning');
    });

    it('should map Low to neutral', () => {
      expect(getPriorityBadgeVariant('Low')).toBe('neutral');
    });
  });

  describe('checkSLABreach', () => {
    it('should return false for completed or closed tickets even if date is past', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const result = checkSLABreach(pastDate, 'Closed');
      expect(result.isBreached).toBe(false);
    });

    it('should detect SLA breach for open ticket with past due date', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const result = checkSLABreach(pastDate, 'Open');
      expect(result.isBreached).toBe(true);
      expect(result.label).toBe('SLA Breached');
    });

    it('should return false for future SLA due date', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const result = checkSLABreach(futureDate, 'Open');
      expect(result.isBreached).toBe(false);
    });
  });
});
