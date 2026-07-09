import blacklistService from './blacklist.service.js';

export class BlacklistController {
  /**
   * Block a profile.
   */
  async create(req, res, next) {
    try {
      const { orgId, name, phone, plate, reason } = req.body;
      const createdById = req.user?.id || req.body.createdById; // fallback if session inject is missing in test
      
      const data = await blacklistService.createBlacklistEntry({
        orgId,
        name,
        phone,
        plate,
        reason,
        createdById
      });

      res.success(data, 'Visitor profile blocked successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unban/delete a block rule.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await blacklistService.removeBlacklistEntry(id);
      res.success(data, 'Blacklisted profile unbanned successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch paginated list of blocked records.
   */
  async getByOrgPaginated(req, res, next) {
    try {
      const { orgId } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      const { data, totalRecords } = await blacklistService.getBlacklistByOrg(orgId, skip, limit);
      res.success({ data, totalRecords }, 'Blacklisted records retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if query details match a banned entry.
   */
  async checkMatch(req, res, next) {
    try {
      const { orgId } = req.params;
      const { name, phone, plate } = req.query;
      
      const match = await blacklistService.checkMatch(orgId, { name, phone, plate });
      
      res.success(match, 'Check match status executed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new BlacklistController();
