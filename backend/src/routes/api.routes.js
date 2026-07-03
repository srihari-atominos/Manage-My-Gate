import { Router } from 'express';
import sampleFeatureRouter from '../features/sampleFeature/sampleFeature.router.js';
import authRouter from '../features/auth/auth.router.js';
import roleRouter from '../features/role/role.router.js';
import userRouter from '../features/user/user.router.js';
import notificationRouter from '../features/notification/notification.router.js';
import integrationHubRouter from '../features/integrationHub/integrationHub.router.js';
import organizationRouter from '../features/organization/organization.router.js';

import messageTemplateRouter from '../features/messageTemplate/messageTemplate.router.js';
import amenityRouter from '../features/amenity/amenity.router.js';
import amenitySettingsRouter from '../features/amenitySettings/amenitySettings.router.js';
import bookingRouter from '../features/booking/booking.router.js';
import amenityBookingRouter from '../features/amenityBooking/amenityBooking.router.js';
import paymentRouter from '../features/payment/payment.router.js';

const router = Router();

// Mount feature routers here
router.use('/sample', sampleFeatureRouter);
router.use('/auth', authRouter);
router.use('/roles', roleRouter);
router.use('/users', userRouter);
router.use('/notifications', notificationRouter);
router.use('/integrations', integrationHubRouter);
router.use('/organizations', organizationRouter);

router.use('/templates', messageTemplateRouter);
router.use('/amenities/settings', amenitySettingsRouter);
router.use('/amenities', amenityRouter);
router.use('/bookings', bookingRouter);
router.use('/amenity-bookings', amenityBookingRouter);
router.use('/payments', paymentRouter);

export default router;
