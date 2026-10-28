let withDangerousMod;
try {
  ({ withDangerousMod } = require('@expo/config-plugins'));
} catch {
  ({ withDangerousMod } = require('expo/config-plugins'));
}
const fs = require('fs');
const path = require('path');

const moduleSource = `package com.atominosconsulting.nahom

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicBoolean

class NahomAudioStreamModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  companion object {
    private const val DEFAULT_CAPTURE_RATE = 16000
    private const val DEFAULT_PLAYBACK_RATE = 24000
    private const val CHUNK_SIZE_BYTES = 3200 // ~100ms at 16kHz 16-bit mono
  }

  override fun getName(): String = "NahomAudioStream"

  private var audioRecord: AudioRecord? = null
  private var recordingThread: Thread? = null
  private val isRecording = AtomicBoolean(false)

  private var audioTrack: AudioTrack? = null
  private val isPlaying = AtomicBoolean(false)
  private val trackLock = Any()

  @ReactMethod
  fun addListener(eventName: String?) {
    // Required for React Native NativeEventEmitter
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for React Native NativeEventEmitter
  }

  @ReactMethod
  fun startRecording(sampleRate: Int, promise: Promise) {
    if (isRecording.get()) {
      promise.resolve(true)
      return
    }

    val rate = if (sampleRate > 0) sampleRate else DEFAULT_CAPTURE_RATE
    val minBufferSize = AudioRecord.getMinBufferSize(
      rate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )

    if (minBufferSize == AudioRecord.ERROR || minBufferSize == AudioRecord.ERROR_BAD_VALUE) {
      promise.reject("AUDIO_CONFIG_ERROR", "Invalid recording parameters")
      return
    }

    val bufferSize = maxOf(minBufferSize, CHUNK_SIZE_BYTES * 2)

    try {
      // VOICE_COMMUNICATION enables system Acoustic Echo Cancellation (AEC) and noise suppression
      val record = AudioRecord(
        MediaRecorder.AudioSource.VOICE_COMMUNICATION,
        rate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        bufferSize
      )

      if (record.state != AudioRecord.STATE_INITIALIZED) {
        record.release()
        promise.reject("AUDIO_INIT_FAILED", "Failed to initialize AudioRecord")
        return
      }

      audioRecord = record
      record.startRecording()
      isRecording.set(true)

      recordingThread = Thread({
        val audioBuffer = ByteArray(CHUNK_SIZE_BYTES)
        while (isRecording.get()) {
          val bytesRead = record.read(audioBuffer, 0, audioBuffer.size)
          if (bytesRead > 0) {
            val base64Data = Base64.encodeToString(audioBuffer, 0, bytesRead, Base64.NO_WRAP)
            val params = Arguments.createMap().apply {
              putString("data", base64Data)
              putInt("bytesRead", bytesRead)
            }
            sendEvent("onAudioChunk", params)
          }
        }
      }, "NahomAudioRecordThread").apply {
        priority = Thread.MAX_PRIORITY
        start()
      }

      promise.resolve(true)
    } catch (e: SecurityException) {
      promise.reject("AUDIO_PERMISSION_DENIED", "RECORD_AUDIO permission not granted", e)
    } catch (e: Exception) {
      promise.reject("AUDIO_RECORD_ERROR", e.message ?: "Failed to start recording", e)
    }
  }

  @ReactMethod
  fun stopRecording(promise: Promise) {
    try {
      isRecording.set(false)
      recordingThread?.interrupt()
      recordingThread = null

      audioRecord?.let {
        if (it.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
          it.stop()
        }
        it.release()
      }
      audioRecord = null

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_STOP_ERROR", e.message ?: "Failed to stop recording", e)
    }
  }

  @ReactMethod
  fun initPlayback(sampleRate: Int, promise: Promise) {
    synchronized(trackLock) {
      try {
        val rate = if (sampleRate > 0) sampleRate else DEFAULT_PLAYBACK_RATE
        val minBufferSize = AudioTrack.getMinBufferSize(
          rate,
          AudioFormat.CHANNEL_OUT_MONO,
          AudioFormat.ENCODING_PCM_16BIT
        )

        audioTrack?.release()

        val attributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()

        val format = AudioFormat.Builder()
          .setSampleRate(rate)
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
          .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
          .build()

        val track = AudioTrack(
          attributes,
          format,
          maxOf(minBufferSize * 2, 4096),
          AudioTrack.MODE_STREAM,
          android.media.AudioManager.AUDIO_SESSION_ID_GENERATE
        )

        if (track.state == AudioTrack.STATE_INITIALIZED) {
          audioTrack = track
          track.play()
          isPlaying.set(true)
          promise.resolve(true)
        } else {
          track.release()
          promise.reject("TRACK_INIT_FAILED", "Failed to initialize AudioTrack")
        }
      } catch (e: Exception) {
        promise.reject("TRACK_ERROR", e.message ?: "Failed to init AudioTrack", e)
      }
    }
  }

  @ReactMethod
  fun writePlaybackChunk(base64Data: String, promise: Promise) {
    synchronized(trackLock) {
      val track = audioTrack
      if (track == null || track.state != AudioTrack.STATE_INITIALIZED) {
        promise.resolve(0)
        return
      }

      try {
        val pcmBytes = Base64.decode(base64Data, Base64.NO_WRAP)
        if (track.playState != AudioTrack.PLAYSTATE_PLAYING) {
          track.play()
        }
        val written = track.write(pcmBytes, 0, pcmBytes.size, AudioTrack.WRITE_BLOCKING)
        promise.resolve(written)
      } catch (e: Exception) {
        promise.reject("PLAYBACK_WRITE_ERROR", e.message ?: "Failed to write PCM chunk", e)
      }
    }
  }

  @ReactMethod
  fun clearPlaybackQueue(promise: Promise) {
    // Critical for Barge-in: flush track buffer immediately to silence model speech
    synchronized(trackLock) {
      try {
        audioTrack?.let { track ->
          if (track.state == AudioTrack.STATE_INITIALIZED) {
            track.pause()
            track.flush()
            track.play()
          }
        }
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("FLUSH_ERROR", e.message ?: "Failed to flush AudioTrack", e)
      }
    }
  }

  @ReactMethod
  fun stopPlayback(promise: Promise) {
    synchronized(trackLock) {
      try {
        isPlaying.set(false)
        audioTrack?.let { track ->
          if (track.state == AudioTrack.STATE_INITIALIZED) {
            track.pause()
            track.flush()
            track.stop()
            track.release()
          }
        }
        audioTrack = null
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("STOP_PLAYBACK_ERROR", e.message ?: "Failed to stop AudioTrack", e)
      }
    }
  }

  private fun sendEvent(eventName: String, params: Any?) {
    if (context.hasActiveReactInstance()) {
      context
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
    }
  }
}
`;

