import { Router } from 'express';
import multer from 'multer';
import onboardingWizardController from './onboardingWizard.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { validateImportRules, executeImportRules } from './onboardingWizard.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import correlationIdMiddleware from '../../middlewares/correlationId.middleware.js';
import HttpError from '../../utils/httpError.utils.js';
import path from 'path';

const router = Router();

// Multer in-memory storage for processing CSV / XLSX files without persisting to disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new HttpError(400, 'Invalid file type. Only .csv and .xlsx files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 1,
  },
});

/**
 * @swagger
 * /onboarding/validate-import:
 *   post:
 *     summary: Validate bulk onboarding import file (.csv / .xlsx)
 */
router.post(
  '/validate-import',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  upload.single('file'),
  validate(validateImportRules),
  onboardingWizardController.validateImport
);

router.post(
  '/upload-validate',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  upload.single('file'),
  validate(validateImportRules),
  onboardingWizardController.validateImport
);

/**
 * @swagger
 * /onboarding/execute-import:
 *   post:
 *     summary: Execute final database import of pre-validated records in a Mongoose transaction
 */
router.post(
  '/execute-import',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  validate(executeImportRules),
  onboardingWizardController.executeImport
);

export default router;
