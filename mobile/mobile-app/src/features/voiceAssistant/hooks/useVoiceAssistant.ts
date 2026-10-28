import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';

import {
  openModal,
  closeModal,
  setMode,
  setIsGeneratingText,
  setStatus,
  setError,
  setMuted,
  setTtsEnabled,
  toggleTtsEnabled,
  setTranscriptSnippet,
  incrementElapsed,
  setAuthorizedFeatures,
  setMaxDurationSeconds,
  setLastNavigatedScreen,
  setConversationState,
  resetVoiceSession,
  addMessage,
  updateLastAssistantMessage,
  clearMessages,
  VoiceAssistantStatus,
  AssistantMessage,
} from '../store/voiceAssistantSlice';
import {
  requestSessionToken,
  releaseAssistantSession,
  sendChatMessage,
  executeAssistantTool,
  fetchAssistantConfig,
  AssistantFeature,
} from '../services/aiAssistantApi';
import speechRecognitionService from '../services/speechRecognitionService';
import textToSpeechService from '../services/textToSpeechService';
import { validateVoiceNavigation } from '../services/voiceNavigationGuard';

const EMPTY_FEATURES: AssistantFeature[] = [];
const EMPTY_MESSAGES: AssistantMessage[] = [];

export const useVoiceAssistant = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const status = useSelector(
    (state: any) => (state.voiceAssistant?.status || 'idle') as VoiceAssistantStatus
  );
  const mode = useSelector(
    (state: any) => (state.voiceAssistant?.mode || 'chat') as 'chat' | 'voice'
  );
  const isModalOpen = useSelector((state: any) => Boolean(state.voiceAssistant?.isModalOpen));
  const isMuted = useSelector((state: any) => Boolean(state.voiceAssistant?.isMuted));
  const isTtsEnabled = useSelector((state: any) =>
    state.voiceAssistant?.isTtsEnabled !== undefined ? Boolean(state.voiceAssistant.isTtsEnabled) : true
  );
  const isGeneratingText = useSelector((state: any) => Boolean(state.voiceAssistant?.isGeneratingText));
  const errorMessage = useSelector((state: any) => state.voiceAssistant?.errorMessage as string | null);
  const transcriptSnippet = useSelector(
    (state: any) => (state.voiceAssistant?.transcriptSnippet || '') as string
  );
  const elapsedSeconds = useSelector((state: any) => (state.voiceAssistant?.elapsedSeconds || 0) as number);
  const maxDurationSeconds = useSelector(
    (state: any) => (state.voiceAssistant?.maxDurationSeconds || 600) as number
  );
  const authorizedFeatures = useSelector(
    (state: any) => (state.voiceAssistant?.authorizedFeatures || EMPTY_FEATURES) as AssistantFeature[]
  );
  const lastNavigatedScreen = useSelector(
    (state: any) => state.voiceAssistant?.lastNavigatedScreen as string | null
  );
  const conversationState = useSelector((state: any) => state.voiceAssistant?.conversationState || null);
  const messages = useSelector(
    (state: any) => (state.voiceAssistant?.messages || EMPTY_MESSAGES) as AssistantMessage[]
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const isMutedRef = useRef(isMuted);
  const isTtsEnabledRef = useRef(isTtsEnabled);
  const authorizedFeaturesRef = useRef(authorizedFeatures);
  const statusRef = useRef(status);
  const isModalOpenRef = useRef(isModalOpen);
  const modeRef = useRef(mode);
  const messagesRef = useRef(messages);
  const isSubmittingVoiceRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isTtsEnabledRef.current = isTtsEnabled;
  }, [isTtsEnabled]);

  useEffect(() => {
    authorizedFeaturesRef.current = authorizedFeatures;
  }, [authorizedFeatures]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Stops ongoing speech playback immediately.
   */
  const stopSpeaking = useCallback(async () => {
    await textToSpeechService.stop();
    if (statusRef.current === 'speaking') {
      dispatch(setStatus('idle'));
    }
  }, [dispatch]);

  /**
   * Cancels any active listening session.
   */
  const cancelListening = useCallback(async () => {
    await speechRecognitionService.cancelListening();
    dispatch(setTranscriptSnippet(''));
    if (statusRef.current === 'listening' || statusRef.current === 'transcribing') {
      dispatch(setStatus('idle'));
    }
  }, [dispatch]);

  /**
   * Full session termination: stops voice recognition, speech playback, releases temporary locks.
   */
  const endVoiceSession = useCallback(async () => {
    clearTimer();
    isSubmittingVoiceRef.current = false;

    await speechRecognitionService.cancelListening();
    await textToSpeechService.stop();

    if (currentSessionIdRef.current) {
      const activeSessionId = currentSessionIdRef.current;
      currentSessionIdRef.current = null;
      try {
        await releaseAssistantSession(activeSessionId);
      } catch {
        // Safe ignore
      }
    }

    dispatch(resetVoiceSession());
  }, [clearTimer, dispatch]);

  const endSession = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch(setIsGeneratingText(false));
    await endVoiceSession();
  }, [endVoiceSession, dispatch]);

  const handleClose = useCallback(async () => {
    await endSession();
    dispatch(closeModal());
  }, [endSession, dispatch]);

  /**
   * Stops ongoing generation or speech synthesis (barge-in / interruption).
   */
  const interruptAssistant = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch(setIsGeneratingText(false));
    speechRecognitionService.cancelListening();
    textToSpeechService.stop();
    isSubmittingVoiceRef.current = false;
    dispatch(setStatus('idle'));
  }, [dispatch]);

  /**
   * Internal submission pipeline for both transcribed voice and typed text.
   * Directly consumes the canonical backend /api/v1/ai-assistant/chat endpoint.
   */
  const executeChatRequest = useCallback(
    async (text: string, isFromVoice: boolean = false): Promise<boolean> => {
      const trimmed = (text || '').trim();
      if (!trimmed) return false;

      // Deduplication guard for voice submissions
      if (isFromVoice) {
        if (!speechRecognitionService.canSubmit(trimmed)) {
          return false;
        }
        speechRecognitionService.markSubmitted(trimmed);
      }

      // Stop any active speech before starting new conversational turn
      await textToSpeechService.stop();

      // 1. Append user bubble
      dispatch(
        addMessage({
          id: `user_${Date.now()}`,
          sender: 'user',
          text: trimmed,
          timestamp: Date.now(),
        })
      );

      // 2. Set processing state
      dispatch(setStatus('processing'));
      dispatch(setIsGeneratingText(true));

      const assistantMsgId = `assistant_${Date.now() + 1}`;
      dispatch(
        addMessage({
          id: assistantMsgId,
          sender: 'assistant',
          text: '',
          timestamp: Date.now(),
        })
      );

      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const historyList = messagesRef.current
          .filter((m) => m && m.text && m.text.trim().length > 0 && !m.isError)
          .slice(-15)
          .map((m) => ({
            role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
            text: m.text.trim(),
          }));

        const cleanConversationState =
          conversationState && typeof conversationState === 'object'
            ? conversationState
            : undefined;

        const result = await sendChatMessage(
          {
            message: trimmed,
            history: historyList,
            context: {
              currentRoute: (router as any)?.pathname || '',
              ...(cleanConversationState ? { conversationState: cleanConversationState } : {}),
            },
          },
          abortController.signal
        );

        if (result) {
          if (result.conversationState) {
            dispatch(setConversationState(result.conversationState));
          }

          const primaryText = result.message || result.reply || 'Here is what I found for you.';
          const primaryAction =
            (result.actions && result.actions[0]) ||
            (result.toolCall
              ? {
                  route: result.toolCall.targetRoute || '',
                  targetName: result.toolCall.targetName || '',
                  category: result.toolCall.category,
                  screenId: result.toolCall.args?.screenId,
                }
              : null);

          dispatch(
            updateLastAssistantMessage({
              text: primaryText,
              isError: false,
              metadata: primaryAction
                ? {
                    targetRoute: primaryAction.route,
                    targetName: primaryAction.targetName,
                    category: primaryAction.category,
                    screenId: primaryAction.screenId,
                    data: result.data,
                    actionCard: primaryAction,
                  }
                : (result.data ? { data: result.data } : undefined),
            })
          );

          if (primaryAction?.targetName) {
            dispatch(setLastNavigatedScreen(primaryAction.targetName));
          }

          // Check if this turn requires explicit action confirmation
          const isAwaitingConfirmation =
            result.conversationState?.awaitingConfirmation ||
            result.actions?.some((a) => a.type === 'confirmation') ||
            result.status === 'clarification';

          if (isAwaitingConfirmation) {
            dispatch(setStatus('awaiting_confirmation'));
          }

          // Text-to-Speech Playback (spoken when enabled or in voice mode)
          const shouldSpeak = isTtsEnabledRef.current && (isFromVoice || modeRef.current === 'voice');

          if (shouldSpeak && primaryText) {
            dispatch(setStatus('speaking'));
            await textToSpeechService.speak(primaryText, {
              onDone: () => {
                if (statusRef.current === 'speaking') {
                  dispatch(setStatus(isAwaitingConfirmation ? 'awaiting_confirmation' : 'idle'));
                }
              },
              onError: () => {
                if (statusRef.current === 'speaking') {
                  dispatch(setStatus(isAwaitingConfirmation ? 'awaiting_confirmation' : 'idle'));
                }
              },
              onStopped: () => {
                if (statusRef.current === 'speaking') {
                  dispatch(setStatus(isAwaitingConfirmation ? 'awaiting_confirmation' : 'idle'));
                }
              },
            });
          } else if (!isAwaitingConfirmation) {
            dispatch(setStatus('idle'));
          }
        }
        return true;
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') {
          return false;
        }

        const serverError = err?.response?.data?.message;
        const details = err?.response?.data?.details;
        let fallbackText = serverError
          ? `${serverError}`
          : 'I encountered an issue connecting to the AI assistant. Please check your network and tap Retry.';

        if (details && Array.isArray(details) && details.length > 0) {
          const detailMsg = details
            .map((d: any) => `${d.field ? `${d.field}: ` : ''}${d.message}`)
            .join(', ');
          fallbackText = `${serverError} (${detailMsg})`;
        }

        dispatch(
          updateLastAssistantMessage({
            text: fallbackText,
            isError: true,
            failedPrompt: trimmed,
          })
        );

        dispatch(setError(fallbackText));
        dispatch(setStatus('error'));

        if (isTtsEnabledRef.current && (isFromVoice || modeRef.current === 'voice')) {
          textToSpeechService.speak(
            serverError || 'Sorry, I encountered an issue connecting to the assistant. Please try again.',
            {
              onDone: () => {
                if (statusRef.current === 'speaking') dispatch(setStatus('error'));
              },
            }
          );
        }

        return false;
      } finally {
        dispatch(setIsGeneratingText(false));
        abortControllerRef.current = null;
        isSubmittingVoiceRef.current = false;
        speechRecognitionService.resetSubmission();
      }
    },
    [dispatch, conversationState, router]
  );

  /**
   * Starts capturing speech and transcribing in real-time.
   */
  const startListening = useCallback(async () => {
    if (
      statusRef.current === 'listening' ||
      statusRef.current === 'transcribing' ||
      statusRef.current === 'processing'
    ) {
      return;
    }

    // Stop ongoing speech before listening
    await textToSpeechService.stop();

    dispatch(setStatus('requesting_permission'));

    const hasPermission = await speechRecognitionService.checkPermission();
    if (!hasPermission) {
      const granted = await speechRecognitionService.requestPermission();
      if (!granted) {
        dispatch(setStatus('permission_denied'));
        return;
      }
    }

    if (!speechRecognitionService.isAvailable()) {
      dispatch(setStatus('idle'));
      dispatch(
        setError('Speech recognition is not supported on this device. You can chat seamlessly using text below.')
      );
      return;
    }

    dispatch(setStatus('listening'));
    dispatch(setTranscriptSnippet(''));

    try {
      await speechRecognitionService.startListening({
        onStart: () => {
          dispatch(setStatus('listening'));
        },
        onResult: ({ transcript, isFinal }) => {
          dispatch(setTranscriptSnippet(transcript));

          if (!isFinal) {
            if (statusRef.current !== 'transcribing') {
              dispatch(setStatus('transcribing'));
            }
          } else {
            // Final transcription delivered
            const finalTranscript = transcript.trim();
            if (!finalTranscript) {
              dispatch(setStatus('idle'));
              return;
            }

            if (isSubmittingVoiceRef.current) return;
            isSubmittingVoiceRef.current = true;

            speechRecognitionService.stopListening();
            executeChatRequest(finalTranscript, true);
          }
        },
        onError: (err) => {
          isSubmittingVoiceRef.current = false;
          // Ignore aborted or no-speech events cleanly
          if (err.message.includes('aborted') || err.message.includes('no-speech')) {
            dispatch(setStatus('idle'));
            return;
          }
          dispatch(setError(err.message || 'Speech recognition failed'));
          dispatch(setStatus('error'));
        },
        onEnd: () => {
          if (statusRef.current === 'listening' || statusRef.current === 'transcribing') {
            if (!isSubmittingVoiceRef.current) {
              dispatch(setStatus('idle'));
            }
          }
        },
      });
    } catch (err: any) {
      dispatch(setError(err?.message || 'Failed to start microphone'));
      dispatch(setStatus('error'));
    }
  }, [dispatch, executeChatRequest]);

  /**
   * Starts a voice session: initializes config and starts listening immediately.
   */
  const startVoiceSession = useCallback(async () => {
    dispatch(setMode('voice'));
    dispatch(openModal());

    // Fetch authorized config in background if not already loaded
    if (authorizedFeaturesRef.current.length === 0) {
      fetchAssistantConfig()
        .then((cfg) => {
          if (cfg?.authorizedFeatures) {
            dispatch(setAuthorizedFeatures(cfg.authorizedFeatures));
          }
        })
        .catch(() => {});
    }

    await startListening();
  }, [dispatch, startListening]);

  /**
   * Opens the assistant interface with an optional mode ('chat' | 'voice').
   */
  const openAssistant = useCallback(
    async (options?: { mode?: 'chat' | 'voice' }) => {
      const targetMode = options?.mode || 'chat';
      dispatch(openModal());

      if (messages.length === 0) {
        dispatch(
          addMessage({
            id: 'welcome_assistant',
            sender: 'assistant',
            text: "Hi! I'm your NAHOM AI Assistant. You can speak or type to check expenses, unpaid invoices, amenities, bookings, complaints, visitors, or notices.",
            timestamp: Date.now(),
          })
        );
      }

      if (targetMode === 'voice') {
        await startVoiceSession();
      } else {
        dispatch(setMode('chat'));
      }
    },
    [dispatch, messages.length, startVoiceSession]
  );

  const startSession = useCallback(async () => {
    await openAssistant({ mode: 'chat' });
  }, [openAssistant]);

  const switchToVoiceMode = useCallback(async () => {
    await startVoiceSession();
  }, [startVoiceSession]);

  const switchToChatMode = useCallback(async () => {
    await cancelListening();
    await textToSpeechService.stop();
    dispatch(setMode('chat'));
    dispatch(setStatus('idle'));
  }, [cancelListening, dispatch]);

  const toggleMute = useCallback(() => {
    dispatch(setMuted(!isMuted));
  }, [dispatch, isMuted]);

  const toggleTts = useCallback(() => {
    const nextVal = !isTtsEnabled;
    dispatch(setTtsEnabled(nextVal));
    if (!nextVal) {
      textToSpeechService.stop();
    }
  }, [dispatch, isTtsEnabled]);

  const sendTextMessage = useCallback(
    async (text: string): Promise<boolean> => {
      return await executeChatRequest(text, false);
    },
    [executeChatRequest]
  );

  const confirmAction = useCallback(
    async (actionId: string, confirmationToken: string) => {
      if (actionId && confirmationToken) {
        dispatch(
          setConversationState({
            ...(conversationState || {}),
            awaitingConfirmation: true,
            pendingAction: {
              id: actionId,
              confirmationToken,
            },
          })
        );
      }
      await executeChatRequest('Confirm', false);
    },
    [conversationState, dispatch, executeChatRequest]
  );

  const cancelAction = useCallback(
    async (actionId: string) => {
      if (actionId) {
        dispatch(
          setConversationState({
            ...(conversationState || {}),
            awaitingConfirmation: true,
            pendingAction: {
              id: actionId,
            },
          })
        );
      }
      await executeChatRequest('Cancel', false);
    },
    [conversationState, dispatch, executeChatRequest]
  );

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    speechRecognitionService.cancelListening();
    textToSpeechService.stop();
    dispatch(setIsGeneratingText(false));
    dispatch(clearMessages());
    dispatch(setStatus('idle'));
  }, [dispatch]);

  const navigateToFeature = useCallback(
    (route: string) => {
      if (!route) return;
      try {
        router.push(route as any);
      } catch (err) {
        console.warn('Failed to navigate to route:', route, err);
      }
    },
    [router]
  );

  // AppState Backgrounding Guard:
  // Immediately stops speech recognition and speech synthesis if app transitions to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        speechRecognitionService.cancelListening();
        textToSpeechService.stop();
        if (
          statusRef.current === 'listening' ||
          statusRef.current === 'transcribing' ||
          statusRef.current === 'speaking'
        ) {
          dispatch(setStatus('idle'));
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [dispatch]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      clearTimer();
      speechRecognitionService.cancelListening();
      textToSpeechService.stop();
      if (currentSessionIdRef.current) {
        const idToRelease = currentSessionIdRef.current;
        currentSessionIdRef.current = null;
        releaseAssistantSession(idToRelease).catch(() => {});
      }
    };
  }, [clearTimer]);

  return {
    status,
    mode,
    isModalOpen,
    isMuted,
    isTtsEnabled,
    isGeneratingText,
    errorMessage,
    transcriptSnippet,
    elapsedSeconds,
    maxDurationSeconds,
    authorizedFeatures,
    lastNavigatedScreen,
    messages,
    startSession,
    startVoiceSession,
    endVoiceSession,
    endSession,
    openAssistant,
    handleClose,
    toggleMute,
    toggleTts,
    sendTextMessage,
    confirmAction,
    cancelAction,
    clearChat,
    interruptAssistant,
    switchToVoiceMode,
    switchToChatMode,
    navigateToFeature,
    retryPermission: startVoiceSession,
    startListening,
    cancelListening,
    stopSpeaking,
  };
};

export default useVoiceAssistant;
