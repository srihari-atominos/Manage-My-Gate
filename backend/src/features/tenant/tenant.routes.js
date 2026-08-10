import express from 'express';
import multer from 'multer';
import migrationController from './migration.controller.js';
import { isAuthenticated } from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = express.Router();

// Integrate multer with memory storage to process files directly from memory without saving to disk
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for CSV/Excel
  }
});

/**
 * POST /api/tenant/upload-migration
 * Receives the CSV/Excel file, securely parses it in memory, validates against subscription,
 * and executes a bulk atomic database insertion.
 */
router.post(
  '/upload-migration',
  isAuthenticated,
  tenantContext,
  upload.single('migrationFile'),
  migrationController.uploadMigration
);

export default router;
