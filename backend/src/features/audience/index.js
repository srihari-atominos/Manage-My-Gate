import audienceService, { AudienceService } from './audience.service.js';
import targetAudienceSchema, { ruleGroupSchema } from './audience.schema.js';
import { AUDIENCE_TARGET_TYPES, VALID_TARGET_TYPES, DEFAULT_RESIDENCY_TYPES } from './audience.constants.js';

export {
  AudienceService,
  targetAudienceSchema,
  ruleGroupSchema,
  AUDIENCE_TARGET_TYPES,
  VALID_TARGET_TYPES,
  DEFAULT_RESIDENCY_TYPES,
};

export default audienceService;
