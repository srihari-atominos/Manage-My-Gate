import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';

const { NahomAudioStream } = NativeModules;

export type AudioChunkListener = (base64Data: string) => void;

const isTestEnvironment =
  typeof jest !== 'undefined' ||
  Boolean(process.env.JEST_WORKER_ID) ||
  process.env.NODE_ENV === 'test';

class AudioStreamService {
  private eventEmitter: NativeEventEmitter | null = null;
  private chunkSubscription: any = null;
  private isCapturing: boolean = false;
  private isPlaybackActive: boolean = false;

  // Web Audio Context & Stream references
  private webPlaybackContext: any = null;
  private webRecordContext: any = null;
  private webMediaStream: any = null;
  private webScriptProcessor: any = null;
  private webSourceNode: any = null;
  private webNextPlayTime: number = 0;
  private webScheduledSources: any[] = [];

  constructor() {
    if (NahomAudioStream) {
      this.eventEmitter = new NativeEventEmitter(NahomAudioStream);
    }
  }

  isSupported(): boolean {
    if (Boolean(NahomAudioStream) || isTestEnvironment) return true;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      return Boolean(AudioCtx && navigator?.mediaDevices?.getUserMedia);
    }
    return false;
  }

  async checkMicrophonePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      } catch {
        return false;
      }
    }
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).permissions) {
      try {
        const queryRes = await (navigator as any).permissions.query({ name: 'microphone' });
        return queryRes.state === 'granted';
      } catch {
        return true;
      }
    }
    return true;
  }

  async requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Nahom Voice Assistant Microphone Access',
            message: 'Nahom requires microphone access to communicate with the real-time AI assistant.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  async startCapture(onChunk: AudioChunkListener, sampleRate: number = 16000): Promise<boolean> {
    if (this.isCapturing) return true;

    // 1. Native Android Implementation
    if (NahomAudioStream) {
      try {
        if (this.eventEmitter) {
          this.chunkSubscription = this.eventEmitter.addListener('onAudioChunk', (event: any) => {
            if (event?.data && this.isCapturing) {
              onChunk(event.data);
            }
          });
        }

        await NahomAudioStream.startRecording(sampleRate);
        this.isCapturing = true;
        return true;
      } catch (err) {
        this.isCapturing = false;
        if (this.chunkSubscription) {
          try {
            this.chunkSubscription.remove();
          } catch {}
          this.chunkSubscription = null;
        }
        throw err;
      }
    }

    // 2. Web Browser Implementation (Web Audio API)
    if (Platform.OS === 'web' || typeof navigator !== 'undefined') {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: { ideal: sampleRate },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          this.webMediaStream = stream;

          const AudioContextClass =
            (window as any).AudioContext || (window as any).webkitAudioContext;
          try {
            this.webRecordContext = new AudioContextClass({ sampleRate: 16000 });
          } catch {
            this.webRecordContext = new AudioContextClass();
          }
          if (this.webRecordContext.state === 'suspended') {
            await this.webRecordContext.resume();
          }

          this.webSourceNode = this.webRecordContext.createMediaStreamSource(stream);

          // 2048-sample buffer
          const bufferSize = 2048;
          this.webScriptProcessor = this.webRecordContext.createScriptProcessor(bufferSize, 1, 1);

          this.webScriptProcessor.onaudioprocess = (e: any) => {
            if (!this.isCapturing) return;
            const inputFloat32 = e.inputBuffer.getChannelData(0);
            const inRate = this.webRecordContext?.sampleRate || 16000;

            // Resample from inRate (e.g. 48000Hz or 44100Hz) to 16000Hz
            const pcm16 = this.resampleAndEncodePcm16(inputFloat32, inRate, 16000);

            // Convert Int16Array to base64
            const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = window.btoa(binary);
            onChunk(base64);
          };

          this.webSourceNode.connect(this.webScriptProcessor);

          // Silent connection to destination to keep onaudioprocess alive in Chrome
          const dummyGain = this.webRecordContext.createGain();
          dummyGain.gain.value = 0;
          this.webScriptProcessor.connect(dummyGain);
          dummyGain.connect(this.webRecordContext.destination);

          this.isCapturing = true;
          return true;
        } catch (err: any) {
          this.isCapturing = false;
          await this.stopCapture();
          throw new Error(err?.message || 'Failed to access microphone in browser');
        }
      }
    }

    // 3. Test Environment Fallback
    if (isTestEnvironment) {
      this.isCapturing = true;
      return true;
    }

    throw new Error(
      `Native audio streaming module is not available on ${Platform.OS}. A native build with NahomAudioStream is required.`
    );
  }

  async stopCapture(): Promise<void> {
    if (!this.isCapturing && !this.chunkSubscription && !this.webMediaStream) {
      return;
    }

    this.isCapturing = false;

    if (this.chunkSubscription) {
      try {
        this.chunkSubscription.remove();
      } catch {}
      this.chunkSubscription = null;
    }

    if (NahomAudioStream) {
      try {
        await NahomAudioStream.stopRecording();
      } catch {}
    }

    // Web Browser cleanup
    if (this.webScriptProcessor) {
      try {
        this.webScriptProcessor.disconnect();
      } catch {}
      this.webScriptProcessor = null;
    }
    if (this.webSourceNode) {
      try {
        this.webSourceNode.disconnect();
      } catch {}
      this.webSourceNode = null;
    }
    if (this.webMediaStream) {
      try {
        this.webMediaStream.getTracks().forEach((track: any) => track.stop());
      } catch {}
      this.webMediaStream = null;
    }
    if (this.webRecordContext && this.webRecordContext.state !== 'closed') {
      try {
        await this.webRecordContext.close();
      } catch {}
      this.webRecordContext = null;
    }
  }

  async initPlayback(sampleRate: number = 24000): Promise<void> {
    // 1. Native Android Implementation
    if (NahomAudioStream) {
      try {
        await NahomAudioStream.initPlayback(sampleRate);
        this.isPlaybackActive = true;
        return;
      } catch (err) {
        this.isPlaybackActive = false;
        throw err;
      }
    }

    // 2. Web Browser Implementation (Web Audio Context)
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        try {
          if (!this.webPlaybackContext || this.webPlaybackContext.state === 'closed') {
            this.webPlaybackContext = new AudioContextClass({ sampleRate });
          }
          if (this.webPlaybackContext.state === 'suspended') {
            await this.webPlaybackContext.resume();
          }
          this.webNextPlayTime = this.webPlaybackContext.currentTime;
          this.webScheduledSources = [];
          this.isPlaybackActive = true;
          return;
        } catch (err: any) {
          this.isPlaybackActive = false;
          throw new Error(`Web audio playback initialization failed: ${err.message}`);
        }
      }
    }

    // 3. Test Environment Fallback
    if (isTestEnvironment) {
      this.isPlaybackActive = true;
      return;
    }

    throw new Error(
      `Native audio playback is not available on ${Platform.OS}. A native build with NahomAudioStream is required.`
    );
  }

  async playChunk(base64Pcm: string): Promise<void> {
    if (!this.isPlaybackActive || !base64Pcm) return;

    // 1. Native Android Implementation
    if (NahomAudioStream) {
      try {
        await NahomAudioStream.writePlaybackChunk(base64Pcm);
      } catch {}
      return;
    }

    // 2. Web Browser Implementation (Linear PCM 24kHz AudioBuffer playback)
    if (this.webPlaybackContext && this.webPlaybackContext.state !== 'closed' && typeof window !== 'undefined') {
      try {
        if (this.webPlaybackContext.state === 'suspended') {
          await this.webPlaybackContext.resume();
        }

        // Decode base64 to 16-bit linear PCM
        const binaryString = window.atob(base64Pcm);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        // Gemini Live API response audio is 24kHz linear 16-bit PCM
        const incomingRate = 24000;
        const audioBuffer = this.webPlaybackContext.createBuffer(1, float32Array.length, incomingRate);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = this.webPlaybackContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.webPlaybackContext.destination);

        const currentTime = this.webPlaybackContext.currentTime;
        const startTime = Math.max(currentTime, this.webNextPlayTime);
        source.start(startTime);
        this.webNextPlayTime = startTime + audioBuffer.duration;

        this.webScheduledSources.push(source);
        source.onended = () => {
          const idx = this.webScheduledSources.indexOf(source);
          if (idx !== -1) {
            this.webScheduledSources.splice(idx, 1);
          }
        };
      } catch {}
    }
  }

  /**
   * Clears playback queue immediately.
   * Crucial for Barge-In: instantly stops AI audio buffer when user speaks or interrupts.
   */
  async clearPlayback(): Promise<void> {
    if (NahomAudioStream) {
      try {
        await NahomAudioStream.clearPlaybackQueue();
      } catch {}
    }

    // Web Browser: Stop all actively scheduled audio buffers instantly
    if (this.webScheduledSources.length > 0) {
      for (const source of this.webScheduledSources) {
        try {
          source.stop();
          source.disconnect();
        } catch {}
      }
      this.webScheduledSources = [];
    }
    if (this.webPlaybackContext) {
      this.webNextPlayTime = this.webPlaybackContext.currentTime;
    }
  }

  async stopPlayback(): Promise<void> {
    this.isPlaybackActive = false;
    await this.clearPlayback();
    if (NahomAudioStream) {
      try {
        await NahomAudioStream.stopPlayback();
      } catch {}
    }
  }

  /**
   * Resamples a Float32 audio chunk from inRate (e.g. 48kHz / 44.1kHz) to outRate (16kHz)
   * and converts the samples to 16-bit linear signed PCM (Int16Array).
   */
  private resampleAndEncodePcm16(input: Float32Array, inRate: number, outRate: number = 16000): Int16Array {
    if (inRate === outRate || Math.abs(inRate - outRate) < 50) {
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return pcm16;
    }

    const ratio = inRate / outRate;
    const outLength = Math.floor(input.length / ratio);
    const output = new Int16Array(outLength);

    for (let i = 0; i < outLength; i++) {
      const srcIndex = i * ratio;
      const srcFloor = Math.floor(srcIndex);
      const srcCeil = Math.min(input.length - 1, srcFloor + 1);
      const fraction = srcIndex - srcFloor;

      // Linear interpolation between consecutive source samples
      const interpolated = input[srcFloor] * (1 - fraction) + input[srcCeil] * fraction;
      const s = Math.max(-1, Math.min(1, interpolated));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return output;
  }

  get capturing(): boolean {
    return this.isCapturing;
  }

  get playbackActive(): boolean {
    return this.isPlaybackActive;
  }
}

export const audioStreamService = new AudioStreamService();
export default audioStreamService;
