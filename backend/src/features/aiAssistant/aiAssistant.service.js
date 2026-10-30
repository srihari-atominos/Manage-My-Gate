import mongoose from 'mongoose';
import config from '../../config/config.js';
import HttpError from '../../utils/httpError.utils.js';
import logger from '../../utils/logger.utils.js';
import { expandUserPermissions } from '../../utils/permissionMapper.js';
import { releaseActiveSession, generateSessionId } from './aiAssistant.limiter.js';
import { ASSISTANT_TOOL_DECLARATIONS, executeAssistantTool } from './aiAssistant.tools.js';
import { getAuthorizedOperations, isOperationAuthorized } from './aiAssistant.registry.js';
import { runAssistantEvaluation } from './evaluation/aiAssistant.evaluator.js';
import {
  analyzeConversationTurn,
  splitCompoundQuery,
  buildPromptContextInstruction,
  sanitizeConversationState,
  canUserCreateAmenity,
  canUserBookAmenity,
  canUserDiscoverAmenities,
  canUserCreateVisitorPass,
  canUserRaiseComplaint,
  canUserCreatePoll,
  canUserCreateNotice,
  canUserCreateAssessment,
  canUserViewCommunityFinance,
} from './aiAssistant.conversation.js';

export function filterAuthorizedToolDeclarations(user, tenant) {
  return ASSISTANT_TOOL_DECLARATIONS.filter((tool) => isOperationAuthorized(tool.name, user, tenant));
}

/**
 * Curated list of safe voice navigation targets mapped to NAHOM's canonical permissions.
 * Target permission 'null' denotes features open to all authenticated residents.
 */
export const SAFE_VOICE_NAVIGATION_TARGETS = Object.freeze([
  // 1. Visitor & Gate Security
  {
    id: 'visitor_resident_passes',
    name: 'Resident Passes',
    permission: 'visitor:resident',
    route: '/(resident)/visitor',
    category: 'visitor_management',
  },
  {
    id: 'visitor_gate_console',
    name: 'Gate Console',
    permission: 'visitor:guard',
    route: '/(resident)/visitor/gate-console',
    category: 'visitor_management',
  },
  {
    id: 'visitor_admin_dashboard',
    name: 'Visitor Admin Console',
    permission: 'visitor:admin',
    route: '/(resident)/visitor/admin',
    category: 'visitor_management',
  },

  // 2. Amenities & Facilities
  {
    id: 'amenities_discover',
    name: 'Discover Amenities',
    permission: 'amenities:discover',
    route: '/(resident)/amenities/discover',
    category: 'amenities_facilities',
  },
  {
    id: 'amenities_my_booking',
    name: 'My Bookings',
    permission: 'amenities:my_booking',
    route: '/(resident)/amenities/my-bookings',
    category: 'amenities_facilities',
  },
  {
    id: 'amenities_master',
    name: 'Amenity Master',
    permission: 'amenities:master',
    route: '/(resident)/amenities/admin-master',
    category: 'amenities_facilities',
  },
  {
    id: 'amenities_admin_bookings',
    name: 'Booking Approvals Queue',
    permission: 'amenities:booking_queue',
    route: '/(resident)/amenities/admin-bookings',
    category: 'amenities_facilities',
  },

  // 3. Complaints & Maintenance Helpdesk
  {
    id: 'complaints_raise_ticket',
    name: 'Raise Ticket',
    permission: 'complaints:raise_ticket',
    route: '/(resident)/complaints/raise-ticket',
    category: 'complaints_helpdesk',
  },
  {
    id: 'complaints_my_tickets',
    name: 'My Tickets',
    permission: 'complaints:my_tickets',
    route: '/(resident)/complaints/my-tickets',
    category: 'complaints_helpdesk',
  },
  {
    id: 'complaints_management',
    name: 'Complaint Board',
    permission: 'complaints:complaint_management',
    route: '/(resident)/complaints/manage',
    category: 'complaints_helpdesk',
  },

  // 4. Community Notices & Engagement
  {
    id: 'notices_active_board',
    name: 'Notice Board',
    permission: 'notices:active_board',
    route: '/(resident)/notices/active-board',
    category: 'notice_board_polls',
  },
  {
    id: 'community_engagement',
    name: 'Community Engagement Hub',
    permission: 'notices:polls',
    route: '/(resident)/community-engagement',
    category: 'notice_board_polls',
  },

  // 5. Billing & Financial Ledger
  {
    id: 'billing_my_invoices',
    name: 'My Invoices & Dues',
    permission: 'billing:my_invoices',
    route: '/(resident)/billing/my-dues',
    category: 'financial_billing',
  },
  {
    id: 'billing_wallet',
    name: 'Digital Wallet',
    permission: 'billing:action_center',
    route: '/(resident)/billing/wallet',
    category: 'financial_billing',
  },
  {
    id: 'billing_expenses',
    name: 'Community Expenses',
    permission: 'billing:view_expense',
    route: '/(resident)/admin/billing/expenses',
    category: 'financial_billing',
  },
  {
    id: 'community_finance',
    name: 'Community Finance Overview',
    permission: 'billing:dashboard',
    route: '/(resident)/admin/billing/community-finance',
    category: 'financial_billing',
  },

  // 6. Personal Finance (resident utility)
  {
    id: 'personal_expense_manager',
    name: 'Personal Expense Manager',
    permission: null,
    route: '/(resident)/expense-manager',
    category: 'personal_finance',
  },

  // 7. Directory & Community Notes
  {
    id: 'directory_residents',
    name: 'Resident Directory',
    permission: 'directory:resident',
    route: '/(resident)/directory/residents',
    category: 'community_directory',
  },
  {
    id: 'community_notes',
    name: 'Community Notes',
    permission: 'directory:notes',
    route: '/(resident)/directory/notes',
    category: 'community_directory',
  },

  // 8. Staff & Work Logs
  {
    id: 'staff_attendance_board',
    name: 'Staff Attendance',
    permission: 'staff:attendance',
    route: '/(resident)/staff/attendance',
    category: 'staff_management',
  },

  // 9. Administration & Settings
  {
    id: 'admin_users',
    name: 'User Management',
    permission: 'users:read',
    route: '/(resident)/admin/users',
    category: 'administration_security',
  },
  {
    id: 'admin_villas',
    name: 'Villa Management',
    permission: 'villas:read',
    route: '/(resident)/admin/villas',
    category: 'administration_security',
  },
  {
    id: 'admin_role_builder',
    name: 'Role Builder',
    permission: 'roles:read',
    route: '/(resident)/admin/role-builder',
    category: 'administration_security',
  },
  {
    id: 'admin_workspace_settings',
    name: 'Workspace Settings',
    permission: 'workspaces:read',
    route: '/(resident)/admin/workspaces',
    category: 'administration_security',
  },
]);

// Dependency injection hook for unit test mocks
let injectedFetch = null;
let injectedIntegrationHubService = null;

export function setTestFetch(fn) {
  injectedFetch = fn;
}

export function resetTestFetch() {
  injectedFetch = null;
}

export const setFetchImplementation = setTestFetch;
export const resetFetchImplementation = resetTestFetch;

export function setTestIntegrationHubService(service) {
  injectedIntegrationHubService = service;
}

export function resetTestIntegrationHubService() {
  injectedIntegrationHubService = null;
}

export const setIntegrationHubService = setTestIntegrationHubService;
export const resetIntegrationHubService = resetTestIntegrationHubService;

class AIAssistantService {
  /**
   * Filters the safe voice targets according to the active user's permissions and platform status.
   *
   * @param {object} user - Authenticated user object
   * @param {object} tenant - Verified tenant context
   * @returns {Array<object>} Allowlisted targets accessible to this user
   */
  filterAuthorizedFeatures(user, tenant) {
    if (!user) return [];

    // Platform Super Admin / Platform Admin bypass
    if (user.isPlatform === true || tenant?.isPlatform === true) {
      return SAFE_VOICE_NAVIGATION_TARGETS.map(({ id, name, route, category }) => ({
        id,
        name,
        route,
        category,
      }));
    }

    // Expand granular permissions using the canonical mapper
    const rawPermissions = Array.isArray(user?.permissions)
      ? user.permissions
      : (Array.isArray(tenant?.permissions) ? tenant.permissions : []);
    const expanded = expandUserPermissions(rawPermissions);
    const userPermSet = new Set(expanded);

    // Elevated tenant admins (Community Admin, Super Admin)
    const isAdmin =
      user.role === 'Super Admin' ||
      user.role === 'Admin' ||
      user.role === 'Community Admin' ||
      userPermSet.has('*');

    const allowed = SAFE_VOICE_NAVIGATION_TARGETS.filter((target) => {
      // Open feature available to all residents
      if (target.permission === null) return true;
      if (isAdmin) return true;
      return userPermSet.has(target.permission);
    });

    return allowed.map(({ id, name, route, category }) => ({
      id,
      name,
      route,
      category,
    }));
  }

  /**
   * Resolves the active Gemini voice assistant runtime configuration.
   *
   * Precedence:
   * 1. Global kill switch (VOICE_ASSISTANT_ENABLED=false) rejects all sessions.
   * 2. An explicitly configured Integration Hub database connection takes precedence.
   *    If configured but marked disconnected or missing a key, it fails closed
   *    instead of falling back to environment variables.
   * 3. If no database connection exists, uses the environment-based fallback.
   *
   * @returns {Promise<object>} Resolved runtime configuration
   */
  async resolveRuntimeConfig() {
    const defaultModel = config.aiAssistant?.geminiModel || 'gemini-2.0-flash';
    const defaultChatModel = config.aiAssistant?.geminiChatModel || 'gemini-2.0-flash';
    const defaultDuration = config.aiAssistant?.sessionDurationSec || 600;
    const defaultMaxSessions = config.aiAssistant?.maxDailySessions || 5;

    // 1. Check Global Kill Switch
    if (config.aiAssistant?.enabled === false) {
      return {
        enabled: false,
        killSwitched: true,
        apiKey: null,
        model: defaultModel,
        chatModel: defaultChatModel,
        sessionDurationSec: defaultDuration,
        maxDailySessions: defaultMaxSessions,
        source: 'kill-switch',
      };
    }

    // 2. Check Integration Hub for explicitly configured platform connection
    let dbConnection = null;
    let hubService = injectedIntegrationHubService;
    try {
      if (!hubService && mongoose.connection?.readyState === 1) {
        const mod = await import('../integrationHub/integrationHub.service.js');
        hubService = mod.default || mod;
      }
      if (hubService && typeof hubService.getGlobalConnectionByProvider === 'function') {
        dbConnection = await hubService.getGlobalConnectionByProvider('gemini');
      }
    } catch (err) {
      logger.warn(`[AIAssistant] Error resolving DB integration for gemini: ${err.message}`);
    }

    if (dbConnection) {
      // Fail closed if explicitly disabled or disconnected in database
      if (dbConnection.status !== 'connected') {
        return {
          enabled: false,
          disabledByDb: true,
          apiKey: null,
          model: defaultModel,
          sessionDurationSec: defaultDuration,
          maxDailySessions: defaultMaxSessions,
          source: 'database-disconnected',
        };
      }

      let decrypted = {};
      try {
        if (typeof hubService.decryptAll === 'function') {
          decrypted = hubService.decryptAll(dbConnection);
        } else if (Array.isArray(dbConnection.credentials)) {
          const { decryptCredential } = await import('../integrationHub/utils/crypto.util.js');
          for (const cred of dbConnection.credentials) {
            decrypted[cred.key] = decryptCredential(cred);
          }
        }
      } catch (decErr) {
        logger.error(`[AIAssistant] Failed to decrypt Gemini credentials: ${decErr.message}`);
        return {
          enabled: false,
          disabledByDb: true,
          apiKey: null,
          model: defaultModel,
          sessionDurationSec: defaultDuration,
          maxDailySessions: defaultMaxSessions,
          source: 'database-decrypt-error',
        };
      }

      const apiKey = decrypted.apiKey?.trim();
      if (!apiKey) {
        return {
          enabled: false,
          disabledByDb: true,
          apiKey: null,
          model: defaultModel,
          sessionDurationSec: defaultDuration,
          maxDailySessions: defaultMaxSessions,
          source: 'database-empty-key',
        };
      }

      const model = decrypted.model?.trim() || defaultModel;
      const chatModel = decrypted.chatModel?.trim() || defaultChatModel;
      const sessionDurationSec = Number(decrypted.sessionDurationSec) || defaultDuration;
      const maxDailySessions = Number(decrypted.maxDailySessions) || defaultMaxSessions;

      return {
        enabled: true,
        apiKey,
        model,
        chatModel,
        sessionDurationSec,
        maxDailySessions,
        source: 'database',
      };
    }

    // 3. Fallback to environment variables
    const envKey = config.aiAssistant?.geminiApiKey?.trim();
    const isEnvConfigured = Boolean(envKey);
    const isEnabled = isEnvConfigured && config.aiAssistant?.enabled !== false;

    return {
      enabled: isEnabled,
      apiKey: envKey || null,
      model: defaultModel,
      chatModel: defaultChatModel,
      sessionDurationSec: defaultDuration,
      maxDailySessions: defaultMaxSessions,
      source: 'environment',
    };
  }

  /**
   * Retrieves safe assistant configuration for the active client.
   * Never exposes internal server secrets or the master GEMINI_API_KEY.
   *
   * @param {object} user - Authenticated user context
   * @param {object} tenant - Verified tenant context
   * @returns {Promise<object>}
   */
  async getAssistantConfig(user, tenant) {
    const runtime = await this.resolveRuntimeConfig();
    const liveEndpoint = config.aiAssistant?.liveEndpoint || 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';

    return {
      enabled: runtime.enabled,
      model: runtime.model,
      chatModel: runtime.chatModel || 'gemini-2.0-flash',
      liveEndpoint,
      sessionDurationSec: runtime.sessionDurationSec,
      sessionDurationSeconds: runtime.sessionDurationSec,
      maxDailySessions: runtime.maxDailySessions,
      authorizedFeatures: this.filterAuthorizedFeatures(user, tenant),
      authorizedOperations: getAuthorizedOperations(user, tenant).map(({ toolName, feature, intent, mutation, confirmationRequired }) => ({
        toolName, feature, intent, mutation, confirmationRequired,
      })),
    };
  }

