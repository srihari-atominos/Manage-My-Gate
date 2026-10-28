import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface TextToSpeechOptions {
  rate?: number;
  pitch?: number;
  language?: string;
  onDone?: () => void;
  onError?: (error: Error) => void;
  onStopped?: () => void;
}

const isTestEnvironment =
  typeof jest !== 'undefined' ||
  Boolean(process.env.JEST_WORKER_ID) ||
  process.env.NODE_ENV === 'test';

class TextToSpeechService {
  private isSpeakingActive: boolean = false;

  /**
   * Cleans conversational text so it sounds natural when synthesized aloud.
   * Strips markdown symbols, raw JSON, URLs, and code blocks.
   */
  public cleanTextForSpeech(rawText: string): string {
    if (!rawText || typeof rawText !== 'string') return '';

    return (
      rawText
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Remove markdown links [Label](url) -> Label
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove markdown headers #, ##, ###
        .replace(/#{1,6}\s+/g, '')
        // Remove bold and italic formatting **text** or *text*
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // Convert markdown bullet points to commas/pauses
        .replace(/\n\s*[-*+]\s+/g, ', ')
        // Remove raw JSON objects or arrays
        .replace(/\{[^{}]*\}/g, '')
        .replace(/\[[^\[\]]*\]/g, '')
        // Convert Rupee symbol to readable words for voice synthesis engines
        .replace(/₹\s*([0-9,]+(\.[0-9]+)?)/g, '$1 rupees')
        // Normalize multiple spaces/newlines
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Speaks the given text aloud using the device's native speech synthesis engine.
   * Ensures any existing playback is stopped first to prevent overlapping speech.
   */
  public async speak(text: string, options?: TextToSpeechOptions): Promise<void> {
    const cleaned = this.cleanTextForSpeech(text);
    if (!cleaned) {
      options?.onDone?.();
      return;
    }

    // Stop any ongoing speech immediately before starting new utterance
    await this.stop();

    if (isTestEnvironment) {
      this.isSpeakingActive = true;
      try {
        await Speech.speak(cleaned, {
          onDone: () => {
            this.isSpeakingActive = false;
            options?.onDone?.();
          },
          onError: (err: any) => {
            this.isSpeakingActive = false;
            options?.onError?.(new Error(err?.message || 'Speech synthesis error'));
          },
          onStopped: () => {
            this.isSpeakingActive = false;
            options?.onStopped?.();
          },
        });
      } catch (err: any) {
        this.isSpeakingActive = false;
        options?.onError?.(err);
      }
      return;
    }

    try {
      this.isSpeakingActive = true;

      // Web fallback check
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.rate = options?.rate || 1.0;
        utterance.pitch = options?.pitch || 1.0;
        utterance.lang = options?.language || 'en-US';

        utterance.onend = () => {
          this.isSpeakingActive = false;
          options?.onDone?.();
        };
        utterance.onerror = (e) => {
          this.isSpeakingActive = false;
          options?.onError?.(new Error(e?.error || 'Web Speech Synthesis error'));
        };
        window.speechSynthesis.speak(utterance);
        return;
      }

      await Speech.speak(cleaned, {
        language: options?.language || 'en-IN',
        pitch: options?.pitch ?? 1.0,
        rate: options?.rate ?? 0.95,
        onDone: () => {
          this.isSpeakingActive = false;
          options?.onDone?.();
        },
        onError: (err: any) => {
          this.isSpeakingActive = false;
          options?.onError?.(new Error(err?.message || 'Speech synthesis failed'));
        },
        onStopped: () => {
          this.isSpeakingActive = false;
          options?.onStopped?.();
        },
      });
    } catch (err: any) {
      this.isSpeakingActive = false;
      options?.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Immediately stops any ongoing speech synthesis.
   */
  public async stop(): Promise<void> {
    this.isSpeakingActive = false;

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      await Speech.stop();
    } catch {
      // Safe ignore
    }
  }

  /**
   * Checks if speech is actively speaking.
   */
  public async isSpeaking(): Promise<boolean> {
    if (isTestEnvironment) {
      return this.isSpeakingActive;
    }

    try {
      const active = await Speech.isSpeakingAsync();
      return active || this.isSpeakingActive;
    } catch {
      return this.isSpeakingActive;
    }
  }
}

export const textToSpeechService = new TextToSpeechService();
export default textToSpeechService;
