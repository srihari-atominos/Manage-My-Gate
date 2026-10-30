import aiAssistantService from './aiAssistant.service.js';

class AIAssistantController {
  /**
   * GET /api/v1/ai-assistant/config
   * Returns safe client-facing assistant configuration and authorized feature catalog.
   */
  async getConfig(req, res, next) {
    try {
      const configData = await aiAssistantService.getAssistantConfig(req.user, req.tenant);
      res.success(configData, 'Voice assistant configuration retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEvaluationSummary(req, res, next) {
    try {
      res.success(aiAssistantService.getEvaluationSummary(), 'AI evaluation summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ai-assistant/session/token
   * Provisions a short-lived ephemeral token for real-time Gemini Live WebSocket connection.
   */
  async createToken(req, res, next) {
    try {
      const sessionData = await aiAssistantService.createSessionToken(
        req.user,
        req.tenant,
        req.body?.context,
        req.aiSessionId
      );
      res.success(sessionData, 'Session token provisioned successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ai-assistant/session/release
   * Voluntarily releases an active session reservation when the client disconnects.
   * Idempotent and scoped to sessionId if provided.
   */
  async releaseSession(req, res, next) {
    try {
      const sessionId = req.body?.sessionId || req.body?.context?.sessionId;
      const result = await aiAssistantService.releaseSession(req.user, req.tenant, sessionId);
      res.success(result || { released: true }, 'Session released successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ai-assistant/chat
   * Text-based conversational response with live data access and authorized navigation.
   */
  async chat(req, res, next) {
    try {
      const response = await aiAssistantService.generateChatResponse(req.user, req.tenant, {
        message: req.body?.message,
        history: req.body?.history,
        context: req.body?.context,
      });
      res.success(response, 'AI assistant response generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ai-assistant/chat/stream
   * Streaming Server-Sent Events (SSE) conversational response.
   */
  async streamChat(req, res, next) {
    try {
      const abortController = new AbortController();
      req.on('close', () => abortController.abort());

      await aiAssistantService.streamChatResponse(
        req.user,
        req.tenant,
        {
          message: req.body?.message,
          history: req.body?.history,
          context: req.body?.context,
        },
        res,
        abortController.signal
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ai-assistant/tools/execute
   * Executes a declared assistant tool on behalf of voice or chat clients.
   */
  async executeTool(req, res, next) {
    try {
      const result = await aiAssistantService.executeTool(
        req.user,
        req.tenant,
        req.body?.toolName,
        req.body?.toolArgs
      );
      res.success(result, 'Tool executed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AIAssistantController();
