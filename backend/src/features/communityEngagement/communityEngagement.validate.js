import { body } from 'express-validator';
import HttpError from '../../utils/httpError.utils.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createNoticeRules } from '../noticeBoard/noticeBoard.validator.js';
import { createPollRules } from '../poll/poll.validateRules.js';
import {
  COMMUNITY_ENGAGEMENT_CONTENT_TYPES,
  VALID_CONTENT_TYPES,
} from './communityEngagement.constants.js';

/**
 * Common Express-Validator rules for Community Engagement gateway.
 */
export const commonContentRules = [
  body('contentType')
    .notEmpty()
    .withMessage('contentType is required')
    .custom((val) => {
      const normalized = typeof val === 'string' ? val.trim().toUpperCase() : '';
      if (!VALID_CONTENT_TYPES.includes(normalized)) {
        throw new Error(
          `Invalid contentType: '${val}'. Allowed values are: ${VALID_CONTENT_TYPES.join(', ')}`
        );
      }
      return true;
    }),
];

/**
 * Dynamic validation middleware for Community Engagement gateway.
 * 1. Validates presence and correctness of contentType.
 * 2. Normalizes common envelope properties (e.g. audience -> targetAudience, option strings -> { text }).
 * 3. Delegates domain validation to the authoritative feature validator (Notice or Poll).
 */
export const validateEngagementContent = async (req, res, next) => {
  try {
    const rawContentType = req.body?.contentType;
    if (!rawContentType || typeof rawContentType !== 'string' || !rawContentType.trim()) {
      throw new HttpError(400, 'contentType is required and must be either NOTICE or POLL');
    }

    const contentType = rawContentType.trim().toUpperCase();
    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      throw new HttpError(
        400,
        `Invalid contentType: '${rawContentType}'. Allowed values are: ${VALID_CONTENT_TYPES.join(', ')}`
      );
    }

    // Normalized canonical contentType in request body
    req.body.contentType = contentType;

    // Normalize audience contract if client passed `audience` instead of `targetAudience`
    if (req.body.audience && !req.body.targetAudience) {
      let targetAudience = req.body.audience;
      if (typeof targetAudience === 'string') {
        try {
          targetAudience = JSON.parse(targetAudience);
        } catch (e) {
          // preserve as string
        }
      }
      req.body.targetAudience = targetAudience;
    }

    // Dynamic delegation to domain validation rules
    if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.NOTICE) {
      return validate(createNoticeRules)(req, res, next);
    }

    if (contentType === COMMUNITY_ENGAGEMENT_CONTENT_TYPES.POLL) {
      // Normalize options if client provided array of plain strings e.g. ["Yes", "No"]
      if (Array.isArray(req.body.options)) {
        req.body.options = req.body.options.map((opt) => {
          if (typeof opt === 'string') {
            return { text: opt.trim() };
          }
          return opt;
        });
      }
      return validate(createPollRules())(req, res, next);
    }

    throw new HttpError(400, `Unhandled contentType: '${contentType}'`);
  } catch (error) {
    next(error);
  }
};

export default validateEngagementContent;
