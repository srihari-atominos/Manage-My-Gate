import { Router } from 'express';
import workspaceController from './workspace.controller.js';
import validate from '../../middlewares/validator.middleware.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { tenantContext } from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import HttpError from '../../utils/httpError.utils.js';
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
router.use(tenantContext());

// Dynamic Modules list (highest priority, loaded during sidebar mount)
router.get('/current/modules', workspaceController.getCurrentModules);

// Deleting a community's workspace removes its navigation and settings; only platform admins may do it.
const platformOnly = (req, res, next) =>
  req.user?.isPlatform === true ? next() : next(new HttpError(403, 'Forbidden. Platform administrator access required.'));

// Workspace CRUD
router.post('/', authorizePermission('workspaces', 'create'), validate(createWorkspaceRules), workspaceController.create);
router.get('/', authorizePermission('workspaces', 'read'), workspaceController.getAll);
router.get('/:id', authorizePermission('workspaces', 'read'), validate(idParamRules), workspaceController.getById);
router.put('/:id', authorizePermission('workspaces', 'update'), validate(idParamRules.concat(updateWorkspaceRules)), workspaceController.update);
router.delete('/:id', authorizePermission('workspaces', 'delete'), platformOnly, validate(idParamRules), workspaceController.delete);

// Modules Management
router.get('/:workspaceId/modules', authorizePermission('workspaces', 'read'), validate(workspaceIdParamRules), workspaceController.getModules);
router.post('/:workspaceId/modules', authorizePermission('workspaces', 'create'), validate(workspaceIdParamRules.concat(addModuleRules)), workspaceController.addModule);
router.put('/:workspaceId/modules/:moduleId', authorizePermission('workspaces', 'update'), validate(workspaceAndModuleIdParamRules.concat(updateModuleRules)), workspaceController.updateModule);
router.patch('/:workspaceId/modules/:moduleId/toggle', authorizePermission('workspaces', 'update'), validate(workspaceAndModuleIdParamRules.concat(toggleModuleRules)), workspaceController.toggleModule);
router.patch('/:workspaceId/modules/reorder', authorizePermission('workspaces', 'update'), validate(workspaceIdParamRules.concat(reorderModulesRules)), workspaceController.reorderModules);
router.delete('/:workspaceId/modules/:moduleId', authorizePermission('workspaces', 'delete'), validate(workspaceAndModuleIdParamRules), workspaceController.deleteModule);

// Settings & Activity Logs
router.get('/:workspaceId/settings', authorizePermission('workspaces', 'read'), workspaceController.getSettings);
router.put('/:workspaceId/settings', authorizePermission('workspaces', 'update'), workspaceController.updateSettings);
router.get('/:workspaceId/activity', authorizePermission('workspaces', 'read'), workspaceController.getActivityLogs);

export default router;