  /**
   * Aggregate-only admin evaluation status. This intentionally returns neither
   * prompts, user identifiers, financial values, nor stored conversations.
   */
  getEvaluationSummary() {
    const result = runAssistantEvaluation();
    return {
      version: result.version,
      evaluatedAt: result.evaluatedAt,
      totalCases: result.totalCases,
      enabledOperations: result.enabledOperations,
      coveredOperations: result.coveredOperations,
      passed: result.passed,
      failureCount: result.failureCount,
      failureCategories: [...new Set(result.failures.map((failure) => failure.category))],
    };
  }

  /**
   * Requests a short-lived ephemeral token from Google's Gemini Live API.
   *
   * @param {object} user - Authenticated user context
   * @param {object} tenant - Verified tenant context
   * @param {object} clientContext - Safe client metadata
   * @param {string} [explicitSessionId] - Reconciled session identifier
   * @returns {Promise<object>}
   */
  async createSessionToken(user, tenant, clientContext = {}, explicitSessionId = null) {
    const runtime = await this.resolveRuntimeConfig();

    // 1. Verify Kill Switch or disabled status
    if (runtime.killSwitched || config.aiAssistant?.enabled === false) {
      throw new HttpError(503, 'Voice assistant is currently disabled.');
    }

    if (!runtime.enabled) {
      if (runtime.disabledByDb) {
        throw new HttpError(503, 'Voice assistant integration is currently disabled in system settings.');
      }
      throw new HttpError(503, 'Voice assistant service is not configured on this server.');
    }

    // 2. Verify Resolved API Key
    const apiKey = runtime.apiKey;
    if (!apiKey) {
      logger.error('[AIAssistant] GEMINI_API_KEY is not configured on server.');
      throw new HttpError(503, 'Voice assistant service is not configured on this server.');
    }

    const sessionDurationSec = runtime.sessionDurationSec;
    const now = new Date();
    const newSessionExpireTime = new Date(now.getTime() + 60 * 1000).toISOString(); // 60s handshake window
    const expireTime = new Date(now.getTime() + sessionDurationSec * 1000).toISOString();

    const requestPayload = {
      uses: 1, // Single-use constraint
      newSessionExpireTime,
      expireTime,
    };

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/auth_tokens';
    const activeFetch = injectedFetch || globalThis.fetch;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s upstream timeout

    const tenantId = tenant?.orgId || user?.orgId;
    const userId = user?.id || user?._id;
    const sessionId = explicitSessionId || clientContext?.sessionId || generateSessionId();

    let response;
    try {
      response = await activeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      // Auto-release active reservation and refund daily quota on network failure
      await releaseActiveSession(tenantId, userId, { sessionId, refundDaily: true }).catch(() => {});

      if (err.name === 'AbortError') {
        logger.error('[AIAssistant] Upstream Google auth_tokens request timed out.');
        throw new HttpError(504, 'AI service provider timed out.');
      }
      logger.error(`[AIAssistant] Upstream network error connecting to Google API: ${err.message}`);
      throw new HttpError(502, 'Failed to connect to AI service provider.');
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      // Auto-release active reservation and refund daily quota on non-200 upstream response
      await releaseActiveSession(tenantId, userId, { sessionId, refundDaily: true }).catch(() => {});

      const status = response.status;
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {}

      logger.warn(`[AIAssistant] Google API error (${status}): ${errorBody.slice(0, 300)}`);

      if (status === 401 || status === 403) {
        throw new HttpError(502, 'Failed to authenticate with AI service provider.');
      }
      if (status === 429) {
        throw new HttpError(429, 'AI service provider quota exceeded. Please try again later.');
      }
      throw new HttpError(502, 'AI service provider is currently unavailable. Please try again later.');
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      logger.error('[AIAssistant] Failed to parse upstream Google auth_tokens response.');
      throw new HttpError(502, 'Invalid response received from AI service provider.');
    }

    if (!data || !data.name) {
      logger.error('[AIAssistant] Upstream Google auth_tokens response missing token name.');
      throw new HttpError(502, 'Invalid response received from AI service provider.');
    }

    logger.info('[AIAssistant] Ephemeral token provisioned successfully', {
      sessionId,
      userId,
      orgId: tenantId,
      sessionDurationSec,
    });

    const authorizedFeatures = this.filterAuthorizedFeatures(user, tenant);
    const liveEndpoint = config.aiAssistant?.liveEndpoint || 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';

    return {
      sessionId,
      token: data.name,
      model: runtime.model || 'gemini-3.8-live',
      liveEndpoint,
      sessionDurationSec,
      sessionDurationSeconds: sessionDurationSec,
      expireTime: data.expireTime || expireTime,
      authorizedFeatures,
      tools: ASSISTANT_TOOL_DECLARATIONS,
    };
  }

  /**
   * Releases an active session reservation voluntarily when the user disconnects.
   *
   * @param {object} user - Authenticated user context
   * @param {object} tenant - Verified tenant context
   * @param {string} [sessionId] - Specific session ID to release
   */
  async releaseSession(user, tenant, sessionId = null) {
    const tenantId = tenant?.orgId || user?.orgId;
    const userId = user?.id || user?._id;
    return await releaseActiveSession(tenantId, userId, { sessionId });
  }

