import technicianService from './technician.service.js';
import HttpError from '../../utils/httpError.utils.js';
import { escapeRegex } from '../../utils/regex.utils.js';
import {
  STAFF_CATEGORY_VALUES,
  communityAssignableFilter,
  residentAssignableFilter,
} from './staffCategory.utils.js';

/**
 * `staffCategory=COMMUNITY|UNIT` narrows the directory to one category.
 * `assignableFor=COMMUNITY` keeps staff who may take complaints / maintenance work;
 * `assignableFor=UNIT` keeps staff a resident may allocate to a unit.
 */
const buildStaffCategoryConditions = (query = {}) => {
  const and = [];
  const category = String(query.staffCategory || '').toUpperCase();
  if (STAFF_CATEGORY_VALUES.includes(category)) {
    // Legacy records without a category are community staff.
    and.push(category === 'UNIT' ? { staffCategory: 'UNIT' } : communityAssignableFilter());
  }
  const assignableFor = String(query.assignableFor || '').toUpperCase();
  if (assignableFor === 'COMMUNITY') and.push(communityAssignableFilter());
  if (assignableFor === 'UNIT') and.push(residentAssignableFilter());
  return and;
};

class TechnicianController {
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const filter = {};

      if (req.query.department && req.query.department !== 'ALL' && req.query.department !== 'All Departments') {
        filter.department = req.query.department;
      }
      if (req.query.type && req.query.type !== 'ALL') {
        filter.type = req.query.type;
      }
      if (req.query.status && req.query.status !== 'ALL') {
        filter.status = req.query.status;
      }
      const and = buildStaffCategoryConditions(req.query);

      const search = req.query.search;
      if (search && search.trim()) {
        const q = escapeRegex(search.trim());
        filter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { staffCode: { $regex: q, $options: 'i' } },
          { designation: { $regex: q, $options: 'i' } },
          { department: { $regex: q, $options: 'i' } },
        ];
      }
      
      if (and.length) filter.$and = and;
      const technicians = await technicianService.getTechnicians(orgId, filter);
      res.success(technicians, 'Technicians retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const filter = {};
      
      if (req.query.department && req.query.department !== 'All Departments') {
        filter.department = req.query.department;
      }
      if (req.query.type) filter.type = req.query.type;
      
      const search = req.query.search;
      if (search) {
        const q = escapeRegex(String(search).trim());
        filter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } }
        ];
      }
      const and = buildStaffCategoryConditions(req.query);
      if (and.length) filter.$and = and;

      const data = await technicianService.getWorkloadAnalytics(orgId, filter);
      res.success(data, 'Technician analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const userDetails = {
        email: req.user.email,
        phone: req.user.phone,
      };
      const technician = await technicianService.getMyProfile(userId, orgId, userDetails);
      res.success(technician, 'Staff profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMyQr(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const userDetails = {
        email: req.user.email,
        phone: req.user.phone,
      };
      const qrData = await technicianService.getMyQr(userId, orgId, userDetails);
      res.success(qrData, 'Staff QR code retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStaffQr(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const qrData = await technicianService.getStaffQrById(id, orgId);
      res.success(qrData, 'Staff QR code retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async rotateStaffQr(req, res, next) {
    try {
      const qrData = await technicianService.rotateStaffQr(req.params.id, req.tenant.orgId);
      res.success(qrData, 'Staff QR pass rotated. All previously issued passes are now invalid.');
    } catch (error) {
      next(error);
    }
  }

  async uploadPhoto(req, res, next) {
    try {
      const updated = await technicianService.setStaffPhoto(req.params.id, req.tenant.orgId, req.file);
      res.success(updated, 'Staff photo saved');
    } catch (error) {
      next(error);
    }
  }

  async uploadPhotoForUser(req, res, next) {
    try {
      const updated = await technicianService.setStaffPhotoForUser(req.params.userId, req.tenant.orgId, req.file);
      res.success(updated, 'Staff photo saved');
    } catch (error) {
      next(error);
    }
  }

  async uploadMyPhoto(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const updated = await technicianService.setMyPhoto(userId, req.tenant.orgId, req.file, {
        email: req.user.email,
        phone: req.user.phone,
      });
      res.success(updated, 'Your photo was saved');
    } catch (error) {
      next(error);
    }
  }

  async deletePhoto(req, res, next) {
    try {
      const updated = await technicianService.removeStaffPhoto(req.params.id, req.tenant.orgId);
      res.success(updated, 'Staff photo removed');
    } catch (error) {
      next(error);
    }
  }

  /** Public, signed-link image response (see staffPhoto.utils.js). */
  async servePhoto(req, res, next) {
    try {
      const { stream, mime } = await technicianService.openSignedPhoto(req.params.id, req.query.v, req.query.sig);
      res.setHeader('Content-Type', mime);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // The link changes whenever the photo changes, so it can be cached hard but only by the user's own client.
      res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      stream.on('error', next);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const technician = await technicianService.getTechnicianById(id, orgId);
      res.success(technician, 'Technician retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const created = await technicianService.createTechnician(orgId, req.body);
      res.success(created, 'Technician created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const updated = await technicianService.updateTechnician(id, orgId, req.body);
      res.success(updated, 'Technician updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const deleted = await technicianService.deleteTechnician(id, orgId);
      res.success(deleted, 'Technician deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new TechnicianController();
