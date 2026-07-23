import { Types } from 'mongoose';
import noticeBoardService from '../noticeBoard/noticeBoard.service.js';
import amenityService from '../amenity/amenity.services.js';

class DashboardFeedService {
  async getUnifiedAnnouncements(orgId, userId) {
    try {
      // 1. Fetch Community Notices (Published, not Expired)
      const { data: notices } = await noticeBoardService.getAllNotices(orgId, userId, 1, 50, { status: 'Published' }, true);

      // 2. Fetch Amenity Maintenance Schedules
      const amenities = await amenityService.getAllAmenities(orgId, {});

      const feed = [];

      // Map Notices
      for (const notice of notices) {
        feed.push({
          id: notice._id.toString(),
          title: notice.title,
          description: notice.description,
          type: 'NOTICE',
          priority: notice.priority,
          createdAt: notice.createdAt,
          createdBy: notice.createdBy?.username || notice.createdBy?.name || 'Admin',
          organizationId: notice.orgId.toString(),
          referenceId: notice._id.toString(),
          navigationRoute: `/dashboard/community-notices/${notice._id}`,
          unreadStatus: true // In a real app, calculate based on notice.readBy
        });
      }

      // Map Maintenance
      const amenitiesList = Array.isArray(amenities) ? amenities : (amenities.data || []);
      for (const amenity of amenitiesList) {
        if (amenity.maintenanceSchedules) {
          for (const schedule of amenity.maintenanceSchedules) {
            // Include scheduled or in_progress maintenance
            if (schedule.status === 'scheduled' || schedule.status === 'in_progress') {
              feed.push({
                id: schedule._id.toString(),
                title: schedule.title,
                description: `${amenity.name || amenity.amenityName}: ${schedule.description || ''}`,
                type: 'AMENITY_MAINTENANCE',
                priority: schedule.priority || 'medium',
                // Use startDate + startTime if available as createdAt for sorting/display
                createdAt: new Date(`${schedule.startDate}T${schedule.startTime || '00:00'}:00Z`),
                createdBy: 'Facility Management',
                organizationId: (amenity.orgId || amenity.organizationId).toString(),
                referenceId: amenity._id.toString(),
                navigationRoute: `/dashboard/maintenance/${schedule._id}`,
                unreadStatus: false, // Maintenance isn't explicitly read/unread typically
                metadata: {
                  startDate: schedule.startDate,
                  startTime: schedule.startTime,
                  endDate: schedule.endDate,
                  endTime: schedule.endTime,
                  amenityName: amenity.name || amenity.amenityName
                }
              });
            }
          }
        }
      }

      // Sort by latest date descending
      feed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return feed;
    } catch (error) {
      console.error('Error fetching dashboard feed:', error);
      throw error;
    }
  }
}

export default new DashboardFeedService();
