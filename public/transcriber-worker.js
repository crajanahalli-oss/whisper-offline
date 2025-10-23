/**
 * Whisper Transcription Web Worker
 *
 * Runs Whisper WASM transcription in a background thread to avoid blocking the UI.
 * Uses Transformers.js library for browser-based ML inference.
 *
 * Based on: https://github.com/xenova/whisper-web
 */

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

// Configure environment
env.allowLocalModels = false; // Use hosted models only
env.allowRemoteModels = true; // Allow downloading from HuggingFace

/**
 * PipelineFactory - Singleton pattern for model management
 * Ensures only one instance of each model is loaded
 */
class PipelineFactory {
  static task = 'automatic-speech-recognition';
  static model = null;
  static instance = null;

  /**
   * Get or create pipeline instance
   * @param {string} model - Model ID (e.g., 'Xenova/whisper-tiny.en')
   * @param {Function} progressCallback - Called during model download
   * @returns {Promise} Pipeline instance
   */
  static async getInstance(model, progressCallback = null) {
    // If model changed, invalidate cache
    if (this.model !== model) {
      this.model = model;
      this.instance = null;
    }

    // Create new instance if needed
    if (this.instance === null) {
      this.instance = await pipeline(this.task, model, {
        progress_callback: progressCallback,
      });
    }

    return this.instance;
  }
}

/**
 * Main transcription function
 * @param {Float32Array} audio - Audio data at 16kHz mono
 * @param {string} model - Model name
 * @param {object} options - Transcription options
 * @returns {Promise<object>} Transcription result
 */
async function transcribe(audio, model, options = {}) {
  const {
    language = 'en',
    task = 'transcribe',
    return_timestamps = false,
    chunk_length_s = 30,
    stride_length_s = 5,
  } = options;

  // Progress callback - sends updates to main thread
  const progressCallback = (progress) => {
    self.postMessage({
      status: 'progress',
      data: progress,
    });
  };

  // Get pipeline instance (will download model on first run)
  const transcriber = await PipelineFactory.getInstance(model, progressCallback);

  // Run transcription
  const outputs = await transcriber(audio, {
    language,
    task,
    return_timestamps,
    chunk_length_s,
    stride_length_s,

    // Callback for generation progress
    callback_function: (beams) => {
      const text = transcriber.tokenizer.decode(beams[0].output_token_ids, {
        skip_special_tokens: true,
      });

      self.postMessage({
        status: 'update',
        data: {
          text: text.trim(),
          chunks: [], // Could add chunk info if needed
        },
      });
    },
  });

  return outputs;
}

/**
 * Message handler - receives commands from main thread
 */
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'transcribe': {
        const { audio, model, options } = data;

        // Validate audio input
        if (!audio || !(audio instanceof Float32Array)) {
          throw new Error('Invalid audio input: expected Float32Array');
        }

        if (audio.length === 0) {
          throw new Error('Audio is empty');
        }

        // Send status update
        self.postMessage({
          status: 'loading',
          data: { model },
        });

        // Perform transcription
        const result = await transcribe(audio, model, options);

        // Send result
        self.postMessage({
          status: 'complete',
          data: {
            text: result.text,
            chunks: result.chunks || [],
          },
        });
        break;
      }

      case 'check-model': {
        // Check if model is already loaded
        const { model } = data;
        const isLoaded = PipelineFactory.model === model && PipelineFactory.instance !== null;

        self.postMessage({
          status: 'model-status',
          data: {
            model,
            loaded: isLoaded,
          },
        });
        break;
      }

      case 'unload-model': {
        // Unload current model to free memory
        PipelineFactory.instance = null;
        PipelineFactory.model = null;

        self.postMessage({
          status: 'model-unloaded',
          data: {},
        });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    // Send error to main thread
    self.postMessage({
      status: 'error',
      data: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
});

// Ready signal
self.postMessage({
  status: 'ready',
  data: {},
});
