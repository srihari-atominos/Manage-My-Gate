import { Router } from 'express';
import communityNoteController from './communityNote.controller.js';
import { isAuthenticated } from '../../middlewares/auth.middleware.js';
import { body, param } from 'express-validator';
import { validate } from '../../middlewares/validator.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post(
  '/',
  validate([
    body('text')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Text is required')
      .isLength({ max: 80 })
      .withMessage('Text cannot exceed 80 characters'),
    body('category').optional().isString(),
    body('emoji').optional().isString(),
  ]),
  communityNoteController.createNote
);

router.get('/my', communityNoteController.getMyNote);
router.get('/', communityNoteController.getActiveNotes);

router.delete(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid note ID')]),
  communityNoteController.deleteNote
);

export default router;
