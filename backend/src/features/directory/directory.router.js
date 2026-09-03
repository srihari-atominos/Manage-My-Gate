import { Router } from 'express';
import directoryController from './directory.controller.js';
import { isAuthenticated } from '../../middlewares/auth.middleware.js';
import { query } from 'express-validator';
import { validate } from '../../middlewares/validator.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.get(
  '/',
  validate([
    query('role').optional().isString(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  directoryController.getDirectory
);

export default router;