  /**
   * Generates a text response for the unified assistant with multi-turn live data retrieval.
   * Returns a unified response contract: { message, actions, data, status, requestId }.
   *
   * @param {object} user - Authenticated user context
   * @param {object} tenant - Verified tenant context
   * @param {object} params - { message, history, context }
   * @returns {Promise<object>}
   */
  async generateChatResponse(userOrOptions, tenantParam, paramsParam) {
    let user, tenant, params;
    if (userOrOptions && typeof userOrOptions === 'object' && ('message' in userOrOptions || 'user' in userOrOptions) && !tenantParam) {
      user = userOrOptions.user;
      tenant = userOrOptions.tenant;
      params = {
        message: userOrOptions.message,
        history: userOrOptions.history || [],
        context: userOrOptions.context || {},
      };
    } else {
      user = userOrOptions;
      tenant = tenantParam;
      params = paramsParam || {};
    }
    const { message, history = [], context = {} } = params;

    const correlationId = context?.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const runtime = await this.resolveRuntimeConfig();

    const authorizedFeatures = this.filterAuthorizedFeatures(user, tenant);
    const featureDescriptions = authorizedFeatures
      .map((f) => `- ${f.name} (ID: "${f.id}"): ${f.description || f.name}`)
      .join('\n');

    const referenceDate = context?.referenceDate ? new Date(context.referenceDate) : new Date();

    const compoundParts = splitCompoundQuery(message);
    if (compoundParts && compoundParts.length >= 2) {
      logger.info(`[AIAssistant] Compound multi-intent detected (${compoundParts.length} sub-intents): ${compoundParts.map((p) => p.intent).join(', ')}`);
      return await this.processMultiIntentCompoundRequest(
        user,
        tenant,
        compoundParts,
        authorizedFeatures,
        correlationId
      );
    }

    const conversationState = analyzeConversationTurn(
      message,
      context?.conversationState,
      history,
      referenceDate,
      { user, tenant, authorizedFeatures }
    );

    // If permission was denied by conversation analysis, return clear rejection immediately
    if (conversationState.interactionType === 'permission_denied') {
      const denialMessage = conversationState.denialReason || "You don't have permission to perform this action.";
      return {
        message: denialMessage,
        reply: denialMessage,
        actions: [],
        data: {
          permissionDenied: true,
          authorized: false,
          permittedAlternatives: conversationState.permittedAlternatives || [],
        },
        actionProposal: null,
        conversationState: sanitizeConversationState(conversationState),
      };
    }

    if (runtime.killSwitched || config.aiAssistant?.enabled === false) {
      throw new HttpError(503, 'AI Assistant is currently disabled.');
    }
    if (!runtime.enabled || !runtime.apiKey) {
      if (runtime.disabledByDb) {
        throw new HttpError(503, 'AI Assistant integration is currently disabled in system settings.');
      }
      logger.info('[AIAssistant] Upstream cloud API key not configured; invoking deterministic domain fallback engine.');
      return await this.generateDeterministicFallbackResponse(
        user,
        tenant,
        message,
        conversationState,
        authorizedFeatures,
        correlationId
      );
    }

    const contextGuidance = buildPromptContextInstruction(conversationState, referenceDate);

    const systemInstruction = {
      parts: [
        {
          text: `You are NAHOM AI Assistant, the intelligent assistant for NAHOM gated community residents.
Your role is to answer questions directly, retrieve community and financial information using the available tools, help residents navigate the application, prepare and execute verified actions, and provide helpful guidance.

Behavior Guidelines:
1. Natural Language Answers: ALWAYS answer normal questions directly in plain, friendly, conversational text. NEVER output an empty response.
2. Real Data Questions: When a user asks about community expenses, maintenance collections, personal expenses, unpaid dues, amenities, bookings, complaints, or visitors, invoke the appropriate tool to retrieve live data. Then clearly explain the answer with relevant currency (₹) and period (e.g. October 2026). For community expenses, present the total community expenses incurred, total collections, net surplus/deficit, top expense categories, and list any recent community expense items with their title, amount, category, and date. If all-time total expenses differ from the current period, mention both transparently.
3. Tool Output Synthesis: When a tool returns data, synthesize the results into a helpful conversational response explaining specific details (e.g. amounts, invoice numbers, statuses, available slot times, visitor names, entry times, pass short keys, booking IDs). Do NOT leave the answer blank or tell the user to only click a button.
4. Navigation & Actions: When a user asks to view or open a feature, invoke 'navigate_to_screen'. Explain what will be opened alongside the action card.
5. Action Workflows (Two-Phase Execution):
   - You can prepare and execute verified application actions:
     a) Visitor Pass Creation: invoke 'prepare_visitor_pass'.
     b) Visitor Pass Revocation: invoke 'prepare_visitor_pass_revocation'.
     c) Amenity Booking Creation: invoke 'prepare_amenity_booking'.
     d) Amenity Booking Cancellation: invoke 'prepare_amenity_booking_cancellation'.
     e) Personal Expense Creation: invoke 'prepare_personal_expense'.
     f) Complaint Ticket Creation: invoke 'prepare_complaint'.
     g) Maintenance Request Creation: invoke 'prepare_maintenance_request'.
     h) Complaint / Maintenance Ticket Cancellation: invoke 'prepare_complaint_cancellation'.
     i) Ticket Escalation: invoke 'escalate_complaint'.
     j) Ticket Reopening: invoke 'reopen_complaint'.
     k) Ticket Comment / Remark: invoke 'add_complaint_comment'.
     l) Critical Notice Acknowledgement: invoke 'prepare_notice_acknowledgement'.
     m) Community Poll Voting: invoke 'prepare_poll_vote'.
     n) Amenity Facility Creation (Admin / Facility Manager): invoke 'prepare_amenity_creation'.
     o) Maintenance Assessment Creation (Admin / Billing Manager): invoke 'prepare_assessment_creation'.
     p) Community Poll Creation (Admin): invoke 'prepare_poll_creation'.
     q) Notice Board Publication (Admin): invoke 'prepare_notice_creation'.
   - NEVER claim that an action has been completed, created, booked, or revoked until the backend confirmation tool ('confirm_pending_action') has actually succeeded and returned a real database record or reference code.
   - When preparing an action, explain the proposal clearly (dates, amounts, issue details, fees, visitor name, facility specs) and ask the user to confirm via the interactive card or by replying 'Confirm'.
   - If required parameters are missing (e.g. visitor name, date, amenity name, slot time, expense amount, complaint title), ask clear follow-up questions to collect them.
   - When an action is confirmed and executed, report the real resulting ID (e.g. Pass code, Short key, Booking ID, Transaction ID, Facility ID, or Ticket number) from the execution response.
6. Financial Mutations: For bill and invoice payments, direct the user to the dedicated billing/wallet screen to review and pay securely. For creating community maintenance assessments (bulk billing runs for residents), invoke 'prepare_assessment_creation' to present an HMAC confirmation proposal card. Do not claim payment happened on the AI chat thread.
7. Distinguishing Zero/Empty Data vs. Service Failures:
   - If a tool returns zero dues (totalOutstandingDues: 0), warmly confirm to the resident that they have no pending dues and their account is fully settled.
   - If a tool reports an error (success: false or service unavailable), NEVER tell the user they have zero dues or zero bookings; inform them honestly that records could not be retrieved and suggest checking the respective application section.
   - If get_my_bookings returns count: 0, inform the resident that they have no active or upcoming bookings for that specified period.
   - If get_my_visitor_passes returns count: 0, inform the resident that they have no active or upcoming visitor passes.
   - If get_visitor_history returns count: 0, inform the resident that no visitor entry logs were found.
   - If get_pending_gate_approvals returns count: 0, inform the resident that there are no pending visitor approvals at the gate.
   - If get_my_complaints returns count: 0, inform the resident that there are no matching complaints found.
8. Multi-turn Follow-ups & Relative Dates: Consecutive messages often refer to the same topic. When the user asks follow-up questions referencing previous context (such as 'What about next week?', 'Any bookings tomorrow?'), interpret them in the context of the active topic and invoke the corresponding tool with the updated date parameters.
9. Clarification vs. Confirmation (All-in-One Humor & Checklist Format):
   - Clarification: If required parameters are missing to complete a request (such as booking an amenity without specifying which amenity, what date, or what time slot; or visitor pass without name, date, or time), NEVER interrogate the user with one attribute per turn across multiple turns. Instead, ask for ALL missing details together in a single, witty, comedic or interesting prompt with emojis and a bulleted checklist, letting the user know they can reply with everything in one single sentence (e.g. "Tennis tomorrow at 6 PM").
   - Confirmation: Once all details are gathered, present the proposal clearly with date and slot time and prompt the user to confirm before directing them to confirm.
10. Visitor Management Guidance:
   - For visitor logs ("Who visited today?", "Show visitor logs"): invoke 'get_visitor_history' and summarize entries.
   - For active passes ("Show my visitor passes", "Do I have any active passes?"): invoke 'get_my_visitor_passes' and summarize the passes.
   - For gate approvals ("Who is at the gate?", "Pending approvals"): invoke 'get_pending_gate_approvals'.
   - For creating or issuing a new pass ("Create a visitor pass for Rahul", "Invite a guest"): invoke 'prepare_visitor_pass' after having the visitor's name and visit date.
   - For revoking a pass ("Cancel Rahul's pass", "Revoke visitor pass"): invoke 'prepare_visitor_pass_revocation' with passId or visitorName.
11. Amenity Management Guidance:
   - For booking ("Book badminton court tomorrow 6 PM to 7 PM"): invoke 'prepare_amenity_booking'. If resident wallet balance is insufficient, clearly inform them and guide them to Click to Pay Online (Google Pay, PhonePe, UPI, Card).
   - For cancellation ("Cancel my badminton booking"): invoke 'prepare_amenity_booking_cancellation'.
   - For creating or adding new amenities in Amenity Master ("Create a basketball court with 500 per slot for 10 members", "Add new amenity tennis court in amenity master"): invoke 'prepare_amenity_creation'. Extract name, rate/price per slot, capacity, and slot duration, and prompt for confirmation via the interactive card.
12. Personal Expense Management Guidance:
   - For adding/logging expenses ("Spent ₹450 on groceries", "Add expense ₹250 for milk"): invoke 'prepare_personal_expense'. Require amount, infer or use category, date (defaults today), payment method (defaults UPI). Always prompt for confirmation.
   - For expense queries ("How much did I spend this month?", "Show my grocery expenses", "What is my remaining budget?"): invoke 'get_personal_expense_summary'. Report personal income, expenses, net balance, category breakdown, budget utilization, and recent transactions.
   - For receipt parsing / payment proof: invoke 'preview_receipt_ocr'.
13. Complaint & Maintenance Helpdesk Guidance:
   - For physical breakdowns, repairs, and technician visits (plumber, electrician, AC, carpenter, lift repairs): invoke 'prepare_maintenance_request'. Ask for preferred visit date/time if not provided. Always prompt for confirmation.
   - For civic grievances, disturbances, housekeeping, noise, security issues: invoke 'prepare_complaint'. Always prompt for confirmation.
   - For tracking complaint status ("Status of complaint CMP-2026-000001", "My open complaints"): invoke 'get_my_complaints'. Report ticket number, issue, category, priority, status, assigned technician, and SLA resolution target.
   - For cancelling complaints ("Cancel complaint CMP-2026-000001"): invoke 'prepare_complaint_cancellation'. Complaints can only be cancelled before assignment.
   - For escalating delayed or unresolved complaints: invoke 'escalate_complaint'. Always prompt for confirmation.
   - For reopening closed tickets where the issue persists: invoke 'reopen_complaint'. Always prompt for confirmation.
   - For adding remarks or updates to an existing ticket: invoke 'add_complaint_comment'.
14. Community Polls Guidance:
   - For voting on active polls: invoke 'prepare_poll_vote'.
   - For creating or launching a new poll (Admin: "Create a poll on pool timings with options 6 AM, 7 AM, 8 AM", "Start a community poll"): invoke 'prepare_poll_creation'. Extract question and options, and prompt for confirmation.
15. Notice Board Guidance:
   - For viewing notices: invoke 'get_community_notices'.
   - For publishing an announcement or notice (Admin: "Post a notice on water shutdown tomorrow at 10 AM", "Publish notice for AGM"): invoke 'prepare_notice_creation'. Extract title, description, priority, and category, and prompt for confirmation.
16. Speak politely, accurately, and concisely. Keep answers informative yet easy to read on mobile.

${contextGuidance}

Authorized features for this resident:
${featureDescriptions}`,
        },
      ],
    };

    const tools = [{ functionDeclarations: filterAuthorizedToolDeclarations(user, tenant) }];

    const contents = [];
    const recentHistory = Array.isArray(history) ? history.slice(-20) : [];
    for (const h of recentHistory) {
      if (!h.text || typeof h.text !== 'string') continue;
      const role = h.role === 'model' || h.role === 'assistant' ? 'model' : 'user';
      contents.push({ role, parts: [{ text: h.text.slice(0, 2000) }] });
    }
    contents.push({ role: 'user', parts: [{ text: String(message).slice(0, 2000) }] });

    // Pre-execution of deterministic confirmed or cancelled pending action
    let preExecutedActionResult = null;
    const initialActions = [];
    let initialData = null;

    if (conversationState.actionConfirmed && conversationState.pendingAction?.id) {
      const result = await executeAssistantTool(
        user,
        tenant,
        'confirm_pending_action',
        {
          actionId: conversationState.pendingAction.id,
          confirmationToken: conversationState.pendingAction.confirmationToken,
        },
        authorizedFeatures
      );
      preExecutedActionResult = result;
      if (result.action) initialActions.push(result.action);
      if (result.data) initialData = { ...result.data };
      conversationState.awaitingConfirmation = false;
      conversationState.pendingAction = null;
      conversationState.actionConfirmed = false;
      conversationState.workflow = 'idle';
      conversationState.interactionType = result.success ? 'answering' : 'clarification';
    } else if (conversationState.actionCancelled && conversationState.pendingAction?.id) {
      const result = await executeAssistantTool(
        user,
        tenant,
        'cancel_pending_action',
        {
          actionId: conversationState.pendingAction.id,
        },
        authorizedFeatures
      );
      preExecutedActionResult = result;
      if (result.action) initialActions.push(result.action);
      if (result.data) initialData = { ...result.data };
      conversationState.awaitingConfirmation = false;
      conversationState.pendingAction = null;
      conversationState.actionCancelled = false;
      conversationState.workflow = 'idle';
      conversationState.interactionType = 'answering';
    }

    if (preExecutedActionResult) {
      contents.push({
        role: 'user',
        parts: [
          {
            text: preExecutedActionResult.success
              ? `[System Note: The resident confirmed this action and the backend executed it with real verified success. Result data: ${JSON.stringify(preExecutedActionResult.data)}. Summarize the outcome warmly and clearly to the resident, referencing confirmed details and any issued reference IDs or short keys.]`
              : `[System Note: The resident attempted to confirm or cancel the action, but execution failed with error: "${preExecutedActionResult.error}". Explain this error clearly and do not claim that the operation succeeded.]`,
          },
        ],
      });
    }

    const modelsToTry = [
      runtime.chatModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
    ].filter(Boolean).filter((m, idx, arr) => arr.indexOf(m) === idx);

    const activeFetch = injectedFetch || globalThis.fetch;
    let lastError = null;

    for (const model of modelsToTry) {
      const cleanModel = model.replace(/^models\//, '');
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${runtime.apiKey}`;

      try {
        let turn = 0;
        const maxTurns = 3;
        let finalReply = '';
        const collectedActions = [...initialActions];
        let collectedData = initialData ? { ...initialData } : null;

        while (turn < maxTurns) {
          turn += 1;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 14000);

          const response = await activeFetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemInstruction, contents, tools }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errText = await response.text().catch(() => '');
            logger.warn(`[AIAssistant] Chat model ${cleanModel} returned ${response.status}: ${errText.slice(0, 150)}`);
            // Fail-fast on 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden) without looping through remaining models
            if (response.status === 400 || response.status === 401 || response.status === 403) {
              throw new HttpError(response.status === 400 ? 400 : 502, `AI service provider rejected request: ${errText.slice(0, 100)}`);
            }
            if (response.status === 404 || response.status === 503) {
              throw new Error(`Model ${cleanModel} unavailable (status ${response.status})`);
            }
            throw new HttpError(response.status === 429 ? 429 : 502, 'AI service provider error');
          }

          const data = await response.json();
          const candidate = data?.candidates?.[0];
          const parts = candidate?.content?.parts || [];

          let hasFunctionCall = false;
          const functionCalls = [];

          for (const p of parts) {
            if (p.text) finalReply += p.text;
            if (p.functionCall) {
              hasFunctionCall = true;
              functionCalls.push(p.functionCall);
            }
          }

          if (!hasFunctionCall || functionCalls.length === 0) {
            break; // Finished: model generated text without needing further tools
          }

          // Execute tool call(s) and provide function response back to Gemini for final conversational synthesis
          const functionResponseParts = [];

          for (const fc of functionCalls) {
            const toolResult = await executeAssistantTool(user, tenant, fc.name, fc.args || {}, authorizedFeatures);

            if (toolResult.action) {
              collectedActions.push(toolResult.action);
            }
            if (toolResult.data) {
              collectedData = { ...(collectedData || {}), ...toolResult.data };
            }

            if (toolResult.data?.proposalReady) {
              conversationState.awaitingConfirmation = true;
              conversationState.pendingAction = {
                id: toolResult.data.actionId,
                actionType: toolResult.data.actionType,
                confirmationToken: toolResult.data.confirmationToken,
                summary: toolResult.data.summary,
              };
              conversationState.interactionType = 'confirmation';
            }
            if (fc.name === 'confirm_pending_action' || fc.name === 'cancel_pending_action') {
              conversationState.awaitingConfirmation = false;
              conversationState.pendingAction = null;
              conversationState.interactionType = 'answering';
            }

            functionResponseParts.push({
              functionResponse: {
                name: fc.name,
                response: {
                  output: toolResult.data || { success: toolResult.success, error: toolResult.error },
                },
              },
            });
          }

          // Retain complete model content (including cryptographic thoughtSignature and call IDs)
          // and push tool execution results with role: 'user' per modern Google Gemini API specification
          contents.push(candidate.content);
          contents.push({ role: 'user', parts: functionResponseParts });
        }

        // If the model called a navigation tool and provided no text, produce a conversational confirmation
        if (!finalReply.trim()) {
          if (conversationState?.activeIntent === 'amenity_booking' && !conversationState?.collectedDetails?.amenityName) {
      const catalogRes = await executeAssistantTool(user, tenant, 'get_amenities_catalog', {}, authorizedFeatures);
      const amenities = (catalogRes?.data?.amenities || []).map(a => a.name);
      conversationState.presentedAmenities = amenities;

      let reply = '';
      if (amenities.length > 0) {
        reply = `Here are the available community amenities you can book:\n` +
          amenities.map((name, i) => `${i + 1}. ${name}`).join('\n') +
          `\n\nWhich amenity would you like to book` +
          (conversationState.collectedDetails?.headcount ? ` for ${conversationState.collectedDetails.headcount === 2 ? 'two people' : `${conversationState.collectedDetails.headcount} members`}` : '') +
          (conversationState.collectedDetails?.dateLabel ? ` ${conversationState.collectedDetails.dateLabel.toLowerCase()}` : '') +
          (conversationState.collectedDetails?.timePreference ? ` in the ${conversationState.collectedDetails.timePreference}` : '') +
          `?`;
      } else {
        reply = 'There are currently no active amenities created in your community. Please contact your community administrator to set up amenities.';
        conversationState.presentedAmenities = [];
      }

      conversationState.nextQuestion = reply;

      return {
        message: reply,
        reply,
        actions: catalogRes?.action ? [catalogRes.action] : [],
        toolCall: catalogRes?.action ? { targetRoute: catalogRes.action.route, targetName: catalogRes.action.targetName } : null,
        data: {
          interactionType: 'clarification',
          workflow: conversationState.workflow,
          missingFields: conversationState.missingFields,
          collectedDetails: conversationState.collectedDetails,
          amenities,
        },
        status: 'clarification',
        conversationState: sanitizeConversationState(conversationState),
        requestId: correlationId,
      };
    }

    if (conversationState?.interactionType === 'clarification' && conversationState.nextQuestion) {
            finalReply = conversationState.nextQuestion;
          } else if (collectedActions.length > 0) {
            const firstAction = collectedActions[0];
            if (firstAction.type === 'confirmation') {
              finalReply = `I've prepared ${firstAction.title || 'the proposal'} for you. Please review the details below and tap Confirm to proceed.`;
            } else if (firstAction.type === 'action_result') {
              finalReply = firstAction.message || 'The action was executed successfully.';
            } else {
              finalReply = `I found ${firstAction.targetName || 'the requested section'} for you. Tap the card below to open it.`;
            }
          } else {
            finalReply = 'How else can I assist you with your community today?';
          }
        }

        // Map primary tool call for backward compatibility with previous clients/tests
        const primaryTool = collectedActions.length > 0
          ? {
              name: 'navigate_to_screen',
              args: { screenId: collectedActions[0].screenId },
              targetName: collectedActions[0].targetName,
              targetRoute: collectedActions[0].route,
              category: collectedActions[0].category,
            }
          : null;

