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
  addMemberRules
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
router.get('/:id', allowedManagers, workspaceController.getById);
router.put('/:id', allowedManagers, validate(updateWorkspaceRules), workspaceController.update);
router.delete('/:id', allowedManagers, workspaceController.delete);

// Modules Management
router.get('/:workspaceId/modules', allowedManagers, workspaceController.getModules);
router.post('/:workspaceId/modules', allowedManagers, validate(addModuleRules), workspaceController.addModule);
router.put('/:workspaceId/modules/:moduleId', allowedManagers, validate(updateModuleRules), workspaceController.updateModule);
router.patch('/:workspaceId/modules/:moduleId/toggle', allowedManagers, validate(toggleModuleRules), workspaceController.toggleModule);
router.patch('/:workspaceId/modules/reorder', allowedManagers, validate(reorderModulesRules), workspaceController.reorderModules);
router.delete('/:workspaceId/modules/:moduleId', allowedManagers, workspaceController.deleteModule);

// Members Management
router.get('/:workspaceId/members', allowedManagers, workspaceController.getMembers);
router.post('/:workspaceId/members', allowedManagers, validate(addMemberRules), workspaceController.addMember);
router.delete('/:workspaceId/members/:userId', allowedManagers, workspaceController.removeMember);

// Settings & Activity Logs endpoints have been removed as part of Workspace Settings module deletion

export default router;
