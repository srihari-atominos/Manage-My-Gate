import securityLogService from './securityLog.services.js';
import HttpError from '../../utils/httpError.utils.js';

export const getLogs = async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filters = {
      search: req.query.search,
      status: req.query.status,
      scanType: req.query.scanType,
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
    const { orgId } = req.user;
    const stats = await securityLogService.getDashboardStats(orgId);
    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};

export const manualVerification = async (req, res, next) => {
  try {
    const { orgId, _id: userId, name: guardName } = req.user;
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
    const { orgId } = req.user;
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
