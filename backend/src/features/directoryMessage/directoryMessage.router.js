import { Router } from 'express';
import directoryMessageController from './directoryMessage.controller.js';
import { isAuthenticated } from '../../middlewares/auth.middleware.js';
import { body, param, query } from 'express-validator';
import { validate } from '../../middlewares/validator.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post(
  '/conversation',
  validate([body('receiverId').isMongoId().withMessage('Valid receiver ID required')]),
  directoryMessageController.getOrCreateConversation
);

router.get('/conversations', directoryMessageController.getConversations);

router.post(
  '/send',
  validate([
    body('text').isString().trim().notEmpty().withMessage('Message text is required'),
    body('conversationId').optional().isMongoId(),
    body('receiverId').optional().isMongoId(),
    body('messageType').optional().isString(),
  ]),
  directoryMessageController.sendMessage
);

router.get(
  '/conversation/:conversationId/messages',
  validate([
    param('conversationId').isMongoId().withMessage('Valid conversation ID required'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  directoryMessageController.getMessages
);

router.post(
  '/conversation/:conversationId/read',
  validate([param('conversationId').isMongoId().withMessage('Valid conversation ID required')]),
  directoryMessageController.markAsRead
);

export default router;
