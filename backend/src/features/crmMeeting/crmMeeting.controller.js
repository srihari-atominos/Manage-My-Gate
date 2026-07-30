import crmMeetingService from './crmMeeting.service.js';

export class CrmMeetingController {
  /**
   * Schedule a new CRM meeting.
   */
  async create(req, res, next) {
    try {
      const data = await crmMeetingService.scheduleMeeting(req.body);
      res.success(data, 'CRM Meeting scheduled successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all CRM meetings (paginated).
   */
  async getAll(req, res, next) {
    try {
      const data = await crmMeetingService.getMeetings(req.query);
      res.success(data, 'CRM Meetings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get CRM meeting by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmMeetingService.getMeetingById(id);
      res.success(data, 'CRM Meeting retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update CRM meeting.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmMeetingService.updateMeeting(id, req.body);
      res.success(data, 'CRM Meeting updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check platform user availability for a time slot.
   */
  async checkAvailability(req, res, next) {
    try {
      const { userIds, startTime, endTime, excludeMeetingId } = req.body;
      const isAvailable = await crmMeetingService.checkPlatformUserAvailability(
        userIds,
        startTime,
        endTime,
        excludeMeetingId
      );
      res.success({ available: isAvailable }, 'Platform users availability verified successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete CRM meeting.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmMeetingService.deleteMeeting(id);
      res.success(data, 'CRM Meeting deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new CrmMeetingController();
