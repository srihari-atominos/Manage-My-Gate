import crmMeetingRepository from './crmMeeting.repository.js';
import crmMeetingEvents from './crmMeeting.events.js';
import crmInquiryService from '../crmInquiry/crmInquiry.service.js';
import HttpError from '../../utils/httpError.utils.js';
import { google } from 'googleapis';
import logger from '../../utils/logger.utils.js';

export class CrmMeetingService {
  /**
   * Generates a Google Meet URL by creating an event on Google Calendar.
   * Falls back to a mock link if Google API credentials are not configured.
   * @param {string} title
   * @param {Date|string} scheduledAt
   * @param {Date|string} endAt
   * @returns {Promise<string>} Google Meet URL
   */
  async generateGoogleMeetLink(title, scheduledAt, endAt) {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;

    // Fallback to mock link if credentials are not set
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      logger.warn('[CrmMeetingService] Missing Google API credentials (CLIENT_ID, CLIENT_SECRET, or REFRESH_TOKEN). Falling back to mock Google Meet link.');
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const getRandomString = (length) => {
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      const part1 = getRandomString(3);
      const part2 = getRandomString(4);
      const part3 = getRandomString(3);
      return `https://meet.google.com/${part1}-${part2}-${part3}`;
    }

    try {
      const oAuth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        'urn:ietf:wg:oauth:2.0:oob' // Out of band (no redirect)
      );

      oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

      const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

      const event = {
        summary: title,
        start: {
          dateTime: new Date(scheduledAt).toISOString(),
          timeZone: 'UTC', // Ensure it's correctly interpreted
        },
        end: {
          dateTime: new Date(endAt).toISOString(),
          timeZone: 'UTC',
        },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1, // Required to create the meeting link
      });

      return response.data.hangoutLink;
    } catch (error) {
      logger.error(`[CrmMeetingService] Error creating Google Meet link: ${error.message}`);
      throw new HttpError(500, 'Failed to generate Google Meet link from Google Calendar.');
    }
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

    // Generate Google Meet Link if not provided
    const meetLink = googleMeetLink && googleMeetLink.trim() !== ''
      ? googleMeetLink.trim()
      : await this.generateGoogleMeetLink(title, start, end);

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

    // Auto-progress Inquiry state machine if status is QUALIFIED -> DEMO_SCHEDULED
    try {
      const inquiry = await crmInquiryService.getInquiryById(inquiryId);
      await crmInquiryService.appendTimelineEvent(inquiry._id, {
        eventType: 'MEETING_SCHEDULED',
        actorId: payload.actorId || null,
        actorName: payload.actorName || 'System',
        metadata: { meetingId: newMeeting._id, title: newMeeting.title, startTime: newMeeting.startTime },
      });

      if (inquiry.status === 'QUALIFIED') {
        await crmInquiryService.transitionInquiryStatus(
          inquiry._id,
          'DEMO_SCHEDULED',
          payload.actorId || null,
          payload.actorName || 'System',
          { meetingId: newMeeting._id, autoTransition: true }
        );
      }
    } catch (inquiryErr) {
      logger.error(`[CrmMeetingService] Failed to auto-progress inquiry on meeting creation: ${inquiryErr.message}`);
    }

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

    if (updatePayload.status === 'COMPLETED' || updatePayload.status === 'DEMO_COMPLETED') {
      try {
        const targetInquiryId = updatedMeeting.inquiryId?._id || updatedMeeting.inquiryId;
        const inquiry = await crmInquiryService.getInquiryById(targetInquiryId);
        await crmInquiryService.appendTimelineEvent(inquiry._id, {
          eventType: 'MEETING_COMPLETED',
          actorId: updatePayload.actorId || null,
          actorName: updatePayload.actorName || 'System',
          metadata: { meetingId: updatedMeeting._id, title: updatedMeeting.title },
        });

        if (inquiry.status === 'DEMO_SCHEDULED') {
          await crmInquiryService.transitionInquiryStatus(
            inquiry._id,
            'DEMO_COMPLETED',
            updatePayload.actorId || null,
            updatePayload.actorName || 'System',
            { meetingId: updatedMeeting._id, autoTransition: true }
          );
        }
      } catch (inquiryErr) {
        logger.error(`[CrmMeetingService] Failed to auto-progress inquiry on meeting completion: ${inquiryErr.message}`);
      }
    }

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
