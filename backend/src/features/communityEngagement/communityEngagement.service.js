import HttpError from '../../utils/httpError.utils.js';
import noticeBoardService from '../noticeBoard/noticeBoard.service.js';
import * as pollService from '../poll/poll.services.js';
import audienceService from '../audience/audience.service.js';
import { getPermissionsForUser } from '../../middlewares/rbac.middleware.js';
import { mapPermission, expandUserPermissions } from '../../utils/permissionMapper.js';
import {
  COMMUNITY_ENGAGEMENT_CONTENT_TYPES,
  VALID_CONTENT_TYPES,
} from './communityEngagement.constants.js';

export class CommunityEngagementService {
  /**
   * @param {Object} [deps={}]
   * @param {Object} [deps.noticeService]
   * @param {Object} [deps.pollService]
   * @param {Object} [deps.audienceService]
   */
  constructor(deps = {}) {
    this.noticeService = deps.noticeService || noticeBoardService;
    this.pollService = deps.pollService || pollService;
    this.audienceService = deps.audienceService || audienceService;
  }

  /**
   * Verifies granular permission for a specific content type if user is not an admin.
   *
   * @param {Object} user - Authenticated user
   * @param {'NOTICE'|'POLL'} contentType - Target content type
   */
  async verifyContentTypePermission(user, contentType, action = 'create') {
    const roleUpper = (user?.role || '').toUpperCase();
    const isFullAdmin =
      ['Super Admin', 'Platform Super Admin', 'Community Admin', 'Admin', 'SuperAdmin'].includes(
        user?.role
      ) ||
      roleUpper.includes('ADMIN') ||
      roleUpper.includes('SUPER') ||
      user?.isPlatform;

    if (isFullAdmin) {
      return true;
    }

    const permissions = await getPermissionsForUser(user);
    const userPermissions = expandUserPermissions(permissions.map(mapPermission));

    if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.NOTICE) {
      const hasNoticePerm =
        action === 'update'
          ? userPermissions.includes('notices:update') ||
            userPermissions.includes('notices:manage_notices') ||
            userPermissions.includes('manage_notices')
          : userPermissions.includes('notices:create') ||
            userPermissions.includes('notices:manage_notices') ||
            userPermissions.includes('manage_notices');
      if (!hasNoticePerm) {
        throw new HttpError(403, `Forbidden. You do not have permission to ${action} notices.`);
      }
    } else if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.POLL) {
      const hasPollPerm =
        action === 'update'
          ? userPermissions.includes('polls:update') ||
            userPermissions.includes('notices:manage_notices') ||
            userPermissions.includes('notices:manage_polls') ||
            userPermissions.includes('polls:manage')
          : userPermissions.includes('polls:create') ||
            userPermissions.includes('notices:manage_notices') ||
            userPermissions.includes('notices:manage_polls') ||
            userPermissions.includes('polls:manage');
      if (!hasPollPerm) {
        throw new HttpError(403, `Forbidden. You do not have permission to ${action} polls.`);
      }
    }

    return true;
  }

  /**
   * Orchestrates unified content creation across Notice and Poll domains.
   *
   * @param {Object} contentData - Request payload
   * @param {Object} user - Authenticated user object
   * @param {Object} tenant - Validated tenant context ({ orgId })
   * @param {Array} [files=[]] - Optional uploaded files (e.g. for Notice attachments)
   * @returns {Promise<Object>} Created content with contentType discriminator
   */
  async createContent(contentData, user, tenant, files = []) {
    const orgId = tenant?.orgId;
    if (!orgId) {
      throw new HttpError(400, 'Workspace / Organization context is required.');
    }

    const userId = user?.id || user?._id;
    if (!userId) {
      throw new HttpError(401, 'Unauthorized. Authentication required.');
    }

    const rawType = contentData?.contentType;
    if (!rawType || typeof rawType !== 'string') {
      throw new HttpError(400, 'contentType is required');
    }

    const contentType = rawType.trim().toUpperCase();
    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      throw new HttpError(
        400,
        `Invalid contentType: '${rawType}'. Allowed values are: ${VALID_CONTENT_TYPES.join(', ')}`
      );
    }

    // Granular content-type permission check
    await this.verifyContentTypePermission(user, contentType);

    // Normalize audience targeting
    let targetAudience = contentData.targetAudience || contentData.audience;
    if (typeof targetAudience === 'string') {
      try {
        targetAudience = JSON.parse(targetAudience);
      } catch (e) {
        // preserve as string
      }
    }

    // Delegation to Notice Domain
    if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.NOTICE) {
      const uploadedImages = (files || []).map((file) => ({
        url: `/public/uploads/notices/${file.filename}`,
        filename: file.originalname,
        uploadTimestamp: new Date(),
      }));

      const noticeData = {
        ...contentData,
        targetAudience,
        images: uploadedImages.length > 0 ? uploadedImages : contentData.images || [],
      };

      const notice = await this.noticeService.createNotice(noticeData, userId, orgId);
      const noticeObj = notice && typeof notice.toObject === 'function' ? notice.toObject() : notice;

      return {
        contentType: COMMUNITY_ENGAGEMENT_CONTENT_TYPES.NOTICE,
        ...noticeObj,
      };
    }

    // Delegation to Poll Domain
    if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.POLL) {
      const pollData = {
        ...contentData,
        orgId,
        createdBy: userId,
        targetAudience,
        visibility: contentData.visibility || 'Everyone',
      };

      const poll = await this.pollService.createPoll(pollData);
      const pollObj = poll && typeof poll.toObject === 'function' ? poll.toObject() : poll;

      return {
        contentType: COMMUNITY_ENGAGEMENT_CONTENT_TYPES.POLL,
        ...pollObj,
      };
    }

    throw new HttpError(400, `Unhandled contentType: '${contentType}'`);
  }

  /**
   * Orchestrates unified content update across Notice and Poll domains.
   *
   * @param {string} id - Target entity ID
   * @param {Object} contentData - Request payload
   * @param {Object} user - Authenticated user object
   * @param {Object} tenant - Validated tenant context ({ orgId })
   * @param {Array} [files=[]] - Optional uploaded files (e.g. for Notice attachments)
   * @returns {Promise<Object>} Updated content with contentType discriminator
   */
  async updateContent(id, contentData, user, tenant, files = []) {
    const orgId = tenant?.orgId;
    if (!orgId) {
      throw new HttpError(400, 'Workspace / Organization context is required.');
    }

    const userId = user?.id || user?._id;
    if (!userId) {
      throw new HttpError(401, 'Unauthorized. Authentication required.');
    }

    if (!id) {
      throw new HttpError(400, 'Content ID is required for update.');
    }

    const rawType = contentData?.contentType;
    if (!rawType || typeof rawType !== 'string') {
      throw new HttpError(400, 'contentType is required');
    }

    const contentType = rawType.trim().toUpperCase();
    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      throw new HttpError(
        400,
        `Invalid contentType: '${rawType}'. Allowed values are: ${VALID_CONTENT_TYPES.join(', ')}`
      );
    }

    // Granular content-type permission check for update
    await this.verifyContentTypePermission(user, contentType, 'update');

    // Normalize audience targeting
    let targetAudience = contentData.targetAudience || contentData.audience;
    if (typeof targetAudience === 'string') {
      try {
        targetAudience = JSON.parse(targetAudience);
      } catch (e) {
        // preserve
      }
    }

    const roleUpper = (user?.role || '').toUpperCase();
    const isCommunityAdmin =
      ['Super Admin', 'Platform Super Admin', 'Community Admin', 'Admin', 'SuperAdmin'].includes(
        user?.role
      ) ||
      roleUpper.includes('ADMIN') ||
      roleUpper.includes('SUPER') ||
      user?.isPlatform;

    // Delegation to Notice Domain
    if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.NOTICE) {
      const uploadedImages = (files || []).map((file) => ({
        url: `/public/uploads/notices/${file.filename}`,
        filename: file.originalname,
        uploadTimestamp: new Date(),
      }));

      const updateData = {
        ...contentData,
      };
      if (targetAudience) {
        updateData.targetAudience = targetAudience;
      }
      if (uploadedImages.length > 0) {
        updateData.images = [
          ...(contentData.images || []),
          ...uploadedImages,
        ];
      }

      const updatedNotice = await this.noticeService.updateNotice(id, updateData, userId, orgId);
      const noticeObj =
        updatedNotice && typeof updatedNotice.toObject === 'function'
          ? updatedNotice.toObject()
          : updatedNotice;

      return {
        contentType: COMMUNITY_ENGAGEMENT_CONTENT_TYPES.NOTICE,
        ...noticeObj,
      };
    }

    // Delegation to Poll Domain
    if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.POLL) {
      const updateData = {
        ...contentData,
      };
      if (targetAudience) {
        updateData.targetAudience = targetAudience;
      }

      const updatedPoll = await this.pollService.updatePoll(
        id,
        orgId,
        userId,
        updateData,
        isCommunityAdmin
      );
      const pollObj =
        updatedPoll && typeof updatedPoll.toObject === 'function'
          ? updatedPoll.toObject()
          : updatedPoll;

      return {
        contentType: COMMUNITY_ENGAGEMENT_CONTENT_TYPES.POLL,
        ...pollObj,
      };
    }

    throw new HttpError(400, `Unhandled contentType: '${contentType}'`);
  }

  /**
   * Generates a side-effect-free preview of Notice or Poll content.
   * Computes projected status, validates and normalizes target audience,
   * calculates estimated eligible recipients, without creating database records or firing outbox/notifications.
   *
   * @param {Object} contentData - Raw request payload
   * @param {Object} user - Authenticated user object
   * @param {Object} tenant - Validated tenant context ({ orgId })
   * @param {Array} [files=[]] - Optional uploaded files for Notice attachments
   * @returns {Promise<Object>} Normalized preview projection
   */
  async previewContent(contentData, user, tenant, files = []) {
    const orgId = tenant?.orgId;
    if (!orgId) {
      throw new HttpError(400, 'Workspace / Organization context is required.');
    }

    const userId = user?.id || user?._id;
    if (!userId) {
      throw new HttpError(401, 'Unauthorized. Authentication required.');
    }

    const rawType = contentData?.contentType;
    if (!rawType || typeof rawType !== 'string') {
      throw new HttpError(400, 'contentType is required');
    }

    const contentType = rawType.trim().toUpperCase();
    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      throw new HttpError(
        400,
        `Invalid contentType: '${rawType}'. Allowed values are: ${VALID_CONTENT_TYPES.join(', ')}`
      );
    }

    // Granular content-type permission check
    await this.verifyContentTypePermission(user, contentType);

    // Normalize audience targeting
    let targetAudience = contentData.targetAudience || contentData.audience;
    if (typeof targetAudience === 'string') {
      try {
        targetAudience = JSON.parse(targetAudience);
      } catch (e) {
        // preserve as string
      }
    }

    // Validate and resolve audience
    let normalizedAudience = { targetType: 'ALL' };
    let estimatedRecipients = 0;

    if (this.audienceService) {
      if (typeof this.audienceService.validateTarget === 'function') {
        normalizedAudience = await this.audienceService.validateTarget(targetAudience, orgId);
      } else if (targetAudience) {
        normalizedAudience = targetAudience;
      }

      if (typeof this.audienceService.countEligibleRecipients === 'function') {
        estimatedRecipients = await this.audienceService.countEligibleRecipients(normalizedAudience, orgId);
      }
    }

    // Determine projected lifecycle status
    const hasFutureSchedule = contentData.scheduleDate && new Date(contentData.scheduleDate) > new Date();

    if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.NOTICE) {
      let projectedStatus = 'Published';
      if (hasFutureSchedule) {
        projectedStatus = 'Scheduled';
      } else if (contentData.status === 'Draft') {
        projectedStatus = 'Draft';
      } else if (contentData.status) {
        projectedStatus = contentData.status;
      }

      const uploadedImages = (files || []).map((file) => ({
        url: `/public/uploads/notices/${file.filename}`,
        filename: file.originalname,
        uploadTimestamp: new Date(),
      }));

      const images = uploadedImages.length > 0 ? uploadedImages : contentData.images || [];

      return {
        contentType: COMMUNITY_ENGAGEMENT_CONTENT_TYPES.NOTICE,
        title: contentData.title,
        description: contentData.description,
        category: contentData.category,
        priority: contentData.priority || 'Medium',
        status: projectedStatus,
        projectedStatus,
        scheduleDate: contentData.scheduleDate || null,
        expiryDate: contentData.expiryDate || null,
        targetAudience: normalizedAudience,
        estimatedRecipients,
        images,
        requiresAcknowledgment: Boolean(contentData.requiresAcknowledgment),
        allowComments: contentData.allowComments !== undefined ? Boolean(contentData.allowComments) : true,
        createdBy: {
          id: userId,
          name: user?.name || user?.username || 'Current User',
        },
        orgId,
        previewOnly: true,
      };
    }

    if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.POLL) {
      let projectedStatus = 'Active';
      if (hasFutureSchedule) {
        projectedStatus = 'Scheduled';
      } else if (contentData.status === 'Draft') {
        projectedStatus = 'Draft';
      } else if (contentData.status) {
        projectedStatus = contentData.status;
      }

      const normalizedOptions = (contentData.options || []).map((opt, idx) => {
        if (typeof opt === 'string') {
          return { id: `opt-${idx + 1}`, text: opt.trim(), votes: 0 };
        }
        return {
          id: opt._id || opt.id || `opt-${idx + 1}`,
          text: opt.text ? opt.text.trim() : '',
          votes: 0,
        };
      });

      return {
        contentType: COMMUNITY_ENGAGEMENT_CONTENT_TYPES.POLL,
        question: contentData.question,
        description: contentData.description || '',
        options: normalizedOptions,
        choiceType: contentData.choiceType || 'SINGLE_CHOICE',
        maxChoices: contentData.maxChoices || 1,
        votingMode: contentData.votingMode || 'ONE_PER_USER',
        resultsVisibility: contentData.resultsVisibility || 'ALWAYS',
        isAnonymous: Boolean(contentData.isAnonymous),
        quorumPercentage: contentData.quorumPercentage || 0,
        status: projectedStatus,
        projectedStatus,
        scheduleDate: contentData.scheduleDate || null,
        endDate: contentData.endDate,
        targetAudience: normalizedAudience,
        estimatedRecipients,
        createdBy: {
          id: userId,
          name: user?.name || user?.username || 'Current User',
        },
        orgId,
        previewOnly: true,
      };
    }

    throw new HttpError(400, `Unhandled contentType: '${contentType}'`);
  }
}

export const communityEngagementService = new CommunityEngagementService();
export default communityEngagementService;
