import crmMeetingRepository from './crmMeeting.repository.js';
import crmMeetingEvents from './crmMeeting.events.js';
import crmInquiryService from '../crmInquiry/crmInquiry.service.js';
import HttpError from '../../utils/httpError.utils.js';

export class CrmMeetingService {
  /**
   * Mock/Stub method for Google Calendar API interaction to generate Google Meet links.
   * In a live environment, this would call the Google Calendar API client using OAuth tokens.
   * @param {string} title
   * @param {Date|string} scheduledAt
   * @returns {string} Google Meet URL
   */
  generateMockGoogleMeetLink(title, scheduledAt) {
    const part1 = Math.random().toString(36).substring(2, 5);
    const part2 = Math.random().toString(36).substring(2, 6);
    const part3 = Math.random().toString(36).substring(2, 5);
    return `https://meet.google.com/${part1}-${part2}-${part3}`;
  }

  /**
   * Check if any of the provided platform user IDs have overlapping meetings.
   * @param {Array<string>} userIds
   * @param {Date|string} startTime
   * @param {Date|string} endTime
   * @param {string} [excludeMeetingId]
   */
  async checkPlatformUserAvailability(userIds, startTime, endTime, excludeMeetingId = null) {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return true;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new HttpError(400, 'Invalid startTime or endTime date format');
    }

    if (start >= end) {
      throw new HttpError(400, 'startTime must be prior to endTime');
    }

    const overlappingMeetings = await crmMeetingRepository.findOverlappingMeetings(
      userIds,
      start,
      end,
      excludeMeetingId
    );

    if (overlappingMeetings && overlappingMeetings.length > 0) {
      throw new HttpError(409, 'One or more selected platform participants have an overlapping meeting during this time slot.');
    }

    return true;
  }

  /**
   * Schedule a new CRM Meeting.
   * @param {Object} payload { inquiryId, title, startTime, endTime, platformParticipants, customerParticipants, googleMeetLink, status }
   */
  async scheduleMeeting(payload) {
    const { inquiryId, title, startTime, endTime, platformParticipants = [], customerParticipants = [], googleMeetLink, status } = payload;

    // Cross-feature service call to validate related CRM Inquiry
    await crmInquiryService.getInquiryById(inquiryId);

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new HttpError(400, 'Valid startTime and endTime are required');
    }

    if (start >= end) {
      throw new HttpError(400, 'startTime must be before endTime');
    }

    // Enforce platform user availability check
    if (platformParticipants && platformParticipants.length > 0) {
      await this.checkPlatformUserAvailability(platformParticipants, start, end);
    }

    // Mock Google Calendar API link generation if not provided
    const meetLink = googleMeetLink && googleMeetLink.trim() !== ''
      ? googleMeetLink.trim()
      : this.generateMockGoogleMeetLink(title, start);

    const meetingData = {
      inquiryId,
      title,
      startTime: start,
      endTime: end,
      platformParticipants,
      customerParticipants,
      googleMeetLink: meetLink,
      status: status || 'SCHEDULED',
    };

    const newMeeting = await crmMeetingRepository.create(meetingData);

    // Emit domain event meeting_scheduled
    crmMeetingEvents.emit('meeting_scheduled', newMeeting);

    return newMeeting;
  }

  /**
   * Get paginated meetings.
   * @param {Object} queryParams
   */
  async getMeetings(queryParams) {
    return await crmMeetingRepository.getMeetingsPaginated(queryParams);
  }

  /**
   * Get meeting by ID.
   * @param {string} id
   */
  async getMeetingById(id) {
    const meeting = await crmMeetingRepository.findById(id);
    if (!meeting) {
      throw new HttpError(404, 'CRM Meeting not found');
    }
    return meeting;
  }

  /**
   * Update meeting.
   * @param {string} id
   * @param {Object} updatePayload
   */
  async updateMeeting(id, updatePayload) {
    const existing = await crmMeetingRepository.findById(id);
    if (!existing) {
      throw new HttpError(404, 'CRM Meeting not found');
    }

    if (updatePayload.inquiryId && String(updatePayload.inquiryId) !== String(existing.inquiryId?._id || existing.inquiryId)) {
      await crmInquiryService.getInquiryById(updatePayload.inquiryId);
    }

    const start = updatePayload.startTime ? new Date(updatePayload.startTime) : existing.startTime;
    const end = updatePayload.endTime ? new Date(updatePayload.endTime) : existing.endTime;
    const participants = updatePayload.platformParticipants || existing.platformParticipants || [];

    if (updatePayload.startTime || updatePayload.endTime || updatePayload.platformParticipants) {
      await this.checkPlatformUserAvailability(participants, start, end, id);
    }

    const updatedMeeting = await crmMeetingRepository.updateById(id, updatePayload);

    if (updatePayload.status === 'CANCELLED') {
      crmMeetingEvents.emit('meeting_cancelled', updatedMeeting);
    } else {
      crmMeetingEvents.emit('meeting_updated', updatedMeeting);
    }

    return updatedMeeting;
  }

  /**
   * Delete meeting.
   * @param {string} id
   */
  async deleteMeeting(id) {
    const existing = await crmMeetingRepository.findById(id);
    if (!existing) {
      throw new HttpError(404, 'CRM Meeting not found');
    }

    const deleted = await crmMeetingRepository.deleteById(id);
    crmMeetingEvents.emit('meeting_cancelled', existing);
    return deleted;
  }
}

export default new CrmMeetingService();
