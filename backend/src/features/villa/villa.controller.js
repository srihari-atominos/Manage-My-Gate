import villaService from './villa.services.js';
import ExcelJS from 'exceljs';

export class VillaController {
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 12;

      // Extract filters
      const filters = {};
      if (req.query.blockOrBuilding) {
        filters.blockOrBuilding = req.query.blockOrBuilding.trim();
      }
      if (req.query.status) {
        filters.status = req.query.status.trim();
      }
      if (req.query.type) {
        filters.type = req.query.type.trim();
      }
      if (req.query.search) {
        filters.search = req.query.search.trim();
      }

      const { data, pagination } = await villaService.getUnitsPaginated({ orgId, page, limit, ...filters });
      res.success({ data, pagination }, 'Units retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns all distinct block/building names for the active org.
   * Powers the dynamic block filter dropdown on the frontend.
   */
  async getBlocks(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const blocks = await villaService.getDistinctBlocks(orgId);
      res.success(blocks, 'Distinct blocks retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const villaDetails = await villaService.getVillaDetailsWithResidents(id, orgId);
      res.success(villaDetails, 'Unit details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const villa = await villaService.createUnit(orgId, req.body);
      res.success(villa, 'Unit created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const villa = await villaService.updateUnit(id, orgId, req.body);
      res.success(villa, 'Unit updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      await villaService.deleteUnit(id, orgId);
      res.success({ id }, 'Unit deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async assignResident(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const { residentId } = req.body;
      const villa = await villaService.assignPrimaryResident(id, orgId, residentId);
      res.success(villa, 'Primary resident assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  async batchGenerate(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { startNumber, endNumber, prefix, config } = req.body;
      const createdVillas = await villaService.batchGenerateVillas({
        orgId,
        startNumber: parseInt(startNumber, 10) || 1,
        endNumber: parseInt(endNumber, 10) || 54,
        prefix,
        config
      });
      res.success(createdVillas, `Successfully batch generated ${createdVillas.length} units.`, 201);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const stats = await villaService.getVillaStats(orgId);
      res.success(stats, 'Unit stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async bulkUpload(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { villas } = req.body;
      const result = await villaService.bulkUploadVillasAndResidents(villas, orgId);
      res.success(result, 'Bulk unit upload process completed');
    } catch (error) {
      next(error);
    }
  }

  async assignExistingUser(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const { userId, residencyType } = req.body;
      const villa = await villaService.assignExistingUser(id, userId, residencyType, orgId);
      res.success(villa, 'Resident assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateResidencyType(req, res, next) {
    try {
      const { id, userId } = req.params;
      const orgId = req.tenant.orgId;
      const { residencyType } = req.body;
      const villa = await villaService.updateResidencyType(id, userId, residencyType, orgId);
      res.success(villa, 'Residency type updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeResident(req, res, next) {
    try {
      const { id, userId } = req.params;
      const orgId = req.tenant.orgId;
      const villa = await villaService.removeResident(id, userId, orgId);
      res.success(villa, 'Resident removed successfully');
    } catch (error) {
      next(error);
    }
  }

  async downloadBulkUploadTemplate(req, res, next) {
    try {
      const headers = [
        'UnitNumber(101,102,103)',
        'BlockOrBuilding',
        'Unit Type(1BHA,2BHA,3BHA,Villa)',
        'Floor Area (Sq Ft)',
        'Occupancy Status(Occupied,Vacant)',
        'Email',
        'ResidentType(Family Member,Resident Owner,Tenant)',
        'Phone No'
      ];

      const exampleRow = [
        '101',
        'Block A',
        '3BHA',
        '1500',
        'Occupied',
        'resident@example.com',
        'Resident Owner',
        '1234567890'
      ];

      const escapeCSV = (arr) => arr.map(val => `"${val}"`).join(',');

      const csvContent = [
        escapeCSV(headers),
        escapeCSV(exampleRow)
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="bulk_upload_units_template.csv"');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}

export default new VillaController();
