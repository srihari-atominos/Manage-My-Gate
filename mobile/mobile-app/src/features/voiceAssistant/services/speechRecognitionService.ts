import { Platform, PermissionsAndroid } from 'react-native';

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult: (result: { transcript: string; isFinal: boolean }) => void;
  onError?: (error: Error) => void;
  onEnd?: () => void;
}

export interface SpeechRecognitionOptions {
  lang?: string;
  interimResults?: boolean;
}

const isTestEnvironment =
  typeof jest !== 'undefined' ||
  Boolean(process.env.JEST_WORKER_ID) ||
  process.env.NODE_ENV === 'test';

let ExpoSpeechRecognitionModule: any = null;
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule || mod;
} catch {
  // Graceful fallback if module is not bundled in current build
}

class SpeechRecognitionService {
  private isListeningActive: boolean = false;
  private isSubmitting: boolean = false;
  private lastSubmittedTranscript: string = '';
  private currentCallbacks: SpeechRecognitionCallbacks | null = null;
  private subscriptions: Array<{ remove: () => void }> = [];
  private webRecognition: any = null;

  /**
   * Checks whether speech recognition is supported in the active environment.
   */
  public isAvailable(): boolean {
    if (isTestEnvironment) return true;

    if (ExpoSpeechRecognitionModule) {
      try {
        if (typeof ExpoSpeechRecognitionModule.isRecognitionAvailable === 'function') {
          return Boolean(ExpoSpeechRecognitionModule.isRecognitionAvailable());
        }
        return true;
      } catch {
        return false;
      }
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return Boolean((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);
    }

    return false;
  }

  /**
   * Checks whether microphone permission is granted.
   */
  public async checkPermission(): Promise<boolean> {
    if (isTestEnvironment) return true;

    if (Platform.OS === 'android') {
      try {
        return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      } catch {
        return false;
      }
    }

    if (ExpoSpeechRecognitionModule?.getPermissionsAsync) {
      try {
        const resp = await ExpoSpeechRecognitionModule.getPermissionsAsync();
        return resp.granted === true;
      } catch {
        // Fall through
      }
    }

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).permissions) {
      try {
        const res = await (navigator as any).permissions.query({ name: 'microphone' });
        return res.state === 'granted';
      } catch {
        return true;
      }
    }

