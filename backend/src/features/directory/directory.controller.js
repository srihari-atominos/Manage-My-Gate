import directoryService from './directory.services.js';

export const directoryController = {
  async getDirectory(req, res, next) {
    try {
      const orgId = req.headers['x-organization-id'] || req.user?.orgId;
      const { role, search, page, limit } = req.query;

      const result = await directoryService.getDirectory({
        orgId,
        role,
        search,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          totalRecords: result.totalRecords,
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          limit: result.limit,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

export default directoryController;
