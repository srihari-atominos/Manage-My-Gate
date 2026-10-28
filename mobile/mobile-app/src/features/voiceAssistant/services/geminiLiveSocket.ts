import audioStreamService from './audioStreamService';
import type { AssistantFeature } from './aiAssistantApi';

export interface GeminiLiveSocketCallbacks {
  onSetupComplete?: () => void;
  onAudioChunk?: (base64Chunk: string) => void;
  onTranscript?: (text: string) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onToolCall?: (callId: string, name: string, args: Record<string, any>) => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
}

export class GeminiLiveSocket {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private setupDone: boolean = false;
  private callbacks: GeminiLiveSocketCallbacks = {};
  private connectionTimer: any = null;
  private setupTimer: any = null;

  constructor(callbacks: GeminiLiveSocketCallbacks) {
    this.callbacks = callbacks;
  }

  connect(
    liveEndpoint: string,
    ephemeralToken: string,
    model: string,
    voiceName: string = 'Puck',
    authorizedFeatures: AssistantFeature[] = [],
    tools: any[] = []
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const clearAllTimers = () => {
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer);
          this.connectionTimer = null;
        }
        if (this.setupTimer) {
          clearTimeout(this.setupTimer);
          this.setupTimer = null;
        }
      };

      const safeReject = (err: Error) => {
        if (!settled) {
          settled = true;
          clearAllTimers();
          this.disconnect();
          reject(err);
        }
      };

      const safeResolve = () => {
        if (!settled) {
          settled = true;
          if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
          }
          resolve();
        }
      };

      try {
        const separator = liveEndpoint.includes('?') ? '&' : '?';
        const url = `${liveEndpoint}${separator}access_token=${encodeURIComponent(ephemeralToken)}`;

        // 10s WebSocket connection timeout
        this.connectionTimer = setTimeout(() => {
          safeReject(new Error('Live Assistant connection timed out. Please check your network or try again.'));
        }, 10000);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.sendSetupFrame(model, voiceName, authorizedFeatures, tools);
          safeResolve();

          // 8s setup handshake timeout
          this.setupTimer = setTimeout(() => {
            if (!this.setupDone) {
              const err = new Error('Live Assistant setup handshake timed out.');
              this.callbacks.onError?.(err);
              this.disconnect();
            }
          }, 8000);
        };

        this.ws.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };

        this.ws.onerror = (event: any) => {
          const err = new Error(event?.message || 'Gemini Live WebSocket connection error');
          this.callbacks.onError?.(err);
          if (!this.isConnected) {
            safeReject(err);
          }
        };

        this.ws.onclose = (event) => {
          clearAllTimers();
          this.isConnected = false;
          this.setupDone = false;
          this.callbacks.onClose?.(event.code, event.reason);
          if (!settled) {
            safeReject(new Error(`Live assistant disconnected before handshake completed (code: ${event.code})`));
          }
        };
      } catch (err: any) {
        safeReject(err);
      }
    });
  }

  private sendSetupFrame(
    model: string,
    voiceName: string,
    features: AssistantFeature[],
    customTools: any[] = []
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const formattedModel = model.startsWith('models/') ? model : `models/${model}`;

    const featureDescriptions = features
      .map((f) => `'${f.id}': ${f.name} (${f.description})`)
      .join('; ');

    // Standard navigation tool declaration
    const navigationTool = {
      name: 'navigate_to_screen',
      description: `Navigate the user to a screen they have permission to access. Available authorized screens: ${featureDescriptions}`,
      parameters: {
        type: 'OBJECT',
        properties: {
          screenId: {
            type: 'STRING',
            description: 'The exact ID of the authorized feature screen to navigate to.',
          },
        },
        required: ['screenId'],
      },
    };

    // Merge declarations: deduplicate by name
    const allDeclarations = [navigationTool];
    if (Array.isArray(customTools)) {
      for (const t of customTools) {
        if (t && t.name && !allDeclarations.some((d) => d.name === t.name)) {
          allDeclarations.push(t);
        }
      }
    }

    const setupPayload = {
      setup: {
        model: formattedModel,
        systemInstruction: {
          parts: [
            {
              text: `You are NAHOM AI Assistant, the intelligent real-time voice and text assistant for NAHOM gated community residents.
Your role is to help residents navigate the community application, check amenities, booking status, visitor passes, complaints, notices, and answer their community questions.
You can understand both spoken voice and typed text.
You have access to live community data tools:
- 'get_community_finance_summary': Community financial expenses, collections, and budget.
- 'get_personal_expense_summary': Personal spending and budget.
- 'get_resident_dues_and_invoices': Maintenance charges and dues.
- 'get_amenities_catalog': Available amenities in the community.
- 'check_amenity_availability': Slot availability, timings, and pricing for a specific amenity.
- 'get_my_bookings': Resident's upcoming bookings.
- 'prepare_amenity_booking': Prepare a booking proposal for an amenity.
- 'get_my_complaints': Helpdesk tickets and maintenance complaints.
- 'navigate_to_screen': Open an authorized screen in the application.
Always call the relevant tool to retrieve up-to-date information before answering.
Speak naturally, politely, and concisely. Keep answers under 2 sentences unless the user asks for more detail.`,
            },
          ],
        },
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName || 'Puck',
              },
            },
          },
        },
        tools: [
          {
            functionDeclarations: allDeclarations,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(setupPayload));
  }

  sendRealtimeAudioChunk(base64Chunk: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupDone) {
      return;
    }

    const payload = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Chunk,
          },
        ],
      },
    };

    try {
      this.ws.send(JSON.stringify(payload));
    } catch {
      // Safe drop if socket buffer saturated
    }
  }

  sendTextMessage(text: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupDone) {
      return false;
    }

    const payload = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    try {
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  sendToolResponse(callId: string, output: Record<string, any>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const payload = {
      toolResponse: {
        functionResponses: [
          {
            response: { output },
            id: callId,
          },
        ],
      },
    };

    try {
      this.ws.send(JSON.stringify(payload));
    } catch {
      // Safe drop
    }
  }

  private handleIncomingMessage(rawData: any): void {
    try {
      let dataStr: string;
      if (typeof rawData === 'string') {
        dataStr = rawData;
      } else if (rawData instanceof ArrayBuffer) {
        dataStr = new TextDecoder().decode(rawData);
      } else if (rawData && typeof rawData.text === 'function') {
        rawData.text().then((txt: string) => this.handleIncomingMessage(txt)).catch(() => {});
        return;
      } else {
        dataStr = String(rawData);
      }
      const message = JSON.parse(dataStr);

      // 1. Setup complete
      if (message.setupComplete) {
        if (this.setupTimer) {
          clearTimeout(this.setupTimer);
          this.setupTimer = null;
        }
        this.setupDone = true;
        this.callbacks.onSetupComplete?.();
        return;
      }

      // 2. Server Content (Audio / Text / Interruption)
      if (message.serverContent) {
        const { modelTurn, interrupted, turnComplete } = message.serverContent;

        if (interrupted) {
          // Barge-in triggered by server: clear audio playback immediately
          audioStreamService.clearPlayback();
          this.callbacks.onInterrupted?.();
          return;
        }

        if (modelTurn?.parts) {
          for (const part of modelTurn.parts) {
            if (part.inlineData?.data) {
              const audioData = part.inlineData.data;
              audioStreamService.playChunk(audioData);
              this.callbacks.onAudioChunk?.(audioData);
            }
            if (part.text) {
              this.callbacks.onTranscript?.(part.text);
            }
          }
        }

        if (turnComplete) {
          this.callbacks.onTurnComplete?.();
        }
      }

      // 3. Tool Calls (Function calling)
      if (message.toolCall?.functionCalls) {
        for (const call of message.toolCall.functionCalls) {
          this.callbacks.onToolCall?.(call.id, call.name, call.args || {});
        }
      }
    } catch (err: any) {
      this.callbacks.onError?.(err);
    }
  }

  disconnect(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    if (this.setupTimer) {
      clearTimeout(this.setupTimer);
      this.setupTimer = null;
    }
    this.setupDone = false;
    this.isConnected = false;
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close(1000, 'User ended session');
      } catch {
        // Safe ignore
      }
      this.ws = null;
    }
  }

  get active(): boolean {
    return this.isConnected && this.setupDone;
  }
}