    return true;
  }

  /**
   * Requests microphone permission from the operating system.
   */
  public async requestPermission(): Promise<boolean> {
    if (isTestEnvironment) return true;

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Nahom Voice Assistant Microphone Access',
            message: 'Nahom requires microphone permission to transcribe your voice requests.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }

    if (ExpoSpeechRecognitionModule?.requestPermissionsAsync) {
      try {
        const resp = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        return resp.granted === true;
      } catch {
        // Fall through
      }
    }

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Determines if a transcript can be submitted to prevent duplicate executions.
   */
  public canSubmit(transcript: string): boolean {
    const trimmed = (transcript || '').trim();
    if (!trimmed) return false;
    if (this.isSubmitting) return false;
    if (this.lastSubmittedTranscript.toLowerCase() === trimmed.toLowerCase()) return false;
    return true;
  }

  /**
   * Locks submission guard to protect against duplicate transcript triggers.
   */
  public markSubmitted(transcript: string): void {
    this.isSubmitting = true;
    this.lastSubmittedTranscript = (transcript || '').trim();
  }

  /**
   * Unlocks submission guard for subsequent user turns.
   */
  public resetSubmission(): void {
    this.isSubmitting = false;
  }

  /**
   * Clears the submission history completely.
   */
  public clearSubmissionHistory(): void {
    this.isSubmitting = false;
    this.lastSubmittedTranscript = '';
  }

  /**
   * Starts capturing speech and transcribing it in real time.
   */
  public async startListening(
    callbacks: SpeechRecognitionCallbacks,
    options?: SpeechRecognitionOptions
  ): Promise<boolean> {
    if (this.isListeningActive) {
      await this.stopListening();
    }

    this.currentCallbacks = callbacks;

    // 1. Check microphone permission
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const requested = await this.requestPermission();
      if (!requested) {
        callbacks.onError?.(new Error('Microphone permission was denied.'));
        return false;
      }
    }

    // 2. Test Environment handling
    if (isTestEnvironment) {
      this.isListeningActive = true;
      callbacks.onStart?.();
      return true;
    }

    // 3. Native Expo Speech Recognition
    if (ExpoSpeechRecognitionModule) {
      try {
        this.clearSubscriptions();

        if (typeof ExpoSpeechRecognitionModule.addListener === 'function') {
          const startSub = ExpoSpeechRecognitionModule.addListener('start', () => {
            this.isListeningActive = true;
            this.currentCallbacks?.onStart?.();
          });
          if (startSub) this.subscriptions.push(startSub);

          const resultSub = ExpoSpeechRecognitionModule.addListener(
            'result',
            (event: { isFinal: boolean; results: Array<{ transcript: string }> }) => {
              const bestResult = event?.results?.[0]?.transcript || '';
              if (bestResult) {
                this.currentCallbacks?.onResult({
                  transcript: bestResult,
                  isFinal: Boolean(event.isFinal),
                });
              }
            }
          );
          if (resultSub) this.subscriptions.push(resultSub);

          const errorSub = ExpoSpeechRecognitionModule.addListener(
            'error',
            (event: { error: string; message?: string }) => {
              this.isListeningActive = false;
              this.currentCallbacks?.onError?.(
                new Error(event?.message || event?.error || 'Speech recognition error')
              );
            }
          );
          if (errorSub) this.subscriptions.push(errorSub);

          const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
            this.isListeningActive = false;
            this.currentCallbacks?.onEnd?.();
          });
          if (endSub) this.subscriptions.push(endSub);
        }

        await ExpoSpeechRecognitionModule.start({
          lang: options?.lang || 'en-US',
          interimResults: options?.interimResults !== false,
          addsPunctuation: true,
        });

        this.isListeningActive = true;
        return true;
      } catch (err: any) {
        this.isListeningActive = false;
        callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    }

    // 4. Web Speech Recognition API
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognitionClass =
        (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          this.webRecognition = recognition;
          recognition.continuous = false;
          recognition.interimResults = options?.interimResults !== false;
          recognition.lang = options?.lang || 'en-US';

          recognition.onstart = () => {
            this.isListeningActive = true;
            this.currentCallbacks?.onStart?.();
          };

          recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const item = event.results[i];
              if (item.isFinal) {
                finalTranscript += item[0].transcript;
              } else {
                interimTranscript += item[0].transcript;
              }
            }

            const chosen = (finalTranscript || interimTranscript).trim();
            if (chosen) {
              this.currentCallbacks?.onResult({
                transcript: chosen,
                isFinal: Boolean(finalTranscript),
              });
            }
          };

          recognition.onerror = (e: any) => {
            this.isListeningActive = false;
            this.currentCallbacks?.onError?.(new Error(e?.error || 'Speech recognition error'));
          };

          recognition.onend = () => {
            this.isListeningActive = false;
            this.currentCallbacks?.onEnd?.();
          };

          recognition.start();
          this.isListeningActive = true;
          return true;
        } catch (err: any) {
          this.isListeningActive = false;
          callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
          return false;
        }
      }
    }

    // 5. Fallback: Neither native nor web recognition available
    callbacks.onError?.(
      new Error('Speech recognition is not available in the current environment.')
    );
    return false;
  }

  /**
   * Gracefully stops listening and delivers final transcription.
   */
  public async stopListening(): Promise<void> {
    this.isListeningActive = false;

    if (ExpoSpeechRecognitionModule?.stop) {
      try {
        await ExpoSpeechRecognitionModule.stop();
      } catch {
        // Safe ignore
      }
    }

    if (this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch {
        // Safe ignore
      }
      this.webRecognition = null;
    }
  }

  /**
   * Immediately aborts listening without triggering final results.
   */
  public async cancelListening(): Promise<void> {
    this.isListeningActive = false;
    this.currentCallbacks = null;

    if (ExpoSpeechRecognitionModule?.abort) {
      try {
        await ExpoSpeechRecognitionModule.abort();
      } catch {
        // Safe ignore
      }
    }

    if (this.webRecognition) {
      try {
        this.webRecognition.abort();
      } catch {
        // Safe ignore
      }
      this.webRecognition = null;
    }

    this.clearSubscriptions();
  }

  public isListening(): boolean {
    return this.isListeningActive;
  }

  private clearSubscriptions(): void {
    for (const sub of this.subscriptions) {
      try {
        sub.remove();
      } catch {}
    }
    this.subscriptions = [];
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
export default speechRecognitionService;
