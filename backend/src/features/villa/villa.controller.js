import villaService from './villa.services.js';

export class VillaController {
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 12;

      // Extract filters
      const filters = {};
      if (req.query.block) {
        filters.block = req.query.block.trim();
      }
      if (req.query.occupancyStatus) {
        filters.occupancyStatus = req.query.occupancyStatus.trim();
      }
      if (req.query.search) {
        // Regex search for villa number
        filters.villaNumber = { $regex: req.query.search.trim(), $options: 'i' };
      }

      const { data, pagination } = await villaService.getAllVillas(orgId, page, limit, filters);
      res.success({ data, pagination }, 'Villas retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const villaDetails = await villaService.getVillaDetailsWithResidents(id);
      res.success(villaDetails, 'Villa details and residents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const villaData = { ...req.body, orgId };
      const villa = await villaService.createVilla(villaData);
      res.success(villa, 'Villa created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const villa = await villaService.updateVilla(id, req.body);
      res.success(villa, 'Villa updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await villaService.deleteVilla(id);
      res.success({ id }, 'Villa deleted successfully');
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
      res.success(createdVillas, `Successfully batch generated ${createdVillas.length} villas.`, 201);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const stats = await villaService.getVillaStats(orgId);
      res.success(stats, 'Villa stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new VillaController();
