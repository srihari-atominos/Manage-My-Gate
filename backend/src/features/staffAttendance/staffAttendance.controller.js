import staffAttendanceService from './staffAttendance.service.js';
import HttpError from '../../utils/httpError.utils.js';
import { checkIsAdmin } from '../../middlewares/rbac.middleware.js';
import {
  buildAttendanceReport,
  reportToCsv,
  reportToXlsxBuffer,
  exportFileName,
  assertFormat,
} from './staffAttendance.export.js';

class StaffAttendanceController {
  async scan(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const guardId = req.user.id || req.user._id;
      const { scannedPayload, gateId, action, idempotencyKey, notes, isManualEntry } = req.body;

      // Server-side manual entry authorization check:
      // An untrusted client cannot bypass QR verification simply by providing isManualEntry: true.
      // Manual entry requires:
      // 1. Authenticated caller holds visitor:guard, staff:manage, or is a verified admin.
      // 2. Caller provides a non-empty audit note/reason explaining the manual entry.
      let auditNote = notes || '';
      if (isManualEntry === true) {
        const userPermissions = req.tenant?.permissions || req.user?.permissions || [];
        const hasGuardOrManage =
          userPermissions.includes('visitor:guard') ||
          userPermissions.includes('staff:manage');
        const isAdmin = await checkIsAdmin(req);

        if (!hasGuardOrManage && !isAdmin) {
          throw new HttpError(
            403,
            'Manual attendance entry requires gate guard (visitor:guard) or staff manager (staff:manage) authorization.'
          );
        }

        if (!notes || typeof notes !== 'string' || !notes.trim()) {
          throw new HttpError(
            400,
            'A valid reason or audit note is required for manual attendance entry.'
          );
        }

        const guardName = req.user.name || req.user.username || guardId;
        auditNote = `[Manual entry by ${guardName}]: ${notes.trim()}`;
      }

      const result = await staffAttendanceService.recordGateScan({
        scannedPayload,
        gateId,
        guardId,
        orgId,
        idempotencyKey,
        action,
        notes: auditNote,
        isManualEntry: isManualEntry === true,
      });

      res.success(result, result.message || 'Staff attendance recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  async lookup(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const data = await staffAttendanceService.lookupStaffForScan({
        scannedPayload: req.body.scannedPayload,
        orgId,
      });
      res.success(data, 'Staff pass verified');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Downloads the attendance report as a friendly CSV or Excel file for the current filters.
   */
  async exportAttendance(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const format = assertFormat(req.query.format);
      const report = await buildAttendanceReport(orgId, req.query, {
        generatedBy: req.user?.name || req.user?.username || '',
      });
      const fileName = exportFileName(format, req.query);

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('X-Export-Filename', fileName);
      res.setHeader('X-Export-Rows', String(report.rows.length));
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Export-Filename, X-Export-Rows');

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.send(reportToCsv(report));
      }
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(await reportToXlsxBuffer(report));
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const data = await staffAttendanceService.getAttendanceHistory(orgId, req.query);
      res.success(data, 'Staff attendance history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMyAttendance(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const userDetails = {
        email: req.user.email,
        phone: req.user.phone,
      };
      const data = await staffAttendanceService.getMyAttendance(userId, orgId, req.query, userDetails);
      res.success(data, 'My staff attendance history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getActive(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const sessions = await staffAttendanceService.getActiveSessions(orgId);
      res.success(sessions, 'Active staff attendance sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getActiveForMyUnits(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const isAdmin = await checkIsAdmin(req);
      const data = await staffAttendanceService.getActiveStaffForMyUnits(userId, orgId, isAdmin);
      res.success(data, 'Staff currently inside for your units retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { id } = req.params;
      const session = await staffAttendanceService.getSessionById(id, orgId);
      res.success(session, 'Staff attendance session retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const stats = await staffAttendanceService.getAttendanceStats(orgId, req.query);
      res.success(stats, 'Staff attendance statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async manualCheckout(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const adminUserId = req.user.id || req.user._id;
      const { id } = req.params;
      const { checkOutTime, notes, gateId } = req.body;

      const result = await staffAttendanceService.manualCheckout(id, orgId, adminUserId, {
        checkOutTime,
        notes,
        gateId,
      });

      res.success(result, result.message || 'Staff attendance session checked out manually');
    } catch (error) {
      next(error);
    }
  }
}

export default new StaffAttendanceController();
