import { Router } from 'express';
import crmTaskController from './crmTask.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createTaskRules,
  updateTaskRules,
  getTaskRules,
  queryTaskRules,
} from './crmTask.validator.js';

const router = Router();

router.get('/', validate(queryTaskRules), crmTaskController.getAll);
router.get('/:id', validate(getTaskRules), crmTaskController.getById);
router.post('/', validate(createTaskRules), crmTaskController.create);
router.put('/:id', validate(updateTaskRules), crmTaskController.update);
router.delete('/:id', validate(getTaskRules), crmTaskController.delete);

export default router;
