import { Router } from 'express';
import deviceTokenController from './deviceToken.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { registerDeviceTokenSchema, unregisterDeviceTokenSchema } from './deviceToken.validator.js';

const router = Router();

// Secure all device token operations
router.use(isAuthenticated);

router.post(
  '/',
  validate(registerDeviceTokenSchema),
  deviceTokenController.registerToken
);

router.delete(
  '/:pushToken',
  validate(unregisterDeviceTokenSchema),
  deviceTokenController.unregisterToken
);

export default router;
