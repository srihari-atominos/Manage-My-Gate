import staffUnitAssociationService from './staffUnitAssociation.service.js';
import { checkIsAdmin } from '../../middlewares/rbac.middleware.js';

class StaffUnitAssociationController {
  async getMyUnits(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const isAdmin = await checkIsAdmin(req);

      const units = await staffUnitAssociationService.getMyAuthorizedUnits(userId, orgId, isAdmin);
      res.success(units, 'Authorized units retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEligibleStaff(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const staffList = await staffUnitAssociationService.getEligibleStaff(orgId);
      res.success(staffList, 'Eligible staff retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAssociations(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const isAdmin = await checkIsAdmin(req);

      const associations = await staffUnitAssociationService.getAssociations(
        userId,
        orgId,
        req.query,
        isAdmin
      );
      res.success(associations, 'Staff unit associations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const isAdmin = await checkIsAdmin(req);

      const association = await staffUnitAssociationService.createAssociation(
        userId,
        orgId,
        req.body,
        isAdmin
      );
      res.success(association, 'Staff member associated with unit successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const isAdmin = await checkIsAdmin(req);
      const reason = req.body?.reason || req.query?.reason || '';

      const association = await staffUnitAssociationService.removeAssociation(
        req.params.id,
        userId,
        orgId,
        reason,
        isAdmin
      );
      res.success(association, 'Staff unit association removed successfully');
    } catch (error) {
      next(error);
    }
  }

  async accept(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const isAdmin = await checkIsAdmin(req);

      const association = await staffUnitAssociationService.acceptAssociation(
        req.params.id,
        userId,
        orgId,
        isAdmin
      );
      res.success(association, 'Staff unit allocation accepted successfully');
    } catch (error) {
      next(error);
    }
  }

  async reject(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const isAdmin = await checkIsAdmin(req);
      const reason = req.body?.reason || req.query?.reason || '';

      const association = await staffUnitAssociationService.rejectAssociation(
        req.params.id,
        userId,
        orgId,
        reason,
        isAdmin
      );
      res.success(association, 'Staff unit allocation declined successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMyAllocations(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const userDetails = { email: req.user.email, phone: req.user.phone };

      const allocations = await staffUnitAssociationService.getMyAllocatedUnits(
        userId,
        orgId,
        userDetails
      );
      res.success(allocations, 'Staff allocated units retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async checkConflict(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { technicianId, accessSchedule, excludeVillaId } = req.body;

      const result = await staffUnitAssociationService.checkScheduleConflict(
        technicianId,
        orgId,
        accessSchedule,
        excludeVillaId
      );
      res.success(result, 'Schedule conflict check performed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new StaffUnitAssociationController();
