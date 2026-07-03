import { Router } from 'express';
import dashboardController from './amenityDashboard.controller.js';

const router = Router();

router.get('/kpi', dashboardController.getKpis);
router.get('/revenue', dashboardController.getRevenue);
router.get('/occupancy', dashboardController.getOccupancy);
router.get('/trends', dashboardController.getTrends);
router.get('/recent-activity', dashboardController.getRecentActivity);
router.get('/calendar-events', dashboardController.getCalendarEvents);
router.get('/calendar-indicators', dashboardController.getCalendarIndicators);

export default router;