const packageSource = `package com.atominosconsulting.nahom

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class NahomAudioStreamPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(NahomAudioStreamModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`;

module.exports = function withNahomAudioStream(config) {
  return withDangerousMod(config, ['android', async (currentConfig) => {
    const androidRoot = currentConfig.modRequest.platformProjectRoot;
    const packagePath = path.join(androidRoot, 'app', 'src', 'main', 'java', 'com', 'atominosconsulting', 'nahom');
    fs.mkdirSync(packagePath, { recursive: true });
    fs.writeFileSync(path.join(packagePath, 'NahomAudioStreamModule.kt'), moduleSource);
    fs.writeFileSync(path.join(packagePath, 'NahomAudioStreamPackage.kt'), packageSource);

    const mainApplicationPath = path.join(packagePath, 'MainApplication.kt');
    if (fs.existsSync(mainApplicationPath)) {
      const source = fs.readFileSync(mainApplicationPath, 'utf8');
      if (!source.includes('add(NahomAudioStreamPackage())')) {
        const insertionTarget = source.includes('add(NahomUpiPackage())')
          ? '          add(NahomUpiPackage())'
          : '          // add(MyReactNativePackage())';
        fs.writeFileSync(
          mainApplicationPath,
          source.replace(insertionTarget, `${insertionTarget}\n          add(NahomAudioStreamPackage())`)
        );
      }
    }
    return currentConfig;
  }]);
};
