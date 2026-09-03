import villaService from './villa.services.js';
import ExcelJS from 'exceljs';

export class VillaController {
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 12;

      // Extract filters & sorting
      const filters = {};
      if (req.query.blockOrBuilding) {
        filters.blockOrBuilding = req.query.blockOrBuilding.trim();
      }
      if (req.query.floor) {
        filters.floor = req.query.floor.trim();
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
      if (req.query.sortBy) {
        filters.sortBy = req.query.sortBy.trim();
      }
      if (req.query.sortOrder) {
        filters.sortOrder = req.query.sortOrder.trim();
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

      // Cross-unit security check for residents (bug-006, bug-007)
      const userRole = req.user?.roleName || req.user?.role || '';
      if (userRole.toLowerCase().includes('resident') || userRole.toLowerCase().includes('tenant') || userRole.toLowerCase().includes('family')) {
        const userIdStr = String(req.user._id || req.user.id);
        const isOwner = String(villaDetails.villa?.ownerId) === userIdStr;
        const isPrimary = String(villaDetails.villa?.primaryResidentId) === userIdStr;
        const isResident = (villaDetails.residents || []).some(r => String(r.id) === userIdStr);

        if (!isOwner && !isPrimary && !isResident) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only view details of your own assigned unit.'
          });
        }
      }

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

  async deactivate(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const villa = await villaService.deactivateUnit(id, orgId);
      res.success(villa, 'Unit deactivated successfully');
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
        'Unit Number',
        'Block/Building',
        'Floor',
        'Unit Type',
        'Floor Area (Sq Ft)',
        'Occupancy Status',
        'Resident Name',
        'Resident Email',
        'Resident Type',
        'Phone Number'
      ];

      const sampleRows = [
        ['101', 'Block A', '1', 'Apartment', '1200', 'Vacant', '', '', '', ''],
        ['102', 'Block A', '1', '2 BHK', '1350', 'Occupied', 'John Doe', 'john@example.com', 'Resident Owner', '9876543210'],
        ['103', 'Block A', '2', '3 BHK', '1600', 'Occupied', 'Jane Smith', 'jane@example.com', 'Tenant', '9876543211'],
        ['201', 'Block B', '1', 'Villa', '2400', 'Under Maintenance', '', '', '', ''],
        ['202', 'Block B', '2', 'Penthouse', '3200', 'Occupied', 'Alice Johnson', 'alice@example.com', 'Family Member', '9876543212']
      ];

      const escapeCSV = (arr) => arr.map(val => `"${val}"`).join(',');

      const csvContent = [
        escapeCSV(headers),
        ...sampleRows.map(row => escapeCSV(row))
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

  async exportUnits(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { data } = await villaService.getUnitsPaginated({ orgId, page: 1, limit: 10000 });

      const headers = ['Unit Number', 'Block / Tower', 'Floor', 'Unit Type', 'Status', 'Floor Area (Sq Ft)', 'Created At'];
      const escapeCSV = (arr) => arr.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',');

      const rows = data.map(unit => [
        unit.unitNumber || '',
        unit.blockOrBuilding || '',
        unit.floor || '',
        unit.type || '',
        unit.status || '',
        unit.floorAreaSqFt || '',
        unit.createdAt ? new Date(unit.createdAt).toISOString().split('T')[0] : ''
      ]);

      const csvContent = [escapeCSV(headers), ...rows.map(row => escapeCSV(row))].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="unit_list_export.csv"');
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
