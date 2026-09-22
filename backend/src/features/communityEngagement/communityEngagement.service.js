import HttpError from '../../utils/httpError.utils.js';
import noticeBoardService from '../noticeBoard/noticeBoard.service.js';
import * as pollService from '../poll/poll.services.js';
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
   */
  constructor(deps = {}) {
    this.noticeService = deps.noticeService || noticeBoardService;
    this.pollService = deps.pollService || pollService;
  }

  /**
   * Verifies granular permission for a specific content type if user is not an admin.
   *
   * @param {Object} user - Authenticated user
   * @param {'NOTICE'|'POLL'} contentType - Target content type
   */
  async verifyContentTypePermission(user, contentType) {
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
      const hasNoticeCreate =
        userPermissions.includes('notices:create') ||
        userPermissions.includes('notices:manage_notices');
      if (!hasNoticeCreate) {
        throw new HttpError(403, 'Forbidden. You do not have permission to create notices.');
      }
    } else if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.POLL) {
      const hasPollCreate =
        userPermissions.includes('polls:create') ||
        userPermissions.includes('notices:manage_notices') ||
        userPermissions.includes('notices:manage_polls') ||
        userPermissions.includes('polls:manage');
      if (!hasPollCreate) {
        throw new HttpError(403, 'Forbidden. You do not have permission to create polls.');
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
      const scheduleDate = contentData.scheduleDate ? new Date(contentData.scheduleDate) : null;
      let status = contentData.status;
      if (!status) {
        status = scheduleDate && scheduleDate > new Date() ? 'Scheduled' : 'Active';
      }

      // Map options ensuring each item is { text: '...' }
      const options = (contentData.options || []).map((opt) => {
        if (typeof opt === 'string') {
          return { text: opt.trim(), votesCount: 0 };
        }
        return {
          text: (opt.text || '').trim(),
          votesCount: opt.votesCount || 0,
        };
      });

      const pollData = {
        ...contentData,
        options,
        orgId,
        createdBy: userId,
        status,
        scheduleDate,
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
}

export const communityEngagementService = new CommunityEngagementService();
export default communityEngagementService;
