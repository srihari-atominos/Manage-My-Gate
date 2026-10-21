import securityLogService from './securityLog.services.js';
import HttpError from '../../utils/httpError.utils.js';

export const getLogs = async (req, res, next) => {
  try {
    const orgId = req.tenant?.orgId || req.user?.orgId;
    if (!orgId) throw new HttpError(403, 'Tenant context is required');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const activeGate = req.user?.activeAssignment?.type === 'gate' ? req.user.activeAssignment.name : (req.query.gateName || null);
    const filters = {
      search: req.query.search,
      status: req.query.status,
      scanType: req.query.scanType,
      gateName: activeGate,
      amenityId: req.query.amenityId,
      checkedInBy: req.query.checkedInBy,
      dateRange: req.query.dateRange, // 'today', 'yesterday', '7days', '30days', 'custom'
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const { total, logs } = await securityLogService.getLogs(orgId, filters, skip, limit);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const orgId = req.tenant?.orgId || req.user?.orgId;
    if (!orgId) throw new HttpError(403, 'Tenant context is required');
    const activeGate = req.user?.activeAssignment?.type === 'gate' ? req.user.activeAssignment.name : (req.query.gateName || null);
    const stats = await securityLogService.getDashboardStats(orgId, activeGate);
    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};

export const manualVerification = async (req, res, next) => {
  try {
    const orgId = req.tenant?.orgId || req.user?.orgId;
    if (!orgId) throw new HttpError(403, 'Tenant context is required');
    const userId = req.user?.id || req.user?._id;
    const guardName = req.user?.name || req.user?.username || 'Guard';
    const { bookingId, reason, remarks, status } = req.body;
    
    // In a real scenario, we'd fetch the booking to log it properly.
    // For now we just pass it to the service.
    // We assume the frontend passes some basic booking details or we fetch it.
    
    // Since manual verification acts as an override, we emit an event or create log directly.
    const savedLog = await securityLogService.createLog({
      booking: { _id: bookingId, orgId }, // Mock booking object for log
      orgId,
      guardId: userId,
      guardName,
      scanType: 'Manual Verification',
      status: status || 'Success',
      reason: reason || 'Manual Override',
      remarks: remarks || 'Verified manually by guard'
    });

    res.json({ success: true, log: savedLog });
  } catch (error) {
    next(error);
  }
};

export const deleteLog = async (req, res, next) => {
  try {
    const orgId = req.tenant?.orgId || req.user?.orgId;
    if (!orgId) throw new HttpError(403, 'Tenant context is required');
    const { id } = req.params;

    const deletedLog = await securityLogService.deleteLog(id, orgId);

    if (!deletedLog) {
      throw new HttpError(404, 'Security log not found or already deleted');
    }

    res.json({ success: true, message: 'Security log deleted successfully' });
  } catch (error) {
    next(error);
  }
};
