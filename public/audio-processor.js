/**
 * Audio Processor for Whisper Offline PWA
 *
 * Replaces server-side FFmpeg with browser-based Web Audio API processing
 * Converts WebM audio from MediaRecorder to Float32Array for Whisper WASM
 *
 * Requirements:
 * - Input: WebM blob from MediaRecorder
 * - Output: Float32Array at 16kHz mono
 * - Processing: Resample, convert to mono, normalize levels
 */

/**
 * Main function: Process audio for Whisper
 *
 * Converts WebM blob to Float32Array suitable for Transformers.js Whisper
 *
 * @param {Blob} webmBlob - Audio blob from MediaRecorder
 * @returns {Promise<Float32Array>} - Processed audio at 16kHz mono, normalized
 * @throws {Error} If audio processing fails or duration is too short
 */
export async function processAudioForWhisper(webmBlob) {
  console.log(`[AudioProcessor] Processing audio blob (${webmBlob.size} bytes)`);
  const startTime = Date.now();

  try {
    // Step 1: Decode and resample to 16kHz
    const audioBuffer = await decodeAndResample(webmBlob, 16000);
    console.log(`[AudioProcessor] Decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels}ch`);

    // Step 2: Validate duration
    if (!validateAudioDuration(audioBuffer)) {
      throw new Error('Audio too short (minimum 0.5 seconds required)');
    }

    // Step 3: Convert to mono if needed
    const monoData = audioBuffer.numberOfChannels > 1
      ? mixToMono(audioBuffer)
      : audioBuffer.getChannelData(0);
    console.log(`[AudioProcessor] Converted to mono: ${monoData.length} samples`);

    // Step 4: Normalize audio levels
    const normalized = normalizeAudio(monoData);
    console.log(`[AudioProcessor] Normalized audio`);

    const totalTime = Date.now() - startTime;
    console.log(`[AudioProcessor] Total processing time: ${totalTime}ms`);

    return normalized;
  } catch (error) {
    console.error('[AudioProcessor] Processing failed:', error);
    throw new Error(`Audio processing failed: ${error.message}`);
  }
}

/**
 * Decode WebM blob and resample to target sample rate
 *
 * Uses Web Audio API to decode audio and automatically resample
 *
 * @param {Blob} blob - Audio blob to decode
 * @param {number} targetSampleRate - Target sample rate (default: 16000)
 * @returns {Promise<AudioBuffer>} - Decoded and resampled audio buffer
 */
async function decodeAndResample(blob, targetSampleRate = 16000) {
  // Check browser support
  if (!window.AudioContext && !window.webkitAudioContext) {
    throw new Error('Web Audio API not supported in this browser');
  }

  // Create AudioContext with target sample rate (auto-resamples)
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass({ sampleRate: targetSampleRate });

  try {
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();

    // Decode audio (automatically resamples to context's sample rate)
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return audioBuffer;
  } catch (error) {
    throw new Error(`Failed to decode audio: ${error.message}`);
  } finally {
    // Clean up AudioContext to free resources
    // Note: Don't close immediately if reusing context in production
    await audioContext.close();
  }
}

/**
 * Convert stereo (or multi-channel) audio to mono
 *
 * Averages all channels into a single channel
 *
 * @param {AudioBuffer} audioBuffer - Multi-channel audio buffer
 * @returns {Float32Array} - Single channel (mono) audio data
 */
function mixToMono(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const mono = new Float32Array(length);

  // Average all channels
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i];
    }
  }

  // Divide by number of channels to get average
  for (let i = 0; i < length; i++) {
    mono[i] /= numChannels;
  }

  return mono;
}

/**
 * Normalize audio levels (replaces FFmpeg loudnorm)
 *
 * Scales audio to use ~95% of available dynamic range
 * Prevents clipping while maximizing signal strength
 *
 * @param {Float32Array} audioData - Raw audio samples
 * @returns {Float32Array} - Normalized audio samples
 */
