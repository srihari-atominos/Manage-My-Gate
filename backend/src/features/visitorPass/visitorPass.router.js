import { Router } from 'express';
import visitorPassController from './visitorPass.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createPassRules, updatePassStatusRules } from './visitorPass.validator.js';

const router = Router();

router.post('/', validate(createPassRules), visitorPassController.create);
router.get('/:id', visitorPassController.getById);
router.patch('/:id/status', validate(updatePassStatusRules), visitorPassController.updateStatus);
router.get('/org/:orgId', visitorPassController.getByOrgPaginated);

export default router;
