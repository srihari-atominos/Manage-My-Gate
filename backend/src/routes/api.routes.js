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
import villaRouter from '../features/villa/villa.router.js';
import amenityRouter from '../features/amenity/amenity.router.js';
import amenitySettingsRouter from '../features/amenitySettings/amenitySettings.router.js';
import bookingRouter from '../features/booking/booking.router.js';
import amenityBookingRouter from '../features/amenityBooking/amenityBooking.router.js';
import paymentRouter from '../features/payment/payment.router.js';
import amenityDashboardRouter from '../features/amenityDashboard/amenityDashboard.router.js';
import walletRouter from '../features/wallet/wallet.router.js';
import securityLogRouter from '../features/securityLog/securityLog.routes.js';
import visitorPassRouter from '../features/visitorPass/visitorPass.router.js';
import visitorLogRouter from '../features/visitorLog/visitorLog.router.js';
import blacklistRouter from '../features/blacklist/blacklist.router.js';

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
router.use('/villas', villaRouter);
router.use('/amenities/settings', amenitySettingsRouter);
router.use('/amenities', amenityRouter);
router.use('/bookings', bookingRouter);
router.use('/amenity-bookings', amenityBookingRouter);
router.use('/payments', paymentRouter);
router.use('/amenity-dashboard', amenityDashboardRouter);
router.use('/wallet', walletRouter);
router.use('/security-logs', securityLogRouter);
router.use('/visitor-pass', visitorPassRouter);
router.use('/visitor-log', visitorLogRouter);
router.use('/blacklist', blacklistRouter);

export default router;