function normalizeAudio(audioData) {
  // Find peak amplitude (max absolute value)
  let max = 0;
  for (let i = 0; i < audioData.length; i++) {
    const abs = Math.abs(audioData[i]);
    if (abs > max) max = abs;
  }

  // If audio is silent, return as-is
  if (max === 0) {
    console.warn('[AudioProcessor] Audio is silent (peak = 0)');
    return audioData;
  }

  // Calculate scaling factor to reach 95% of max amplitude
  // (like FFmpeg loudnorm - leaves some headroom)
  const TARGET_PEAK = 0.95;
  const scale = TARGET_PEAK / max;

  // Apply normalization
  const normalized = new Float32Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    normalized[i] = audioData[i] * scale;
  }

  console.log(`[AudioProcessor] Normalized: peak ${max.toFixed(4)} → ${TARGET_PEAK} (scale: ${scale.toFixed(4)})`);

  return normalized;
}

/**
 * Validate audio duration meets minimum requirements
 *
 * Whisper requires at least 0.5 seconds of audio to transcribe
 *
 * @param {AudioBuffer} audioBuffer - Decoded audio buffer
 * @returns {boolean} - true if duration >= 0.5 seconds
 */
function validateAudioDuration(audioBuffer) {
  const MIN_DURATION = 0.5; // seconds
  const duration = audioBuffer.duration;

  if (duration < MIN_DURATION) {
    console.warn(`[AudioProcessor] Duration too short: ${duration.toFixed(2)}s (minimum: ${MIN_DURATION}s)`);
    return false;
  }

  return true;
}

/**
 * Get audio metadata (for debugging/testing)
 *
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @returns {Object} - Metadata object
 */
export function getAudioMetadata(audioBuffer) {
  return {
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
    length: audioBuffer.length,
    durationSeconds: audioBuffer.duration.toFixed(2)
  };
}

/**
 * Calculate audio statistics (for debugging/testing)
 *
 * @param {Float32Array} audioData - Audio samples
 * @returns {Object} - Statistics object
 */
export function getAudioStats(audioData) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let i = 0; i < audioData.length; i++) {
    const sample = audioData[i];
    if (sample < min) min = sample;
    if (sample > max) max = sample;
    sum += Math.abs(sample);
  }

  const mean = sum / audioData.length;

  return {
    samples: audioData.length,
    min: min.toFixed(4),
    max: max.toFixed(4),
    peak: Math.max(Math.abs(min), Math.abs(max)).toFixed(4),
    meanAbsolute: mean.toFixed(4),
    type: audioData.constructor.name
  };
}

/**
 * Browser compatibility check
 *
 * @returns {Object} - Compatibility status
 */
export function checkBrowserSupport() {
  const support = {
    AudioContext: !!(window.AudioContext || window.webkitAudioContext),
    MediaRecorder: !!window.MediaRecorder,
    Float32Array: !!window.Float32Array,
    webmSupport: false,
    mp4Support: false
  };

  // Check MediaRecorder MIME type support
  if (window.MediaRecorder) {
    support.webmSupport = MediaRecorder.isTypeSupported('audio/webm');
    support.mp4Support = MediaRecorder.isTypeSupported('audio/mp4');
  }

  return support;
}

/**
 * Get recommended MIME type for MediaRecorder
 *
 * Returns best supported audio format
 *
 * @returns {string} - MIME type (e.g., "audio/webm" or "audio/mp4")
 */
export function getRecommendedMimeType() {
  if (!window.MediaRecorder) {
    throw new Error('MediaRecorder not supported');
  }

  // Prefer WebM (better compression, wider support)
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return 'audio/webm';
  }

  // Fallback to MP4 (Safari)
  if (MediaRecorder.isTypeSupported('audio/mp4')) {
    return 'audio/mp4';
  }

  // Last resort: Let browser decide
  return '';
}
