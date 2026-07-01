import { Router } from 'express';
import messageTemplateController from './messageTemplate.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createTemplateRules, updateTemplateRules } from './messageTemplate.validateRules.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Secure all template routes with authentication and organization scoping
router.use(isAuthenticated);
router.use(tenantContext);

router.get('/', messageTemplateController.getTemplates);
router.post('/', validate(createTemplateRules), messageTemplateController.createTemplate);
router.put('/:id', validate(updateTemplateRules), messageTemplateController.updateTemplate);
router.delete('/:id', messageTemplateController.deleteTemplate);

export default router;
