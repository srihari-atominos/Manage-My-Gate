import { Router } from 'express';
import aiAssistantController from './aiAssistant.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  tokenRequestValidator,
  releaseRequestValidator,
  chatRequestValidator,
  toolExecutionValidator,
} from './aiAssistant.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { aiAssistantLimiter } from './aiAssistant.limiter.js';
import authorizePermission from '../../middlewares/rbac.middleware.js';

const router = Router();

// Enforce authentication and valid tenant/community context across all AI Assistant endpoints
router.use(isAuthenticated);
router.use(tenantContext());

/**
 * GET /api/v1/ai-assistant/config
 * Retrieves safe assistant configuration and user's authorized navigation features
 */
router.get('/config', aiAssistantController.getConfig);

/** Aggregate-only dataset health; no prompts or conversation data are exposed. */
router.get(
  '/evaluation/summary',
  authorizePermission('billing', ['dashboard']),
  aiAssistantController.getEvaluationSummary
);

/**
 * POST /api/v1/ai-assistant/session/token
 * Provisions a short-lived ephemeral token for real-time Gemini Live WebSocket connection
 */
router.post(
  '/session/token',
  validate(tokenRequestValidator),
  aiAssistantLimiter,
  aiAssistantController.createToken
);

/**
 * POST /api/v1/ai-assistant/session/release
 * Voluntarily releases an active session reservation when user disconnects
 */
router.post(
  '/session/release',
  validate(releaseRequestValidator),
  aiAssistantController.releaseSession
);

/**
 * POST /api/v1/ai-assistant/chat
 * Generates a text-based conversational reply with live data and navigation action support
 */
router.post(
  '/chat',
  validate(chatRequestValidator),
  aiAssistantController.chat
);

/**
 * POST /api/v1/ai-assistant/chat/stream
 * Streams a text-based conversational reply using Server-Sent Events (SSE)
 */
router.post(
  '/chat/stream',
  validate(chatRequestValidator),
  aiAssistantController.streamChat
);

/**
 * POST /api/v1/ai-assistant/tools/execute
 * Securely executes an authorized backend data tool for voice or chat
 */
router.post(
  '/tools/execute',
  validate(toolExecutionValidator),
  aiAssistantController.executeTool
);

export default router;
