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
      const { resolveInvitationSource } = await import('../user/utils/invite.utils.js');
      const invitationSource = resolveInvitationSource(req);
      const { assertRolesAssignable } = await import('../user/utils/roleAssignment.js');
      const result = await villaService.bulkUploadVillasAndResidents(villas, orgId, invitationSource, {
        assertRoleAssignable: (roleName) => assertRolesAssignable(req, orgId, roleName),
      });
      res.success(result, 'Bulk unit upload process completed');
    } catch (error) {
      next(error);
    }
  }

  async assignExistingUser(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const { userId, residencyType, isPrimary } = req.body;
      const villa = await villaService.assignExistingUser(id, userId, residencyType, orgId, isPrimary);
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
      const orgId = req.tenant.orgId;
      const Role = (await import('../role/role.model.js')).default;
      const roles = await Role.find({ orgId, isTenantRole: true }).lean();
      let roleNames = roles.map(r => r.name);
      if (roleNames.length === 0) {
        roleNames = ['Resident Owner', 'Resident Tenant', 'Family Member'];
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Upload Data');
      
      const roleSheet = workbook.addWorksheet('RoleData');
      roleSheet.state = 'hidden';
      roleNames.forEach((r, idx) => {
        roleSheet.getCell(`A${idx + 1}`).value = r;
      });

      sheet.columns = [
        { header: 'Unit Number', key: 'unitNumber', width: 15 },
        { header: 'Block/Building', key: 'block', width: 20 },
        { header: 'Floor', key: 'floor', width: 10 },
        { header: 'Unit Type', key: 'unitType', width: 20 },
        { header: 'Floor Area (Sq Ft)', key: 'floorArea', width: 20 },
        { header: 'Occupancy Status', key: 'occupancy', width: 20 },
        { header: 'Resident Name', key: 'residentName', width: 25 },
        { header: 'Resident Email', key: 'residentEmail', width: 30 },
        { header: 'Resident Type', key: 'residentType', width: 20 },
        { header: 'Phone Number', key: 'phone', width: 20 }
      ];

      sheet.addRow({ unitNumber: '101', block: 'Block A', floor: '1', unitType: 'Apartment', floorArea: '1200', occupancy: 'Vacant', residentName: '', residentEmail: '', residentType: '', phone: '' });
      sheet.addRow({ unitNumber: '102', block: 'Block A', floor: '1', unitType: '2 BHK', floorArea: '1350', occupancy: 'Occupied', residentName: 'John Doe', residentEmail: 'john@example.com', residentType: roleNames[0], phone: '+919876543210' });
      sheet.addRow({ unitNumber: '103', block: 'Block A', floor: '2', unitType: '3 BHK', floorArea: '1600', occupancy: 'Occupied', residentName: 'Jane Smith', residentEmail: 'jane@example.com', residentType: roleNames[1] || roleNames[0], phone: '+919876543211' });

      const roleEndRow = Math.max(roleNames.length, 1);

      for (let i = 2; i <= 1000; i++) {
        sheet.getCell(`D${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Apartment,Villa,Penthouse,Townhouse,Studio,Duplex,2 BHK,3 BHK,4 BHK"'],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Invalid Unit Type',
          error: 'Please select a valid unit type from the list.'
        };

        sheet.getCell(`F${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Vacant,Occupied,Under Maintenance"'],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Invalid Occupancy Status',
          error: 'Please select a valid occupancy status from the list.'
        };

        sheet.getCell(`I${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`RoleData!$A$1:$A${roleEndRow}`],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Invalid Resident Type',
          error: 'Please select a valid Resident Type from the list.'
        };
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="bulk_upload_units_template.xlsx"');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      await workbook.xlsx.write(res);
      res.end();
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
