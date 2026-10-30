import apiClient from '../../../services/apiClient';

export interface AssistantFeature {
  id: string;
  name: string;
  description: string;
  route: string;
  category?: string;
}

export interface AssistantConfigResponse {
  enabled: boolean;
  model: string;
  chatModel?: string;
  liveEndpoint: string;
  voiceName: string;
  inputAudioFormat: string;
  outputAudioFormat: string;
  authorizedFeatures: AssistantFeature[];
  maxDurationSeconds: number;
}

export interface EphemeralTokenResponse {
  sessionId?: string;
  token: string;
  expireTime: string;
  liveEndpoint: string;
  model: string;
  authorizedFeatures: AssistantFeature[];
  sessionDurationSeconds: number;
}

export interface AssistantAction {
  type: 'navigation' | 'confirmation' | 'action_result';
  label?: string;
  route?: string;
  screenId?: string;
  targetName?: string;
  category?: string;
  actionType?: string;
  actionId?: string;
  confirmationToken?: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  summary?: string;
  details?: Record<string, any>;
  status?: 'success' | 'failed';
  message?: string;
  referenceId?: string;
}

export interface InteractiveOptionItem {
  id: string;
  label: string;
  value: string;
  type?: string;
  badge?: string | null;
  description?: string | null;
  selected?: boolean;
  icon?: string | null;
}

export interface InteractiveOptionGroup {
  mode: 'single' | 'multiple';
  targetField: string;
  allowDeselect: boolean;
  allowCustomText: boolean;
  customPlaceholder?: string;
  title?: string;
  selectedValues?: string[];
}

export interface ConversationState {
  activeIntent?: string | null;
  workflow?: string | null;
  collectedDetails?: Record<string, any>;
  missingFields?: string[];
  nextQuestion?: string | null;
  interactionType?: 'answering' | 'clarification' | 'confirmation' | 'navigating' | 'executing';
  awaitingConfirmation?: boolean;
  options?: InteractiveOptionItem[];
  interactiveConfig?: InteractiveOptionGroup;
  selectedOptions?: Record<string, any>;
  pendingAction?: {
    id: string;
    actionType: string;
    confirmationToken: string;
    summary?: string;
  } | null;
}

export interface ChatRequestPayload {
  message: string;
  history?: Array<{ role: 'user' | 'model' | 'assistant'; text: string }>;
  context?: {
    currentRoute?: string;
    locale?: string;
    conversationState?: ConversationState | null;
    referenceDate?: string;
  };
}

export interface ChatResponsePayload {
  message: string;
  reply?: string; // backward compatibility
  actions?: AssistantAction[];
  data?: any;
  options?: InteractiveOptionItem[];
  interactiveConfig?: InteractiveOptionGroup;
  toolCall?: {
    name: string;
    args: Record<string, any>;
    targetName?: string;
    targetRoute?: string;
    category?: string;
  } | null;
  status?: 'success' | 'clarification' | 'error';
  conversationState?: ConversationState | null;
  requestId?: string;
}

export interface ToolExecutionResponse {
  success: boolean;
  data?: any;
  action?: AssistantAction;
  error?: string;
}

/**
 * Normalizes apiClient response envelope safely across unwrapped & raw Axios formats.
 */
const extractData = <T>(response: any): T => {
  if (!response) return {} as T;
  // If wrapped in standard backend envelope { success: true, data: { ... } }
  if (response.data !== undefined && response.success !== undefined) {
    return response.data as T;
  }
  // If response.data itself contains another data property
  if (response.data?.data !== undefined) {
    return response.data.data as T;
  }
  // If response.data is the payload directly
  if (response.data !== undefined) {
    return response.data as T;
  }
  return response as T;
};

export const fetchAssistantConfig = async (): Promise<AssistantConfigResponse> => {
  const response = await apiClient.get('/ai-assistant/config');
  return extractData<AssistantConfigResponse>(response);
};

export const requestSessionToken = async (options?: {
  previousSessionId?: string;
  forceReconcile?: boolean;
  currentRoute?: string;
}): Promise<EphemeralTokenResponse> => {
  const body: any = {};
  if (options?.previousSessionId) body.previousSessionId = options.previousSessionId;
  if (options?.forceReconcile) body.forceReconcile = options.forceReconcile;
  if (options?.currentRoute) body.context = { currentRoute: options.currentRoute };

  const response = await apiClient.post('/ai-assistant/session/token', body);
  return extractData<EphemeralTokenResponse>(response);
};

export const releaseAssistantSession = async (
  sessionId?: string
): Promise<{ released: boolean }> => {
  const response = await apiClient.post('/ai-assistant/session/release', sessionId ? { sessionId } : {});
  return extractData<{ released: boolean }>(response) || { released: true };
};

export const sendChatMessage = async (
  payload: ChatRequestPayload,
  signal?: AbortSignal
): Promise<ChatResponsePayload> => {
  const response = await apiClient.post('/ai-assistant/chat', payload, {
    signal,
    timeout: 45000,
  });
  return extractData<ChatResponsePayload>(response);
};

export const executeAssistantTool = async (
  toolName: string,
  toolArgs: Record<string, any> = {}
): Promise<ToolExecutionResponse> => {
  const response = await apiClient.post('/ai-assistant/tools/execute', { toolName, toolArgs });
  return extractData<ToolExecutionResponse>(response);
};
