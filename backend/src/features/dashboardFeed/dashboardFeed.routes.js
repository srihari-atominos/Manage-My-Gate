import express from 'express';
import dashboardFeedController from './dashboardFeed.controller.js';
import { isAuthenticated } from '../../middlewares/auth.middleware.js';
import { tenantContext } from '../../middlewares/tenant.middleware.js';

const router = express.Router();

router.use(isAuthenticated);
router.use(tenantContext);

router.get('/announcements', dashboardFeedController.getAnnouncements);

export default router;
