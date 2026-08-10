import migrationService from './migration.service.js';
import logger from '../../utils/logger.utils.js';

class MigrationController {
  async uploadMigration(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      // Pass the in-memory buffer to the service
      const result = await migrationService.processMigrationFile(req.file.buffer, req.organizationId);

      return res.status(200).json({
        success: true,
        message: 'Data migration completed successfully',
        data: result
      });
    } catch (error) {
      // Safely catch the custom validation error
      if (error.message.includes('exceeds licensed unit limit')) {
        logger.warn(`Tenant ${req.organizationId} hit limit: ${error.message}`);
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
}

export default new MigrationController();
