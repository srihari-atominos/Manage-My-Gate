import { Router } from 'express';
import dashboardController from './amenityDashboard.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

// Secure all dashboard routes
router.use(isAuthenticated, tenantContext);

// Dashboard Metrics Gated by view_dashboard permission
router.get('/kpi', authorizePermission('amenities', 'view_dashboard'), dashboardController.getKpis);
router.get('/revenue', authorizePermission('amenities', 'view_dashboard'), dashboardController.getRevenue);
router.get('/occupancy', authorizePermission('amenities', 'view_dashboard'), dashboardController.getOccupancy);
router.get('/trends', authorizePermission('amenities', 'view_dashboard'), dashboardController.getTrends);
router.get('/recent-activity', authorizePermission('amenities', 'view_dashboard'), dashboardController.getRecentActivity);

// Calendar Gated by view_admin_calendar permission
router.get('/calendar-events', authorizePermission('amenities', 'view_admin_calendar'), dashboardController.getCalendarEvents);
router.get('/calendar-indicators', authorizePermission('amenities', 'view_admin_calendar'), dashboardController.getCalendarIndicators);

export default router;
