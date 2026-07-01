import { Router } from 'express';
import sampleFeatureRouter from '../features/sampleFeature/sampleFeature.router.js';
import authRouter from '../features/auth/auth.router.js';
import roleRouter from '../features/role/role.router.js';
import userRouter from '../features/user/user.router.js';
import notificationRouter from '../features/notification/notification.router.js';
import integrationHubRouter from '../features/integrationHub/integrationHub.router.js';
import organizationRouter from '../features/organization/organization.router.js';
import auditLogRouter from '../features/auditLog/auditLog.router.js';
import messageTemplateRouter from '../features/messageTemplate/messageTemplate.router.js';

const router = Router();

// Mount feature routers here
router.use('/sample', sampleFeatureRouter);
router.use('/auth', authRouter);
router.use('/roles', roleRouter);
router.use('/users', userRouter);
router.use('/notifications', notificationRouter);
router.use('/integrations', integrationHubRouter);
router.use('/organizations', organizationRouter);
router.use('/audit-logs', auditLogRouter);
router.use('/templates', messageTemplateRouter);

export default router;
