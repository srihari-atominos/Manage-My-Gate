import directoryRepository from './directory.repository.js';
import HttpError from '../../utils/httpError.utils.js';

export const directoryService = {
  async getDirectory({ orgId, role, search, page = 1, limit = 50 }) {
    if (!orgId) {
      throw new HttpError(400, 'Organization context ID is required');
    }

    const cleanPage = Math.max(1, parseInt(page, 10) || 1);
    const cleanLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

    return directoryRepository.getPaginatedDirectory({
      orgId,
      role,
      search,
      page: cleanPage,
      limit: cleanLimit,
    });
  },
};

export default directoryService;