        return {
          message: finalReply.trim(),
          reply: finalReply.trim(), // backward compatibility
          actions: collectedActions,
          toolCall: primaryTool, // backward compatibility
          data: {
            ...(collectedData || {}),
            ...(conversationState?.options ? { options: conversationState.options } : {}),
            ...(conversationState?.interactiveConfig ? { interactiveConfig: conversationState.interactiveConfig } : {}),
            ...(conversationState?.selectedOptions ? { selectedOptions: conversationState.selectedOptions } : {}),
            interactionType: conversationState?.interactionType,
          },
          options: conversationState?.options,
          interactiveConfig: conversationState?.interactiveConfig,
          status: conversationState?.interactionType === 'clarification' ? 'clarification' : 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          logger.warn(`[AIAssistant] Chat model ${cleanModel} request timed out`);
          continue;
        }
      }
    }

    // If a confirmed or cancelled pending action was already executed deterministically before the LLM call,
    // return its verified execution result directly rather than falling back to conversational re-evaluation
    if (preExecutedActionResult) {
      const summaryMsg =
        preExecutedActionResult.data?.message ||
        preExecutedActionResult.message ||
        (preExecutedActionResult.cancelled
          ? 'The pending request was cancelled. No changes were made.'
          : 'Action executed successfully.');
      return {
        message: summaryMsg,
        reply: summaryMsg,
        actions: initialActions,
        toolCall: initialActions.length > 0 ? { targetRoute: initialActions[0].route, targetName: initialActions[0].targetName } : null,
        data: initialData || preExecutedActionResult.data,
        status: preExecutedActionResult.success ? 'success' : 'clarification',
        conversationState: sanitizeConversationState(conversationState),
        requestId: correlationId,
      };
    }

    // If upstream cloud LLM failed (e.g. 403 quota/billing, 404 deprecated models, timeout, or network down),
    // execute deterministic domain tools and synthesize a conversational response so resident chat never fails with an error bubble.
    logger.info(`[AIAssistant] Upstream cloud model generation unavailable (${lastError?.message || 'all models exhausted'}); invoking deterministic domain fallback engine.`);
    return await this.generateDeterministicFallbackResponse(
      user,
      tenant,
      message,
      conversationState,
      authorizedFeatures,
      correlationId
    );
  }

  /**
   * Streams a text response for the unified assistant using Server-Sent Events (SSE).
   *
   * @param {object} user - Authenticated user context
   * @param {object} tenant - Verified tenant context
   * @param {object} params - { message, history, context }
   * @param {object} res - Express response stream
   * @param {AbortSignal} abortSignal - Client request abort signal
   */
  async streamChatResponse(user, tenant, { message, history = [], context = {} }, res, abortSignal) {
    const correlationId = context?.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const runtime = await this.resolveRuntimeConfig();

    const authorizedFeatures = this.filterAuthorizedFeatures(user, tenant);
    const featureDescriptions = authorizedFeatures
      .map((f) => `- ${f.name} (ID: "${f.id}"): ${f.description || f.name}`)
      .join('\n');

    const referenceDate = context?.referenceDate ? new Date(context.referenceDate) : new Date();

    const compoundParts = splitCompoundQuery(message);
    if (compoundParts && compoundParts.length >= 2) {
      logger.info(`[AIAssistant] Compound multi-intent detected (${compoundParts.length} sub-intents): ${compoundParts.map((p) => p.intent).join(', ')}`);
      return await this.processMultiIntentCompoundRequest(
        user,
        tenant,
        compoundParts,
        authorizedFeatures,
        correlationId
      );
    }

    const conversationState = analyzeConversationTurn(
      message,
      context?.conversationState,
      history,
      referenceDate,
      { user, tenant, authorizedFeatures }
    );

    if (conversationState.interactionType === 'permission_denied') {
      const denialMessage = conversationState.denialReason || "You don't have permission to perform this action.";
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write('data: ' + JSON.stringify({
        text: denialMessage,
        isDone: true,
        actions: [],
        data: { permissionDenied: true, authorized: false, permittedAlternatives: conversationState.permittedAlternatives || [] },
        conversationState: sanitizeConversationState(conversationState),
      }) + '\n\n');
      res.end();
      return;
    }

    if (runtime.killSwitched || config.aiAssistant?.enabled === false) {
      res.status(503).json({ success: false, message: 'AI Assistant is currently disabled.' });
      return;
    }
    if (!runtime.enabled || !runtime.apiKey) {
      logger.info('[AIAssistant] Upstream cloud API key not configured for stream; using deterministic domain fallback engine.');
      const fallback = await this.generateDeterministicFallbackResponse(user, tenant, message, conversationState, authorizedFeatures, correlationId);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write('data: ' + JSON.stringify({ text: fallback.message, isDone: true, actions: fallback.actions, data: fallback.data, conversationState: fallback.conversationState }) + '\n\n');
      res.end();
      return;
    }

    const contextGuidance = buildPromptContextInstruction(conversationState, referenceDate);

    const systemInstruction = {
      parts: [
        {
          text: `You are NAHOM AI Assistant, the intelligent assistant for NAHOM gated community residents.
Your role is to answer questions directly, retrieve community and financial information using the available tools, help residents navigate the application, prepare and execute verified actions, and provide helpful guidance.

Behavior Guidelines:
1. Natural Language Answers: ALWAYS answer normal questions directly in plain, friendly, conversational text. NEVER output an empty response.
2. Real Data Questions: When a user asks about community expenses, maintenance collections, personal expenses, unpaid dues, amenities, bookings, complaints, or visitors, invoke the appropriate tool to retrieve live data. Then clearly explain the answer with relevant currency (₹) and period (e.g. October 2026). For community expenses, present the total community expenses incurred, total collections, net surplus/deficit, top expense categories, and list any recent community expense items with their title, amount, category, and date. If all-time total expenses differ from the current period, mention both transparently.
3. Tool Output Synthesis: When a tool returns data, synthesize the results into a helpful conversational response explaining specific details (e.g. amounts, invoice numbers, statuses, available slot times, visitor names, entry times, pass short keys, booking IDs). Do NOT leave the answer blank or tell the user to only click a button.
4. Navigation & Actions: When a user asks to view or open a feature, invoke 'navigate_to_screen'. Explain what will be opened alongside the action card.
5. Action Workflows (Two-Phase Execution):
   - You can prepare and execute verified application actions:
     a) Visitor Pass Creation: invoke 'prepare_visitor_pass'.
     b) Visitor Pass Revocation: invoke 'prepare_visitor_pass_revocation'.
     c) Amenity Booking Creation: invoke 'prepare_amenity_booking'.
     d) Amenity Booking Cancellation: invoke 'prepare_amenity_booking_cancellation'.
     e) Personal Expense Creation: invoke 'prepare_personal_expense'.
     f) Complaint Ticket Creation: invoke 'prepare_complaint'.
     g) Maintenance Request Creation: invoke 'prepare_maintenance_request'.
     h) Complaint / Maintenance Ticket Cancellation: invoke 'prepare_complaint_cancellation'.
     i) Ticket Escalation: invoke 'escalate_complaint'.
     j) Ticket Reopening: invoke 'reopen_complaint'.
     k) Ticket Comment / Remark: invoke 'add_complaint_comment'.
     l) Critical Notice Acknowledgement: invoke 'prepare_notice_acknowledgement'.
     m) Community Poll Voting: invoke 'prepare_poll_vote'.
     n) Amenity Facility Creation (Admin / Facility Manager): invoke 'prepare_amenity_creation'.
     o) Maintenance Assessment Creation (Admin / Billing Manager): invoke 'prepare_assessment_creation'.
     p) Community Poll Creation (Admin): invoke 'prepare_poll_creation'.
     q) Notice Board Publication (Admin): invoke 'prepare_notice_creation'.
   - NEVER claim that an action has been completed, created, booked, or revoked until the backend confirmation tool ('confirm_pending_action') has actually succeeded and returned a real database record or reference code.
   - When preparing an action, explain the proposal clearly (dates, amounts, issue details, fees, visitor name, facility specs) and ask the user to confirm via the interactive card or by replying 'Confirm'.
   - If required parameters are missing (e.g. visitor name, date, amenity name, slot time, expense amount, complaint title), ask clear follow-up questions to collect them.
   - When an action is confirmed and executed, report the real resulting ID (e.g. Pass code, Short key, Booking ID, Transaction ID, Facility ID, or Ticket number) from the execution response.
6. Financial Mutations: For bill and invoice payments, direct the user to the dedicated billing/wallet screen to review and pay securely. For creating community maintenance assessments (bulk billing runs for residents), invoke 'prepare_assessment_creation' to present an HMAC confirmation proposal card. Do not claim payment happened on the AI chat thread.
7. Distinguishing Zero/Empty Data vs. Service Failures:
   - If a tool returns zero dues (totalOutstandingDues: 0), warmly confirm to the resident that they have no pending dues and their account is fully settled.
   - If a tool reports an error (success: false or service unavailable), NEVER tell the user they have zero dues or zero bookings; inform them honestly that records could not be retrieved and suggest checking the respective application section.
   - If get_my_bookings returns count: 0, inform the resident that they have no active or upcoming bookings for that specified period.
   - If get_my_visitor_passes returns count: 0, inform the resident that they have no active or upcoming visitor passes.
   - If get_visitor_history returns count: 0, inform the resident that no visitor entry logs were found.
   - If get_pending_gate_approvals returns count: 0, inform the resident that there are no pending visitor approvals at the gate.
   - If get_my_complaints returns count: 0, inform the resident that there are no matching complaints found.
8. Multi-turn Follow-ups & Relative Dates: Consecutive messages often refer to the same topic. When the user asks follow-up questions referencing previous context (such as 'What about next week?', 'Any bookings tomorrow?'), interpret them in the context of the active topic and invoke the corresponding tool with the updated date parameters.
9. Clarification vs. Confirmation (All-in-One Humor & Checklist Format):
   - Clarification: If required parameters are missing to complete a request (such as booking an amenity without specifying which amenity, what date, or what time slot; or visitor pass without name, date, or time), NEVER interrogate the user with one attribute per turn across multiple turns. Instead, ask for ALL missing details together in a single, witty, comedic or interesting prompt with emojis and a bulleted checklist, letting the user know they can reply with everything in one single sentence (e.g. "Tennis tomorrow at 6 PM").
   - Confirmation: Once all details are gathered, present the proposal clearly with date and slot time and prompt the user to confirm before directing them to confirm.
10. Visitor Management Guidance:
   - For visitor logs ("Who visited today?", "Show visitor logs"): invoke 'get_visitor_history' and summarize entries.
   - For active passes ("Show my visitor passes", "Do I have any active passes?"): invoke 'get_my_visitor_passes' and summarize the passes.
   - For gate approvals ("Who is at the gate?", "Pending approvals"): invoke 'get_pending_gate_approvals'.
   - For creating or issuing a new pass ("Create a visitor pass for Rahul", "Invite a guest"): invoke 'prepare_visitor_pass' after having the visitor's name and visit date.
   - For revoking a pass ("Cancel Rahul's pass", "Revoke visitor pass"): invoke 'prepare_visitor_pass_revocation' with passId or visitorName.
11. Amenity Management Guidance:
   - For booking ("Book badminton court tomorrow 6 PM to 7 PM"): invoke 'prepare_amenity_booking'. If resident wallet balance is insufficient, clearly inform them and guide them to Click to Pay Online (Google Pay, PhonePe, UPI, Card).
   - For cancellation ("Cancel my badminton booking"): invoke 'prepare_amenity_booking_cancellation'.
   - For creating or adding new amenities in Amenity Master ("Create a basketball court with 500 per slot for 10 members", "Add new amenity tennis court in amenity master"): invoke 'prepare_amenity_creation'. Extract name, rate/price per slot, capacity, and slot duration, and prompt for confirmation via the interactive card.
12. Personal Expense Management Guidance:
   - For adding/logging expenses ("Spent ₹450 on groceries", "Add expense ₹250 for milk"): invoke 'prepare_personal_expense'. Require amount, infer or use category, date (defaults today), payment method (defaults UPI). Always prompt for confirmation.
   - For expense queries ("How much did I spend this month?", "Show my grocery expenses", "What is my remaining budget?"): invoke 'get_personal_expense_summary'. Report personal income, expenses, net balance, category breakdown, budget utilization, and recent transactions.
   - For receipt parsing / payment proof: invoke 'preview_receipt_ocr'.
13. Complaint & Maintenance Helpdesk Guidance:
   - For physical breakdowns, repairs, and technician visits (plumber, electrician, AC, carpenter, lift repairs): invoke 'prepare_maintenance_request'. Ask for preferred visit date/time if not provided. Always prompt for confirmation.
   - For civic grievances, disturbances, housekeeping, noise, security issues: invoke 'prepare_complaint'. Always prompt for confirmation.
   - For tracking complaint status ("Status of complaint CMP-2026-000001", "My open complaints"): invoke 'get_my_complaints'. Report ticket number, issue, category, priority, status, assigned technician, and SLA resolution target.
   - For cancelling complaints ("Cancel complaint CMP-2026-000001"): invoke 'prepare_complaint_cancellation'. Complaints can only be cancelled before assignment.
   - For escalating delayed or unresolved complaints: invoke 'escalate_complaint'. Always prompt for confirmation.
   - For reopening closed tickets where the issue persists: invoke 'reopen_complaint'. Always prompt for confirmation.
   - For adding remarks or updates to an existing ticket: invoke 'add_complaint_comment'.
14. Community Polls Guidance:
   - For voting on active polls: invoke 'prepare_poll_vote'.
   - For creating or launching a new poll (Admin: "Create a poll on pool timings with options 6 AM, 7 AM, 8 AM", "Start a community poll"): invoke 'prepare_poll_creation'. Extract question and options, and prompt for confirmation.
15. Notice Board Guidance:
   - For viewing notices: invoke 'get_community_notices'.
   - For publishing an announcement or notice (Admin: "Post a notice on water shutdown tomorrow at 10 AM", "Publish notice for AGM"): invoke 'prepare_notice_creation'. Extract title, description, priority, and category, and prompt for confirmation.
16. Speak politely, accurately, and concisely. Keep answers informative yet easy to read on mobile.

${contextGuidance}

Authorized features:
${featureDescriptions}`,
        },
      ],
    };

    const tools = [{ functionDeclarations: filterAuthorizedToolDeclarations(user, tenant) }];

    const contents = [];
    const recentHistory = Array.isArray(history) ? history.slice(-20) : [];
    for (const h of recentHistory) {
      if (!h.text || typeof h.text !== 'string') continue;
      const role = h.role === 'model' || h.role === 'assistant' ? 'model' : 'user';
      contents.push({ role, parts: [{ text: h.text.slice(0, 2000) }] });
    }
    contents.push({ role: 'user', parts: [{ text: String(message).slice(0, 2000) }] });

    // Pre-execution of deterministic confirmed or cancelled pending action
    let preExecutedActionResult = null;
    const initialActions = [];
    let initialData = null;

    if (conversationState.actionConfirmed && conversationState.pendingAction?.id) {
      const result = await executeAssistantTool(
        user,
        tenant,
        'confirm_pending_action',
        {
          actionId: conversationState.pendingAction.id,
          confirmationToken: conversationState.pendingAction.confirmationToken,
        },
        authorizedFeatures
      );
      preExecutedActionResult = result;
      if (result.action) initialActions.push(result.action);
      if (result.data) initialData = { ...result.data };
      conversationState.awaitingConfirmation = false;
      conversationState.pendingAction = null;
      conversationState.actionConfirmed = false;
      conversationState.workflow = 'idle';
      conversationState.interactionType = result.success ? 'answering' : 'clarification';
    } else if (conversationState.actionCancelled && conversationState.pendingAction?.id) {
      const result = await executeAssistantTool(
        user,
        tenant,
        'cancel_pending_action',
        {
          actionId: conversationState.pendingAction.id,
        },
        authorizedFeatures
      );
      preExecutedActionResult = result;
      if (result.action) initialActions.push(result.action);
      if (result.data) initialData = { ...result.data };
      conversationState.awaitingConfirmation = false;
      conversationState.pendingAction = null;
      conversationState.actionCancelled = false;
      conversationState.workflow = 'idle';
      conversationState.interactionType = 'answering';
    }

    if (preExecutedActionResult) {
      contents.push({
        role: 'user',
        parts: [
          {
            text: preExecutedActionResult.success
              ? `[System Note: The resident confirmed this action and the backend executed it with real verified success. Result data: ${JSON.stringify(preExecutedActionResult.data)}. Summarize the outcome warmly and clearly to the resident, referencing confirmed details and any issued reference IDs or short keys.]`
              : `[System Note: The resident attempted to confirm or cancel the action, but execution failed with error: "${preExecutedActionResult.error}". Explain this error clearly and do not claim that the operation succeeded.]`,
          },
        ],
      });
    }

    const modelsToTry = [
      runtime.chatModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
    ].filter(Boolean).filter((m, idx, arr) => arr.indexOf(m) === idx);

    const activeFetch = injectedFetch || globalThis.fetch;

    for (const model of modelsToTry) {
      const cleanModel = model.replace(/^models\//, '');
      const nonStreamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${runtime.apiKey}`;
      const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:streamGenerateContent?alt=sse&key=${runtime.apiKey}`;

      try {
        const collectedActions = [...initialActions];
        let collectedData = initialData ? { ...initialData } : null;

        // Step 1: Pre-flight check for tool calls using generateContent
        const preflightController = new AbortController();
        const preflightTimer = setTimeout(() => preflightController.abort(), 12000);
        if (abortSignal) abortSignal.addEventListener('abort', () => preflightController.abort());

        const preflightRes = await activeFetch(nonStreamEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemInstruction, contents, tools }),
          signal: preflightController.signal,
        });
        clearTimeout(preflightTimer);

        if (!preflightRes.ok) {
          if (preflightRes.status === 404 || preflightRes.status === 503) continue;
          res.status(preflightRes.status === 429 ? 429 : 502).json({
            success: false,
            message: 'AI service provider error',
          });
          return;
        }

        const preflightJson = await preflightRes.json();
        const candidate = preflightJson?.candidates?.[0];
        const candidateParts = candidate?.content?.parts || [];
        const functionCalls = candidateParts.filter((p) => Boolean(p.functionCall));

        if (functionCalls.length > 0) {
          const functionResponseParts = [];

          for (const fcPart of functionCalls) {
            const fc = fcPart.functionCall;
            const toolResult = await executeAssistantTool(user, tenant, fc.name, fc.args || {}, authorizedFeatures);

            if (toolResult.action) collectedActions.push(toolResult.action);
            if (toolResult.data) collectedData = { ...(collectedData || {}), ...toolResult.data };

            if (toolResult.data?.proposalReady) {
              conversationState.awaitingConfirmation = true;
              conversationState.pendingAction = {
                id: toolResult.data.actionId,
                actionType: toolResult.data.actionType,
                confirmationToken: toolResult.data.confirmationToken,
                summary: toolResult.data.summary,
              };
              conversationState.interactionType = 'confirmation';
            }
            if (fc.name === 'confirm_pending_action' || fc.name === 'cancel_pending_action') {
              conversationState.awaitingConfirmation = false;
              conversationState.pendingAction = null;
              conversationState.interactionType = 'answering';
            }

            functionResponseParts.push({
              functionResponse: {
                name: fc.name,
                response: {
                  output: toolResult.data || { success: toolResult.success, error: toolResult.error },
                },
              },
            });
          }

          contents.push(candidate.content);
          contents.push({ role: 'user', parts: functionResponseParts });
        }

        // Step 2: Stream final conversational answer
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        if (abortSignal) abortSignal.addEventListener('abort', () => controller.abort());

        const response = await activeFetch(streamEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemInstruction, contents, tools }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404 || response.status === 503) continue;
          res.status(response.status === 429 ? 429 : 502).json({
            success: false,
            message: 'AI service provider error during streaming',
          });
          return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullAnswer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const parts = parsed?.candidates?.[0]?.content?.parts || [];
              for (const p of parts) {
                if (p.text) {
                  fullAnswer += p.text;
                  res.write(`data: ${JSON.stringify({ type: 'chunk', text: p.text })}\n\n`);
                }
              }
            } catch {}
          }
        }

        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            message: fullAnswer.trim(),
            actions: collectedActions,
            data: collectedData,
            status: conversationState?.interactionType === 'clarification' ? 'clarification' : 'success',
            conversationState: sanitizeConversationState(conversationState),
            requestId: correlationId,
          })}\n\n`
        );
        res.end();
        return;
      } catch (err) {
        if (abortSignal?.aborted) {
          res.end();
          return;
        }
        logger.warn(`[AIAssistant] Stream model ${cleanModel} error: ${err.message}`);
      }
    }

    if (!res.headersSent) {
      res.status(502).json({ success: false, message: 'Failed to stream response from AI provider.' });
    } else {
      res.end();
    }
  }

  /**
   * Securely executes an assistant tool directly for voice socket or REST clients.
   *
   * @param {object} user - Authenticated user context
   * @param {object} tenant - Verified tenant context
   * @param {string} toolName - Declared tool name
   * @param {object} toolArgs - Tool arguments
   * @returns {Promise<object>}
   */

  /**
   * Orchestrates processing of compound multi-intent user requests.
   * Splits the utterance into independent sub-queries, executes each against server-side RBAC,
   * gathers tool results, and returns a unified multi-section markdown response.
   */
  async processMultiIntentCompoundRequest(user, tenant, subQueries, authorizedFeatures, correlationId) {
    const results = [];
    const collectedActions = [];
    const combinedData = {};

    for (let i = 0; i < subQueries.length; i++) {
      const { query, intent } = subQueries[i];
      const turnState = analyzeConversationTurn(
        query,
        null,
        [],
        new Date(),
        { user, tenant, authorizedFeatures }
      );

      if (turnState.interactionType === 'permission_denied') {
        results.push({
          operationId: intent,
          title: `Request ${i + 1}`,
          content: turnState.denialReason || "You don't have permission to perform this operation.",
          authorized: false,
          missingFields: turnState.missingFields || [],
          resultCategory: 'permission_denied',
          actionState: 'not_started',
        });
        continue;
      }

      const subRes = await this.generateDeterministicFallbackResponse(
        user,
        tenant,
        query,
        turnState,
        authorizedFeatures,
        `${correlationId}_sub${i + 1}`
      );

      if (subRes) {
        if (Array.isArray(subRes.actions)) {
          collectedActions.push(...subRes.actions);
        }
        if (subRes.data) {
          combinedData[`intent_${intent}`] = subRes.data;
        }

        let sectionTitle = `Part ${i + 1}`;
        if (intent === 'resident_dues') sectionTitle = 'Invoices & Dues';
        else if (intent === 'community_finance') sectionTitle = 'Community Finance';
        else if (intent === 'amenity_availability') sectionTitle = 'Amenity Availability';
        else if (intent === 'amenity_inquiry') sectionTitle = 'Amenity Catalog';
        else if (intent === 'wallet_balance') sectionTitle = 'Digital Wallet Balance';
        else if (intent === 'wallet_transactions') sectionTitle = 'Wallet Transactions';
        else if (intent === 'notifications') sectionTitle = 'In-App Notifications';
        else if (intent === 'notifications_mark_read') sectionTitle = 'Notifications Update';
        else if (intent === 'emergency_contacts') sectionTitle = 'Emergency Contacts';
        else if (intent === 'complaints_helpdesk') sectionTitle = 'Helpdesk Complaints';
        else if (intent === 'visitor_management') sectionTitle = 'Visitor Passes';
        else if (intent === 'issue_reports_list') sectionTitle = 'Issue Reports';
        else if (intent === 'ai_feedback') sectionTitle = 'Feedback';

        results.push({
          operationId: intent,
          title: sectionTitle,
          content: subRes.message || subRes.reply || 'Request processed.',
          authorized: true,
          missingFields: subRes.conversationState?.missingFields || [],
          resultCategory: subRes.status || 'success',
          actionState: subRes.conversationState?.awaitingConfirmation ? 'awaiting_confirmation' : 'completed',
        });
      }
    }

    const reply = `Here is the information you requested:\n\n` +
      results.map((r, idx) => `### ${idx + 1}. ${r.title}\n${r.content}`).join('\n\n');

    return {
      message: reply,
      reply,
      actions: collectedActions,
      toolCall: collectedActions.length > 0 ? { targetRoute: collectedActions[0].route, targetName: collectedActions[0].targetName } : null,
      data: { isCompound: true, ...combinedData },
      operations: results.map(({ operationId, authorized, missingFields, resultCategory, actionState }) => ({
        operationId, authorized, missingFields, resultCategory, actionState,
      })),
      status: 'success',
      conversationState: {
        activeIntent: 'multi_intent',
        workflow: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      },
      requestId: correlationId,
    };
  }

  /**
   * Deterministic local fallback generator.
   * Invoked seamlessly when upstream cloud LLM (e.g. Gemini) is unavailable, quota-restricted (403),
   * model-deprecated (404), or network timed out.
   */
  async generateDeterministicFallbackResponse(user, tenant, message, conversationState, authorizedFeatures, correlationId) {
    const text = (message || '').trim().toLowerCase();

    // 1. Clarification question if required details are missing
    if (conversationState?.interactionType === 'clarification' && conversationState.nextQuestion) {
      return {
        message: conversationState.nextQuestion,
        reply: conversationState.nextQuestion,
        actions: [],
        toolCall: null,
        data: {
          ...(conversationState.options ? { options: conversationState.options } : {}),
          ...(conversationState.interactiveConfig ? { interactiveConfig: conversationState.interactiveConfig } : {}),
          ...(conversationState.selectedOptions ? { selectedOptions: conversationState.selectedOptions } : {}),
          interactionType: 'clarification',
        },
        options: conversationState.options,
        interactiveConfig: conversationState.interactiveConfig,
        status: 'clarification',
        conversationState: sanitizeConversationState(conversationState),
        requestId: correlationId,
      };
    }

    // 2. Pending Action Confirmation or Cancellation
    if (conversationState?.actionConfirmed && conversationState.pendingAction?.id) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'confirm_pending_action',
        {
          actionId: conversationState.pendingAction.id,
          confirmationToken: conversationState.pendingAction.confirmationToken,
        },
        authorizedFeatures
      );
      const actionData = toolRes?.data || {};
      const summaryMsg = actionData.message || 'Action executed successfully.';
      return {
        message: summaryMsg,
        reply: summaryMsg,
        actions: toolRes?.action ? [toolRes.action] : [],
        toolCall: toolRes?.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
        data: actionData,
        status: 'success',
        conversationState: sanitizeConversationState(conversationState),
        requestId: correlationId,
      };
    }

    if (conversationState?.actionCancelled && conversationState.pendingAction?.id) {
      await executeAssistantTool(
        user,
        tenant,
        'cancel_pending_action',
        { actionId: conversationState.pendingAction.id },
        authorizedFeatures
      );
      return {
        message: 'I have cancelled that request for you. Is there anything else I can help with?',
        reply: 'I have cancelled that request for you. Is there anything else I can help with?',
        actions: [],
        toolCall: null,
        data: null,
        status: 'success',
        conversationState: sanitizeConversationState(conversationState),
        requestId: correlationId,
      };
    }

    // 3. Action Proposal ready
    if (conversationState?.awaitingConfirmation && conversationState.pendingAction) {
      const pa = conversationState.pendingAction;
      const prompt = `I've prepared ${pa.summary || 'your request'} for you. Please review the details and tap Confirm to proceed.`;
      return {
        message: prompt,
        reply: prompt,
        actions: [
          {
            type: 'confirmation',
            actionId: pa.id,
            actionType: pa.actionType,
            confirmationToken: pa.confirmationToken,
            title: pa.summary || 'Confirm Action',
            route: pa.route || '',
          },
        ],
        toolCall: null,
        data: {
          proposalReady: true,
          ...pa,
          ...(conversationState.options ? { options: conversationState.options } : {}),
          ...(conversationState.interactiveConfig ? { interactiveConfig: conversationState.interactiveConfig } : {}),
        },
        options: conversationState.options,
        interactiveConfig: conversationState.interactiveConfig,
        status: 'confirmation',
        conversationState: sanitizeConversationState(conversationState),
        requestId: correlationId,
      };
    }

    // 3b. Ready for Action Proposal Preparation (Deterministic Fallback Execution)
    if (conversationState?.workflow === 'amenity_create_ready' && conversationState?.collectedDetails?.name) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_amenity_creation',
        conversationState.collectedDetails,
        authorizedFeatures
      );
      if (toolRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: toolRes.data.actionId,
          actionType: toolRes.data.actionType,
          confirmationToken: toolRes.data.confirmationToken,
          summary: toolRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: toolRes.data.message || `I have prepared the proposal to create "${conversationState.collectedDetails.name}". Please confirm to add it to Amenity Master.`,
          reply: toolRes.data.message || `I have prepared the proposal to create "${conversationState.collectedDetails.name}". Please confirm to add it to Amenity Master.`,
          actions: toolRes.action ? [toolRes.action] : [],
          toolCall: toolRes.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
          data: toolRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    if (conversationState?.workflow === 'amenity_booking_ready' && conversationState?.collectedDetails?.amenityName) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_amenity_booking',
        conversationState.collectedDetails,
        authorizedFeatures
      );
      if (toolRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: toolRes.data.actionId,
          actionType: toolRes.data.actionType,
          confirmationToken: toolRes.data.confirmationToken,
          summary: toolRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: toolRes.data.message || `I have prepared your booking for ${conversationState.collectedDetails.amenityName}. Please confirm to reserve.`,
          reply: toolRes.data.message || `I have prepared your booking for ${conversationState.collectedDetails.amenityName}. Please confirm to reserve.`,
          actions: toolRes.action ? [toolRes.action] : [],
          toolCall: toolRes.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
          data: toolRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      } else if (toolRes?.slotUnavailable || !toolRes?.success) {
        // Scenario F: Slot unavailable - offer alternative slots without dropping state
        conversationState.workflow = 'amenity_booking_intake';
        conversationState.missingFields = ['slotTime'];
        conversationState.interactionType = 'clarification';
        conversationState.awaitingConfirmation = false;
        const msg = toolRes?.error || `The requested slot is unavailable for ${conversationState.collectedDetails.amenityName}. Please select an alternative time.`;
        conversationState.nextQuestion = msg;
        return {
          message: msg,
          reply: msg,
          actions: [],
          toolCall: null,
          data: {
            interactionType: 'clarification',
            workflow: conversationState.workflow,
            missingFields: conversationState.missingFields,
            collectedDetails: conversationState.collectedDetails,
            availableSlots: toolRes?.availableSlots || [],
          },
          status: 'clarification',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    if (
      conversationState?.workflow === 'amenity_cancel_ready' ||
      (conversationState?.activeIntent === 'amenity_cancellation' && !conversationState?.awaitingConfirmation)
    ) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_amenity_booking_cancellation',
        conversationState.collectedDetails || {},
        authorizedFeatures
      );
      if (toolRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: toolRes.data.actionId,
          actionType: toolRes.data.actionType,
          confirmationToken: toolRes.data.confirmationToken,
          summary: toolRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: toolRes.data.message || `I have prepared the cancellation for your ${conversationState.collectedDetails?.amenityName || 'amenity'} booking. Please confirm to cancel.`,
          reply: toolRes.data.message || `I have prepared the cancellation for your ${conversationState.collectedDetails?.amenityName || 'amenity'} booking. Please confirm to cancel.`,
          actions: toolRes.action ? [toolRes.action] : [],
          toolCall: toolRes.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
          data: toolRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      } else if (!toolRes?.success) {
        const errorMsg = toolRes?.error || 'Could not find an active or confirmed booking to cancel.';
        conversationState.interactionType = 'answering';
        conversationState.awaitingConfirmation = false;
        return {
          message: errorMsg,
          reply: errorMsg,
          actions: [],
          toolCall: null,
          data: { error: errorMsg },
          status: 'answering',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    if (conversationState?.workflow === 'amenity_policy_inquiry') {
      const aName = conversationState.collectedDetails?.amenityName;
      const policyReply = aName
        ? `🏊 **Cancellation & Refund Policy for ${aName}**:\n` +
          `• **Cancellation Window**: Free cancellation allowed up to 2 hours before the scheduled slot.\n` +
          `• **Refund Rules**:\n` +
          `  - Cancellation more than 12 hours before slot: 100% refund of booking fee.\n` +
          `  - Cancellation between 2 and 12 hours before slot: 50% refund of booking fee.\n` +
          `  - Cancellation within 2 hours of slot: Non-refundable (0% refund).\n` +
          `• **Security Deposit**: Refunded 100% in full for all cancellations (facility unused).\n` +
          `• **Refund Destination**: Credited directly to your Digital Wallet upon cancellation.`
        : `🏊 **Amenity Cancellation & Refund Policy**:\n` +
          `• **Cancellation Window**: Free cancellation allowed up to 2 hours before the scheduled slot.\n` +
          `• **Refund Rules**:\n` +
          `  - Cancellation more than 12 hours before slot: 100% refund of booking fee.\n` +
          `  - Cancellation between 2 and 12 hours before slot: 50% refund of booking fee.\n` +
          `  - Cancellation within 2 hours of slot: Non-refundable (0% refund).\n` +
          `• **Security Deposit**: Refunded 100% in full for all cancellations (facility unused).\n` +
          `• **Refund Destination**: Credited directly to your Digital Wallet upon cancellation.`;

      conversationState.interactionType = 'answering';
      conversationState.awaitingConfirmation = false;
      return {
        message: policyReply,
        reply: policyReply,
        actions: [],
        toolCall: null,
        data: { amenityName: aName || 'All Amenities', inquiryType: 'cancellation_policy' },
        status: 'answering',
        conversationState: sanitizeConversationState(conversationState),
        requestId: correlationId,
      };
    }

    if (conversationState?.workflow === 'visitor_pass_ready' && conversationState?.collectedDetails?.visitorName) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_visitor_pass',
        conversationState.collectedDetails,
        authorizedFeatures
      );
      if (toolRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: toolRes.data.actionId,
          actionType: toolRes.data.actionType,
          confirmationToken: toolRes.data.confirmationToken,
          summary: toolRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: toolRes.data.message || `I have prepared a visitor pass for ${conversationState.collectedDetails.visitorName}. Please confirm to generate the pass.`,
          reply: toolRes.data.message || `I have prepared a visitor pass for ${conversationState.collectedDetails.visitorName}. Please confirm to generate the pass.`,
          actions: toolRes.action ? [toolRes.action] : [],
          toolCall: toolRes.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
          data: toolRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    if (conversationState?.workflow === 'complaint_ready' && conversationState?.collectedDetails?.title) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_complaint',
        conversationState.collectedDetails,
        authorizedFeatures
      );
      if (toolRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: toolRes.data.actionId,
          actionType: toolRes.data.actionType,
          confirmationToken: toolRes.data.confirmationToken,
          summary: toolRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: toolRes.data.message || `I have prepared your ticket for "${conversationState.collectedDetails.title}". Please confirm to submit.`,
          reply: toolRes.data.message || `I have prepared your ticket for "${conversationState.collectedDetails.title}". Please confirm to submit.`,
          actions: toolRes.action ? [toolRes.action] : [],
          toolCall: toolRes.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
          data: toolRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    if (conversationState?.workflow === 'maintenance_ready' && conversationState?.collectedDetails?.title) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_maintenance_request',
        conversationState.collectedDetails,
        authorizedFeatures
      );
      if (toolRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: toolRes.data.actionId,
          actionType: toolRes.data.actionType,
          confirmationToken: toolRes.data.confirmationToken,
          summary: toolRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: toolRes.data.message || `I have prepared your maintenance request for "${conversationState.collectedDetails.title}". Please confirm to submit.`,
          reply: toolRes.data.message || `I have prepared your maintenance request for "${conversationState.collectedDetails.title}". Please confirm to submit.`,
          actions: toolRes.action ? [toolRes.action] : [],
          toolCall: toolRes.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
          data: toolRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    if (conversationState?.workflow === 'complaint_escalate_ready' && conversationState?.collectedDetails?.complaintId) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'escalate_complaint',
        conversationState.collectedDetails,
        authorizedFeatures
      );
      if (toolRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: toolRes.data.actionId,
          actionType: toolRes.data.actionType,
          confirmationToken: toolRes.data.confirmationToken,
          summary: toolRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: toolRes.data.message,
          reply: toolRes.data.message,
          actions: toolRes.action ? [toolRes.action] : [],
          toolCall: toolRes.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
          data: toolRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    if (conversationState?.workflow === 'complaint_reopen_ready' && conversationState?.collectedDetails?.complaintId) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'reopen_complaint',
        conversationState.collectedDetails,
        authorizedFeatures
      );
      if (toolRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: toolRes.data.actionId,
          actionType: toolRes.data.actionType,
          confirmationToken: toolRes.data.confirmationToken,
          summary: toolRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: toolRes.data.message,
          reply: toolRes.data.message,
          actions: toolRes.action ? [toolRes.action] : [],
          toolCall: toolRes.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
          data: toolRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    if (conversationState?.workflow === 'expense_ready' && conversationState?.collectedDetails?.amount) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_personal_expense',
        conversationState.collectedDetails,
        authorizedFeatures
      );
      if (toolRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: toolRes.data.actionId,
          actionType: toolRes.data.actionType,
          confirmationToken: toolRes.data.confirmationToken,
          summary: toolRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: toolRes.data.message || `💸 Cha-ching! Expense entry of ₹${conversationState.collectedDetails.amount} for "${conversationState.collectedDetails.categoryName || conversationState.collectedDetails.merchantOrSource}" is ready to log. Please confirm!`,
          reply: toolRes.data.message || `💸 Cha-ching! Expense entry of ₹${conversationState.collectedDetails.amount} for "${conversationState.collectedDetails.categoryName || conversationState.collectedDetails.merchantOrSource}" is ready to log. Please confirm!`,
          actions: toolRes.action ? [toolRes.action] : [],
          toolCall: toolRes.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
          data: toolRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    if (conversationState?.workflow === 'notice_create_ready' && conversationState?.collectedDetails?.title) {
      const toolRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_notice_creation',
        conversationState.collectedDetails,
        authorizedFeatures
      );
      if (toolRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: toolRes.data.actionId,
          actionType: toolRes.data.actionType,
          confirmationToken: toolRes.data.confirmationToken,
          summary: toolRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: toolRes.data.message || `📢 Official community notice "${conversationState.collectedDetails.title}" is ready for publication. Please confirm to broadcast!`,
          reply: toolRes.data.message || `📢 Official community notice "${conversationState.collectedDetails.title}" is ready for publication. Please confirm to broadcast!`,
          actions: toolRes.action ? [toolRes.action] : [],
          toolCall: toolRes.action ? { targetRoute: toolRes.action.route, targetName: toolRes.action.targetName } : null,
          data: toolRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // 4. Intent-specific tool execution and conversational synthesis
    const intent = conversationState?.activeIntent;

    // A. Community Finance / Community Expenses
    if (intent === 'community_finance' || text.includes('community expense') || text.includes('expenses of community') || text.includes('finance')) {
      const period = conversationState?.collectedDetails?.period || 'current_month';
      const summaryRes = await executeAssistantTool(user, tenant, 'get_community_finance_summary', { period }, authorizedFeatures);

      if (summaryRes?.success && summaryRes.data?.authorized) {
        const d = summaryRes.data;
        const expStr = Number(d.totalCommunityExpenses || 0).toLocaleString('en-IN');
        const colStr = Number(d.totalCollections || 0).toLocaleString('en-IN');
        const netStr = Number(d.netSurplusOrDeficit || 0).toLocaleString('en-IN');
        const sign = Number(d.netSurplusOrDeficit || 0) >= 0 ? '+' : '';

        let reply = `Here is the community financial overview for ${d.period || 'the current period'}:\n` +
          `• Total Incurred Community Expenses: ₹${expStr}\n` +
          `• Total Collections: ₹${colStr}\n` +
          `• Net Position: ₹${sign}${netStr}`;

        if (Array.isArray(d.topExpenseCategories) && d.topExpenseCategories.length > 0) {
          reply += '\n\nTop Expense Categories:\n' +
            d.topExpenseCategories.slice(0, 3).map((c) => `• ${c.category}: ₹${Number(c.amount || 0).toLocaleString('en-IN')}`).join('\n');
        }

        if (Array.isArray(d.recentCommunityExpenses) && d.recentCommunityExpenses.length > 0) {
          reply += '\n\nRecent Expenses:\n' +
            d.recentCommunityExpenses.slice(0, 3).map((e) => `• ${e.name} (${e.category}): ₹${Number(e.amount || 0).toLocaleString('en-IN')}`).join('\n');
        }

        reply += '\n\nYou can review all transactions in the Community Finance screen.';

        return {
          message: reply,
          reply,
          actions: summaryRes.action ? [summaryRes.action] : [],
          toolCall: summaryRes.action ? { targetRoute: summaryRes.action.route, targetName: summaryRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      } else if (summaryRes?.data && !summaryRes.data.authorized) {
        return {
          message: summaryRes.data.message || 'Community financial overviews are restricted to community administrators. Would you like to check your personal dues instead?',
          reply: summaryRes.data.message || 'Community financial overviews are restricted to community administrators.',
          actions: summaryRes.action ? [summaryRes.action] : [],
          toolCall: summaryRes.action ? { targetRoute: summaryRes.action.route, targetName: summaryRes.action.targetName } : null,
          data: summaryRes.data,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // B. Resident Dues / Maintenance
    if (intent === 'resident_dues' || text.includes('maintenance') || text.includes('due') || text.includes('bill') || text.includes('invoice') || text.includes('owe')) {
      const duesRes = await executeAssistantTool(
        user,
        tenant,
        'get_resident_dues_and_invoices',
        conversationState?.collectedDetails || {},
        authorizedFeatures
      );
      if (duesRes?.success) {
        const d = duesRes.data;
        const totalDue = Number(d.totalOutstandingDues || 0).toLocaleString('en-IN');
        let reply = '';

        if (conversationState?.collectedDetails?.invoiceNumber) {
          const needle = String(conversationState.collectedDetails.invoiceNumber).toLowerCase();
          const targetInv = (d.unpaidInvoices || []).concat(d.verifiedRecentPayments || []).find(
            inv => (inv.invoiceNumber || '').toLowerCase().includes(needle)
          ) || d.targetInvoice;

          if (targetInv) {
            reply = `Here are the details for invoice ${targetInv.invoiceNumber}:\n` +
              `• Billing Period: ${targetInv.billingPeriod || 'Maintenance'}\n` +
              `• Total Amount: ₹${Number(targetInv.totalDue || targetInv.outstandingAmount || targetInv.paidAmount || 0).toLocaleString('en-IN')}\n` +
              `• Outstanding: ₹${Number(targetInv.outstandingAmount || 0).toLocaleString('en-IN')}\n` +
              `• Due Date: ${targetInv.dueDate || 'Immediate'}\n` +
              `• Status: ${targetInv.status || 'Active'}`;
            if (conversationState.collectedDetails.action === 'download') {
              reply += `\n\nTap below to download or view the PDF receipt:`;
            }
          } else {
            reply = `I could not find an invoice matching "${conversationState.collectedDetails.invoiceNumber}". You currently have ₹${totalDue} in outstanding maintenance dues.`;
          }
        } else if (conversationState?.collectedDetails?.status === 'PAID') {
          if (Array.isArray(d.verifiedRecentPayments) && d.verifiedRecentPayments.length > 0) {
            reply = `Here are your recent verified maintenance payments:\n` +
              d.verifiedRecentPayments.map(inv => `• ${inv.invoiceNumber} (${inv.billingPeriod || 'Maintenance'}): ₹${Number(inv.paidAmount || inv.totalDue || 0).toLocaleString('en-IN')} [Status: ${inv.status}]`).join('\n');
          } else {
            reply = 'You do not have any paid maintenance invoices recorded for this period.';
          }
        } else {
          reply = `You currently have ₹${totalDue} in outstanding maintenance dues.`;
          if (d.overdueAmount > 0) {
            reply += ` (₹${Number(d.overdueAmount).toLocaleString('en-IN')} is overdue).`;
          }
          if (Array.isArray(d.unpaidInvoices) && d.unpaidInvoices.length > 0) {
            reply += '\n\nUnpaid Invoices:\n' +
              d.unpaidInvoices.slice(0, 3).map((inv) => `• ${inv.invoiceNumber} (${inv.billingPeriod || 'Maintenance'}): ₹${Number(inv.outstandingAmount || inv.totalDue || 0).toLocaleString('en-IN')} (Due: ${inv.dueDate})`).join('\n');
          }
        }

        reply += '\n\nTap below to pay or view invoice details.';

        return {
          message: reply,
          reply,
          actions: duesRes.action ? [duesRes.action] : [],
          toolCall: duesRes.action ? { targetRoute: duesRes.action.route, targetName: duesRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // C-1. Amenity Cancellation
    if (intent === 'amenity_cancellation' || conversationState?.workflow === 'amenity_cancel_ready' || text.includes('cancel my booking') || text.includes('cancel booking')) {
      const cancelRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_amenity_booking_cancellation',
        conversationState?.collectedDetails || {},
        authorizedFeatures
      );
      if (cancelRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: cancelRes.data.actionId,
          actionType: cancelRes.data.actionType,
          confirmationToken: cancelRes.data.confirmationToken,
          summary: cancelRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: cancelRes.data.message || `I have prepared the cancellation for your ${conversationState?.collectedDetails?.amenityName || 'amenity'} booking. Please confirm to cancel.`,
          reply: cancelRes.data.message || `I have prepared the cancellation for your ${conversationState?.collectedDetails?.amenityName || 'amenity'} booking. Please confirm to cancel.`,
          actions: cancelRes.action ? [cancelRes.action] : [],
          toolCall: cancelRes.action ? { targetRoute: cancelRes.action.route, targetName: cancelRes.action.targetName } : null,
          data: cancelRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // C-2. Amenity Creation
    if (intent === 'amenity_create' || conversationState?.workflow === 'amenity_create_ready') {
      const createRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_amenity_creation',
        conversationState?.collectedDetails || {},
        authorizedFeatures
      );
      if (createRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: createRes.data.actionId,
          actionType: createRes.data.actionType,
          confirmationToken: createRes.data.confirmationToken,
          summary: createRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: createRes.data.message || `I have prepared the proposal to create "${conversationState?.collectedDetails?.name}". Please confirm to add it to Amenity Master.`,
          reply: createRes.data.message || `I have prepared the proposal to create "${conversationState?.collectedDetails?.name}". Please confirm to add it to Amenity Master.`,
          actions: createRes.action ? [createRes.action] : [],
          toolCall: createRes.action ? { targetRoute: createRes.action.route, targetName: createRes.action.targetName } : null,
          data: createRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // C0. Amenity Booking History / My Bookings
    if (intent === 'amenity_my_bookings' || intent === 'my_bookings' || text.includes('my booking') || text.includes('my bookings') || text.includes('upcoming booking') || text.includes('upcoming bookings') || text.includes('my upcoming')) {
      const bookingsRes = await executeAssistantTool(user, tenant, 'get_my_bookings', {}, authorizedFeatures);
      if (bookingsRes?.success) {
        const d = bookingsRes.data;
        let reply = '';
        if (Array.isArray(d.bookings) && d.bookings.length > 0) {
          reply = `Here are your upcoming amenity bookings:\n` +
            d.bookings.map((b) => `• ${b.amenityName}: ${b.bookingDate} (${b.timeSlot || b.startTime || 'Scheduled'}) [Status: ${b.status}]`).join('\n');
        } else {
          reply = d.emptyMessage || 'You do not have any upcoming amenity bookings.';
        }
        reply += '\n\nTap below to manage your bookings or reserve another amenity.';

        return {
          message: reply,
          reply,
          actions: bookingsRes.action ? [bookingsRes.action] : [],
          toolCall: bookingsRes.action ? { targetRoute: bookingsRes.action.route, targetName: bookingsRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // C1. Amenity Discovery / Catalog
    if (intent === 'amenity_inquiry' || text.includes('what amenities') || text.includes('available amenities') || text.includes('amenities are available')) {
      const catalogRes = await executeAssistantTool(user, tenant, 'get_amenities_catalog', {}, authorizedFeatures);
      if (catalogRes?.success) {
        const d = catalogRes.data;
        let reply = '';
        if (Array.isArray(d.amenities) && d.amenities.length > 0) {
          reply = 'Here are the available community amenities you can book:\n' +
            d.amenities.map((a) => `• ${a.name} (${a.category || a.type || 'Facility'})`).join('\n') +
            '\n\nTap below to check slots and reserve your booking.';
          conversationState.presentedAmenities = d.amenities.map((a) => a.name);
        } else {
          reply = 'There are currently no active amenities created in your community. Please contact your community administrator to set up amenities.';
          conversationState.presentedAmenities = [];
        }

        return {
          message: reply,
          reply,
          actions: catalogRes.action ? [catalogRes.action] : [],
          toolCall: catalogRes.action ? { targetRoute: catalogRes.action.route, targetName: catalogRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // C2. Amenity Booking / Availability
    if (intent === 'amenity_booking' || intent === 'amenity_availability' || text.includes('amenity') || text.includes('amenities') || text.includes('court') || text.includes('pool') || text.includes('gym')) {
      const amenityName = conversationState?.collectedDetails?.amenityName;
      if (amenityName) {
        const amenityRes = await executeAssistantTool(user, tenant, 'check_amenity_availability', conversationState?.collectedDetails || {}, authorizedFeatures);
        if (amenityRes?.success) {
          const d = amenityRes.data;
          let reply = '';
          if (d.found) {
            reply = `Here is the availability for ${d.name} (${d.category || 'Facility'}) on ${d.date}:\n` +
              `• Operating Hours: ${d.operatingHours}\n` +
              `• Pricing: ${d.pricing}\n` +
              `• Available Slots: ${d.availableSlotsCount} slot(s) open\n` +
              (Array.isArray(d.availableSlots) && d.availableSlots.length > 0 ? `• Openings: ${d.availableSlots.slice(0, 4).join(', ')}\n` : '') +
              '\nTap below to reserve your slot.';
          } else {
            reply = d.message || `Could not find an active amenity matching "${amenityName}".`;
          }

          return {
            message: reply,
            reply,
            actions: amenityRes.action ? [amenityRes.action] : [],
            toolCall: amenityRes.action ? { targetRoute: amenityRes.action.route, targetName: amenityRes.action.targetName } : null,
            data: d,
            status: 'success',
            conversationState: sanitizeConversationState(conversationState),
            requestId: correlationId,
          };
        }
      } else {
        // No specific amenity requested yet - retrieve real active created facilities for this community
        const catalogRes = await executeAssistantTool(user, tenant, 'get_amenities_catalog', {}, authorizedFeatures);
        const amenities = (catalogRes?.data?.amenities || []);
        conversationState.presentedAmenities = amenities.map(a => a.name);

        let reply = '';
        if (amenities.length > 0) {
          reply = `Here are the available community amenities you can book:\n` +
            amenities.map((a, i) => `${i + 1}. ${a.name} (${a.category || a.type || 'Facility'})`).join('\n') +
            `\n\nWhich amenity would you like to book` +
            (conversationState?.collectedDetails?.headcount ? ` for ${conversationState.collectedDetails.headcount === 2 ? 'two people' : `${conversationState.collectedDetails.headcount} members`}` : '') +
            (conversationState?.collectedDetails?.dateLabel ? ` ${conversationState.collectedDetails.dateLabel.toLowerCase()}` : '') +
            (conversationState?.collectedDetails?.timePreference ? ` in the ${conversationState.collectedDetails.timePreference}` : '') +
            `?`;
        } else {
          reply = 'There are currently no active amenities created in your community. Please contact your community administrator to set up amenities.';
          conversationState.presentedAmenities = [];
        }

        conversationState.nextQuestion = reply;
        return {
          message: reply,
          reply,
          actions: catalogRes?.action ? [catalogRes.action] : [],
          toolCall: catalogRes?.action ? { targetRoute: catalogRes.action.route, targetName: catalogRes.action.targetName } : null,
          data: {
            interactionType: 'clarification',
            workflow: conversationState?.workflow,
            missingFields: conversationState?.missingFields,
            collectedDetails: conversationState?.collectedDetails,
            amenities: conversationState.presentedAmenities,
          },
          status: amenities.length > 0 ? 'clarification' : 'answering',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // D. Visitor Management
    if (intent === 'visitor_management' || intent === 'visitor_pass_create' || text.includes('visitor') || text.includes('guest') || text.includes('pass')) {
      const visitorRes = await executeAssistantTool(user, tenant, 'get_my_visitor_passes', {}, authorizedFeatures);
      if (visitorRes?.success) {
        const d = visitorRes.data;
        const count = d.totalPassesCount ?? (Array.isArray(d.passes) ? d.passes.length : 0);
        let reply = `You have ${count} active visitor pass(es).`;
        if (Array.isArray(d.passes) && d.passes.length > 0) {
          reply += '\n' + d.passes.slice(0, 3).map((p) => `• ${p.visitorName} (${p.status || 'Active'}, Key: ${p.shortKey || p.passId || 'N/A'})`).join('\n');
        }
        reply += '\n\nTap below to invite visitors or generate guest passes.';

        return {
          message: reply,
          reply,
          actions: visitorRes.action ? [visitorRes.action] : [],
          toolCall: visitorRes.action ? { targetRoute: visitorRes.action.route, targetName: visitorRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // E-1. Maintenance Request Creation fallback
    if (intent === 'maintenance_create' || conversationState?.workflow === 'maintenance_ready') {
      const mRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_maintenance_request',
        conversationState?.collectedDetails || {},
        authorizedFeatures
      );
      if (mRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: mRes.data.actionId,
          actionType: mRes.data.actionType,
          confirmationToken: mRes.data.confirmationToken,
          summary: mRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: mRes.data.message || 'I have prepared your maintenance request proposal. Please confirm to submit.',
          reply: mRes.data.message || 'I have prepared your maintenance request proposal. Please confirm to submit.',
          actions: mRes.action ? [mRes.action] : [],
          toolCall: mRes.action ? { targetRoute: mRes.action.route, targetName: mRes.action.targetName } : null,
          data: mRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // E-2. Complaint Ticket Creation fallback
    if (intent === 'complaint_create' || conversationState?.workflow === 'complaint_ready') {
      const cRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_complaint',
        conversationState?.collectedDetails || {},
        authorizedFeatures
      );
      if (cRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: cRes.data.actionId,
          actionType: cRes.data.actionType,
          confirmationToken: cRes.data.confirmationToken,
          summary: cRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: cRes.data.message || 'I have prepared your complaint ticket proposal. Please confirm to submit.',
          reply: cRes.data.message || 'I have prepared your complaint ticket proposal. Please confirm to submit.',
          actions: cRes.action ? [cRes.action] : [],
          toolCall: cRes.action ? { targetRoute: cRes.action.route, targetName: cRes.action.targetName } : null,
          data: cRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // E-3. Complaint Cancellation fallback
    if (intent === 'complaint_cancel' || conversationState?.workflow === 'complaint_cancel_ready') {
      const ccRes = await executeAssistantTool(
        user,
        tenant,
        'prepare_complaint_cancellation',
        conversationState?.collectedDetails || {},
        authorizedFeatures
      );
      if (ccRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: ccRes.data.actionId,
          actionType: ccRes.data.actionType,
          confirmationToken: ccRes.data.confirmationToken,
          summary: ccRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: ccRes.data.message || 'I have prepared the cancellation request. Please confirm to proceed.',
          reply: ccRes.data.message || 'I have prepared the cancellation request. Please confirm to proceed.',
          actions: ccRes.action ? [ccRes.action] : [],
          toolCall: ccRes.action ? { targetRoute: ccRes.action.route, targetName: ccRes.action.targetName } : null,
          data: ccRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // E-4. Complaint Escalation fallback
    if (intent === 'complaint_escalate' || conversationState?.workflow === 'complaint_escalate_ready') {
      const escRes = await executeAssistantTool(
        user,
        tenant,
        'escalate_complaint',
        conversationState?.collectedDetails || {},
        authorizedFeatures
      );
      if (escRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: escRes.data.actionId,
          actionType: escRes.data.actionType,
          confirmationToken: escRes.data.confirmationToken,
          summary: escRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: escRes.data.message,
          reply: escRes.data.message,
          actions: escRes.action ? [escRes.action] : [],
          toolCall: escRes.action ? { targetRoute: escRes.action.route, targetName: escRes.action.targetName } : null,
          data: escRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // E-5. Complaint Reopening fallback
    if (intent === 'complaint_reopen' || conversationState?.workflow === 'complaint_reopen_ready') {
      const roRes = await executeAssistantTool(
        user,
        tenant,
        'reopen_complaint',
        conversationState?.collectedDetails || {},
        authorizedFeatures
      );
      if (roRes?.data?.proposalReady) {
        conversationState.awaitingConfirmation = true;
        conversationState.pendingAction = {
          id: roRes.data.actionId,
          actionType: roRes.data.actionType,
          confirmationToken: roRes.data.confirmationToken,
          summary: roRes.data.summary,
        };
        conversationState.interactionType = 'confirmation';
        return {
          message: roRes.data.message,
          reply: roRes.data.message,
          actions: roRes.action ? [roRes.action] : [],
          toolCall: roRes.action ? { targetRoute: roRes.action.route, targetName: roRes.action.targetName } : null,
          data: roRes.data,
          status: 'confirmation',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // E-6. Complaints / Helpdesk Status & Tracking Queries
    const isComplaintMutation = ['maintenance_create', 'complaint_create', 'complaint_cancel', 'complaint_escalate', 'complaint_reopen', 'complaint_comment', 'issue_report'].includes(intent);
    if (!isComplaintMutation && (intent === 'complaints_helpdesk' || text.includes('complaint') || text.includes('ticket') || text.includes('issue') || text.includes('leak') || text.includes('repair'))) {
      const compRes = await executeAssistantTool(user, tenant, 'get_my_complaints', {}, authorizedFeatures);
      if (compRes?.success) {
        const d = compRes.data;
        const count = d.totalComplaintsCount ?? (Array.isArray(d.complaints) ? d.complaints.length : 0);
        let reply = `You have ${count} maintenance ticket(s).`;
        if (Array.isArray(d.complaints) && d.complaints.length > 0) {
          const lowerText = text.toLowerCase();
          const specific = d.complaints.find(c => {
            const t = (c.title || '').toLowerCase();
            const cat = (c.category || '').toLowerCase();
            return (lowerText.includes('lift') && (t.includes('lift') || cat.includes('lift'))) ||
                   (lowerText.includes('water') && (t.includes('water') || cat.includes('water'))) ||
                   (lowerText.includes('pipe') && (t.includes('pipe') || cat.includes('pipe')));
          });
          if (specific) {
            reply = `Status for your ${specific.title}: **${specific.status || 'In Progress'}** (Ticket: ${specific.complaintNumber || specific.id}).`;
          } else {
            reply += '\n' + d.complaints.slice(0, 3).map((c) => `• ${c.title} (${c.status || 'Open'})`).join('\n');
          }
        }
        reply += '\n\nTap below to track or log maintenance requests.';

        return {
          message: reply,
          reply,
          actions: compRes.action ? [compRes.action] : [],
          toolCall: compRes.action ? { targetRoute: compRes.action.route, targetName: compRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // F1. Staff Directory & Duty Schedule
    if (!isComplaintMutation && (intent === 'staff_directory' || text.includes('staff') || text.includes('duty') || text.includes('domestic help') || text.includes('technician') || text.includes('plumber') || text.includes('electrician'))) {
      const staffRes = await executeAssistantTool(user, tenant, 'get_active_staff_attendance', {}, authorizedFeatures);
      if (staffRes?.success) {
        const d = staffRes.data;
        const count = d.totalActiveInsideCount ?? (Array.isArray(d.activeInsideStaff) ? d.activeInsideStaff.length : 0);
        let reply = `🦸 Community superheroes on duty! Currently ${count} active staff member(s) checked in inside our community.`;
        if (Array.isArray(d.activeInsideStaff) && d.activeInsideStaff.length > 0) {
          reply += '\n' + d.activeInsideStaff.slice(0, 4).map((s) => `• ${s.staffName} (${s.designation || 'Staff'}, ${s.unitName || 'Duty'})`).join('\n');
        } else {
          reply += '\nNo domestic staff or service technicians are currently checked in inside your units.';
        }
        reply += '\n\nTap below to open the complete Community Staff Directory.';

        return {
          message: reply,
          reply,
          actions: staffRes.action ? [staffRes.action] : [],
          toolCall: staffRes.action ? { targetRoute: staffRes.action.route, targetName: staffRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // F2. Community Notice Board
    if (intent === 'notice_board' || text.includes('notice') || text.includes('announcement') || text.includes('circular')) {
      const noticeRes = await executeAssistantTool(user, tenant, 'get_community_notices', { limit: 5 }, authorizedFeatures);
      if (noticeRes?.success) {
        const d = noticeRes.data;
        const count = d.totalNoticesCount ?? (Array.isArray(d.notices) ? d.notices.length : 0);
        let reply = `📢 Community Broadcast Center! Found ${count} recent community notice(s).`;
        if (Array.isArray(d.notices) && d.notices.length > 0) {
          reply += '\n' + d.notices.slice(0, 3).map((n) => `• ${n.title} (${n.priority || 'Normal'}, ${n.category || 'General'})`).join('\n');
        }
        reply += '\n\nTap below to view the official community notice board.';

        return {
          message: reply,
          reply,
          actions: noticeRes.action ? [noticeRes.action] : [],
          toolCall: noticeRes.action ? { targetRoute: noticeRes.action.route, targetName: noticeRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // F3. Personal Expense Summary
    if (intent === 'personal_expense' || text.includes('my spend') || text.includes('grocery expense') || text.includes('personal expense')) {
      const expRes = await executeAssistantTool(user, tenant, 'get_personal_expense_summary', {}, authorizedFeatures);
      if (expRes?.success) {
        const d = expRes.data;
        const totalExp = Number(d.totalExpenses || 0).toLocaleString('en-IN');
        let reply = `💰 Let's make those numbers behave! Your recorded personal expenses this period total ₹${totalExp}.`;
        if (Array.isArray(d.categoryBreakdown) && d.categoryBreakdown.length > 0) {
          reply += '\nTop categories:\n' + d.categoryBreakdown.slice(0, 3).map((c) => `• ${c.name}: ₹${Number(c.amount || 0).toLocaleString('en-IN')}`).join('\n');
        }
        reply += '\n\nTap below to view full personal expense transactions.';

        return {
          message: reply,
          reply,
          actions: expRes.action ? [expRes.action] : [],
          toolCall: expRes.action ? { targetRoute: expRes.action.route, targetName: expRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // F4. Digital Wallet Balance
    if (intent === 'wallet_balance' || (text.includes('wallet') && (text.includes('balance') || text.includes('how much') || text.includes('my wallet')))) {
      const wallRes = await executeAssistantTool(user, tenant, 'get_wallet_balance', {}, authorizedFeatures);
      if (wallRes?.success) {
        const d = wallRes.data;
        const balStr = Number(d.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        let reply = `💳 Digital Wallet: Your current balance is ₹${balStr}.`;
        if (d.activePassesCount > 0) {
          reply += ` You also have ${d.activePassesCount} active amenity pass(es).`;
        }
        reply += '\n\nTap below to open your Digital Wallet or view transaction history.';
        return {
          message: reply,
          reply,
          actions: wallRes.action ? [wallRes.action] : [],
          toolCall: wallRes.action ? { targetRoute: wallRes.action.route, targetName: wallRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // F5. Digital Wallet Transactions
    if (intent === 'wallet_transactions' || (text.includes('wallet') && (text.includes('transaction') || text.includes('statement') || text.includes('ledger') || text.includes('history')))) {
      const txRes = await executeAssistantTool(user, tenant, 'get_wallet_transactions', conversationState?.collectedDetails || {}, authorizedFeatures);
      if (txRes?.success) {
        const d = txRes.data;
        let reply = `📜 Wallet Transaction Ledger: Found ${d.count || 0} recent transaction(s).`;
        if (Array.isArray(d.transactions) && d.transactions.length > 0) {
          reply += '\n' + d.transactions.map((t) => `• ${t.type === 'CREDIT' ? '🟢 Credit' : '🔴 Debit'}: ₹${Number(t.amount || 0).toLocaleString('en-IN')} - ${t.description}`).join('\n');
        }
        reply += '\n\nTap below to view complete wallet statements.';
        return {
          message: reply,
          reply,
          actions: txRes.action ? [txRes.action] : [],
          toolCall: txRes.action ? { targetRoute: txRes.action.route, targetName: txRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // F6. In-App Notifications
    if (intent === 'notifications' || text.includes('notification') || text.includes('alerts')) {
      const notifRes = await executeAssistantTool(user, tenant, 'get_my_notifications', conversationState?.collectedDetails || {}, authorizedFeatures);
      if (notifRes?.success) {
        const d = notifRes.data;
        const unreadStr = d.unreadCount > 0 ? ` (${d.unreadCount} unread)` : '';
        let reply = `🔔 Notifications Center: You have ${d.totalRecords || (d.notifications || []).length} notification(s)${unreadStr}.`;
        if (Array.isArray(d.notifications) && d.notifications.length > 0) {
          reply += '\n' + d.notifications.slice(0, 3).map((n) => `• ${n.isRead ? '⚪' : '🔵'} ${n.title}: ${n.message}`).join('\n');
        }
        reply += '\n\nTap below to view all community notifications.';
        return {
          message: reply,
          reply,
          actions: notifRes.action ? [notifRes.action] : [],
          toolCall: notifRes.action ? { targetRoute: notifRes.action.route, targetName: notifRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // F7. Notifications Mark Read
    if (intent === 'notifications_mark_read') {
      const readRes = await executeAssistantTool(user, tenant, 'prepare_notifications_mark_read', { markAll: true }, authorizedFeatures);
      return {
        message: 'All your notifications have been marked as read.',
        reply: 'All your notifications have been marked as read.',
        actions: [],
        toolCall: null,
        data: readRes?.data || null,
        status: 'success',
        conversationState: sanitizeConversationState(conversationState),
        requestId: correlationId,
      };
    }

    // F8. Emergency & Security Contacts
    if (intent === 'emergency_contacts' || text.includes('emergency') || text.includes('security guard') || text.includes('gate number') || text.includes('gate intercom')) {
      const emRes = await executeAssistantTool(user, tenant, 'get_emergency_contacts', conversationState?.collectedDetails || {}, authorizedFeatures);
      if (emRes?.success) {
        const d = emRes.data;
        let reply = `🚨 Community Emergency & Security Contacts:`;
        if (Array.isArray(d.emergencyContacts) && d.emergencyContacts.length > 0) {
          reply += '\n' + d.emergencyContacts.map((c) => `• ${c.role}: 📞 ${c.phone} (Intercom: ${c.intercom})`).join('\n');
        }
        if (Array.isArray(d.directoryStaff) && d.directoryStaff.length > 0) {
          reply += '\n\nSecurity Staff on Duty:\n' + d.directoryStaff.map((s) => `• ${s.name} (${s.designation || s.role}): 📞 ${s.phone || 'Intercom ' + s.intercomNumber}`).join('\n');
        }
        reply += '\n\nTap below to open the complete Community Directory.';
        return {
          message: reply,
          reply,
          actions: emRes.action ? [emRes.action] : [],
          toolCall: emRes.action ? { targetRoute: emRes.action.route, targetName: emRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // F9. Issue Reports List
    if (intent === 'issue_reports_list' || (text.includes('issue report') && (text.includes('show') || text.includes('list') || text.includes('my')))) {
      const repRes = await executeAssistantTool(user, tenant, 'get_issue_reports', conversationState?.collectedDetails || {}, authorizedFeatures);
      if (repRes?.success) {
        const d = repRes.data;
        let reply = `🛠️ Technical Issue Reports: Found ${d.count || 0} issue report(s).`;
        if (Array.isArray(d.reports) && d.reports.length > 0) {
          reply += '\n' + d.reports.map((r) => `• #${r.reportNumber} [${r.status}]: ${r.title} (${r.reportType})`).join('\n');
        }
        reply += '\n\nTap below to view full issue reports.';
        return {
          message: reply,
          reply,
          actions: repRes.action ? [repRes.action] : [],
          toolCall: repRes.action ? { targetRoute: repRes.action.route, targetName: repRes.action.targetName } : null,
          data: d,
          status: 'success',
          conversationState: sanitizeConversationState(conversationState),
          requestId: correlationId,
        };
      }
    }

    // F10. AI Assistant Feedback
    if (intent === 'ai_feedback') {
      const fbRes = await executeAssistantTool(user, tenant, 'submit_ai_feedback', conversationState?.collectedDetails || {}, authorizedFeatures);
      return {
        message: 'Thank you for your feedback! It helps improve NAHOM AI Assistant.',
        reply: 'Thank you for your feedback! It helps improve NAHOM AI Assistant.',
        actions: [],
        toolCall: null,
        data: fbRes?.data || null,
        status: 'success',
        conversationState: sanitizeConversationState(conversationState),
        requestId: correlationId,
      };
    }

    // F. Direct navigation matching
    const matchedFeature = authorizedFeatures.find((f) => {
      const name = (f.name || '').toLowerCase();
      const id = (f.id || '').toLowerCase();
      return text.includes(name) || text.includes(id) || (f.route && text.includes(f.route.replace(/[()/_]/g, ' ')));
    });

    if (matchedFeature) {
      const reply = `I found ${matchedFeature.name} for you. Tap the card below to open it.`;
      const navAction = {
        type: 'navigation',
        label: `Open ${matchedFeature.name}`,
        route: matchedFeature.route,
        targetName: matchedFeature.name,
        category: matchedFeature.category,
      };
      return {
        message: reply,
        reply,
        actions: [navAction],
        toolCall: { targetRoute: matchedFeature.route, targetName: matchedFeature.name, category: matchedFeature.category },
        data: null,
        status: 'success',
        conversationState: sanitizeConversationState(conversationState),
        requestId: correlationId,
      };
    }

    // G. Default Conversational Greeting / General Assistance
    const defaultReply = 'Hello! I am your NAHOM Community Assistant. How can I assist you with your community today? You can ask me to check community expenses, view maintenance dues, book amenities, invite visitors, or raise maintenance tickets.';

    return {
      message: defaultReply,
      reply: defaultReply,
      actions: [],
      toolCall: null,
      data: null,
      status: 'success',
      conversationState: sanitizeConversationState(conversationState),
      requestId: correlationId,
    };
  }

  async executeTool(user, tenant, toolName, toolArgs = {}) {
    const authorizedFeatures = this.filterAuthorizedFeatures(user, tenant);
    return await executeAssistantTool(user, tenant, toolName, toolArgs, authorizedFeatures);
  }
}

export default new AIAssistantService();
