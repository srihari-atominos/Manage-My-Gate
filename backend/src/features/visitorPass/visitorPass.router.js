import { Router } from 'express';
import visitorPassController from './visitorPass.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createPassRules, updatePassStatusRules } from './visitorPass.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';

const router = Router();

// Publicly accessible pass routes for external visitors / guests
router.get('/public/:token', visitorPassController.getPublicPass);
router.get('/public/code/:code', visitorPassController.getPublicPass);

router.use(isAuthenticated);

router.post('/', validate(createPassRules), visitorPassController.create);
router.get('/code/:code', visitorPassController.getByCode);
router.get('/:id', visitorPassController.getById);
router.patch('/:id/status', validate(updatePassStatusRules), visitorPassController.updateStatus);
router.get('/org/:orgId', visitorPassController.getByOrgPaginated);

export default router;
