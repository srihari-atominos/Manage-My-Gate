import { Router } from 'express';
import workspaceController from './workspace.controller.js';
import validate from '../../middlewares/validator.middleware.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';
import {
  createWorkspaceRules,
  updateWorkspaceRules,
  addModuleRules,
  updateModuleRules,
  toggleModuleRules,
  reorderModulesRules,
  idParamRules,
  workspaceIdParamRules,
  workspaceAndModuleIdParamRules
} from './workspace.validator.js';

const router = Router();

router.use(isAuthenticated);

// Dynamic Modules list (highest priority, loaded during sidebar mount)
router.get('/current/modules', workspaceController.getCurrentModules);

// Restrict Workspace mutations to Platform Super Admin, Super Admin, and Community Admin roles
const allowedManagers = authorizeRoles('Platform Super Admin', 'Super Admin', 'Community Admin');

// Workspace CRUD
router.post('/', allowedManagers, validate(createWorkspaceRules), workspaceController.create);
router.get('/', allowedManagers, workspaceController.getAll);
router.get('/:id', allowedManagers, validate(idParamRules), workspaceController.getById);
router.put('/:id', allowedManagers, validate(idParamRules.concat(updateWorkspaceRules)), workspaceController.update);
router.delete('/:id', allowedManagers, validate(idParamRules), workspaceController.delete);

// Modules Management
router.get('/:workspaceId/modules', allowedManagers, validate(workspaceIdParamRules), workspaceController.getModules);
router.post('/:workspaceId/modules', allowedManagers, validate(workspaceIdParamRules.concat(addModuleRules)), workspaceController.addModule);
router.put('/:workspaceId/modules/:moduleId', allowedManagers, validate(workspaceAndModuleIdParamRules.concat(updateModuleRules)), workspaceController.updateModule);
router.patch('/:workspaceId/modules/:moduleId/toggle', allowedManagers, validate(workspaceAndModuleIdParamRules.concat(toggleModuleRules)), workspaceController.toggleModule);
router.patch('/:workspaceId/modules/reorder', allowedManagers, validate(workspaceIdParamRules.concat(reorderModulesRules)), workspaceController.reorderModules);
router.delete('/:workspaceId/modules/:moduleId', allowedManagers, validate(workspaceAndModuleIdParamRules), workspaceController.deleteModule);

// Settings & Activity Logs
router.get('/:workspaceId/settings', allowedManagers, workspaceController.getSettings);
router.put('/:workspaceId/settings', allowedManagers, workspaceController.updateSettings);
router.get('/:workspaceId/activity', allowedManagers, workspaceController.getActivityLogs);

export default router;
