/**
 * Whisper Transcriber - Main Thread Interface
 *
 * Manages Web Worker communication for audio transcription.
 * Provides a simple async API for transcribing audio using Whisper WASM.
 *
 * Usage:
 *   import { transcriber } from './transcriber.js';
 *   const result = await transcriber.transcribe(audioData, { onProgress: (p) => console.log(p) });
 *   console.log(result.text);
 */

class WhisperTranscriber {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.pendingTranscription = null;
    this.initPromise = null;
  }

  /**
   * Initialize the Web Worker
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Create worker
        this.worker = new Worker('./transcriber-worker.js', { type: 'module' });

        // Handle messages from worker
        this.worker.addEventListener('message', (event) => {
          this._handleWorkerMessage(event.data);
        });

        // Handle errors
        this.worker.addEventListener('error', (error) => {
          console.error('Worker error:', error);
          if (this.pendingTranscription) {
            this.pendingTranscription.reject(error);
            this.pendingTranscription = null;
          }
        });

        // Wait for ready signal
        const readyHandler = (event) => {
          if (event.data.status === 'ready') {
            this.ready = true;
            this.worker.removeEventListener('message', readyHandler);
            resolve();
          }
        };

        this.worker.addEventListener('message', readyHandler);
      } catch (error) {
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * Handle messages from worker
   * @param {object} message - Message from worker
   * @private
   */
  _handleWorkerMessage(message) {
    const { status, data } = message;

    if (!this.pendingTranscription) {
      // No active transcription, ignore update messages
      if (status === 'update' || status === 'progress') {
        return;
      }
    }

    switch (status) {
      case 'loading':
        if (this.pendingTranscription?.onProgress) {
          this.pendingTranscription.onProgress({
            status: 'loading',
            message: `Loading model: ${data.model}`,
            progress: 0,
          });
        }
        break;

      case 'progress':
        // Model download progress
        if (this.pendingTranscription?.onProgress) {
          const { file, progress, loaded, total } = data;
          this.pendingTranscription.onProgress({
            status: 'downloading',
            message: `Downloading ${file}`,
            progress: progress || 0,
            loaded,
            total,
          });
        }
        break;

      case 'update':
        // Transcription progress
        if (this.pendingTranscription?.onProgress) {
          this.pendingTranscription.onProgress({
            status: 'transcribing',
            message: 'Transcribing audio...',
            text: data.text,
            progress: -1, // Unknown progress
          });
        }
        break;

      case 'complete':
        if (this.pendingTranscription) {
          this.pendingTranscription.resolve(data);
          this.pendingTranscription = null;
        }
        break;

      case 'error':
        if (this.pendingTranscription) {
          this.pendingTranscription.reject(new Error(data.message));
          this.pendingTranscription = null;
        }
        break;

      case 'model-status':
      case 'model-unloaded':
        // Handle if needed
        break;

      case 'ready':
        // Already handled in init()
        break;

      default:
        console.warn('Unknown worker message status:', status);
    }
  }

  /**
   * Transcribe audio
   * @param {Float32Array} audio - Audio data at 16kHz mono
   * @param {object} options - Transcription options
   * @param {string} options.model - Model ID (default: 'Xenova/whisper-tiny.en')
   * @param {string} options.language - Language code (default: 'en')
   * @param {string} options.task - 'transcribe' or 'translate' (default: 'transcribe')
   * @param {boolean} options.return_timestamps - Return word timestamps (default: false)
   * @param {Function} options.onProgress - Progress callback
   * @returns {Promise<{text: string, chunks: array}>}
   */
  async transcribe(audio, options = {}) {
    // Ensure worker is initialized
    if (!this.ready) {
      await this.init();
    }

    // Validate audio
    if (!audio || !(audio instanceof Float32Array)) {
      throw new Error('Invalid audio: expected Float32Array at 16kHz mono');
    }

    if (audio.length === 0) {
      throw new Error('Audio is empty');
    }

    // Default options
    const {
      model = 'Xenova/whisper-tiny.en',
      language = 'en',
      task = 'transcribe',
      return_timestamps = false,
      chunk_length_s = 30,
      stride_length_s = 5,
      onProgress = null,
    } = options;

    // Check if there's already a pending transcription
    if (this.pendingTranscription) {
      throw new Error('A transcription is already in progress');
    }

    // Create promise for this transcription
    return new Promise((resolve, reject) => {
      this.pendingTranscription = {
        resolve,
        reject,
        onProgress,
      };

      // Send transcription request to worker
      this.worker.postMessage({
        type: 'transcribe',
        data: {
          audio,
          model,
          options: {
            language,
            task,
            return_timestamps,
            chunk_length_s,
            stride_length_s,
          },
        },
      });
    });
  }

  /**
   * Check if a model is loaded
   * @param {string} model - Model ID
   * @returns {Promise<boolean>}
   */
  async isModelLoaded(model) {
    if (!this.ready) {
      await this.init();
    }

    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.data.status === 'model-status') {
          this.worker.removeEventListener('message', handler);
          resolve(event.data.data.loaded);
        }
      };

      this.worker.addEventListener('message', handler);

      this.worker.postMessage({
        type: 'check-model',
        data: { model },
      });
    });
  }

  /**
   * Unload current model to free memory
   * @returns {Promise<void>}
   */
  async unloadModel() {
    if (!this.ready) {
      return;
    }

    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.data.status === 'model-unloaded') {
          this.worker.removeEventListener('message', handler);
          resolve();
        }
      };

      this.worker.addEventListener('message', handler);

      this.worker.postMessage({
        type: 'unload-model',
        data: {},
      });
    });
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
      this.initPromise = null;

      if (this.pendingTranscription) {
        this.pendingTranscription.reject(new Error('Worker terminated'));
        this.pendingTranscription = null;
      }
    }
  }
}

// Export singleton instance
export const transcriber = new WhisperTranscriber();

// Also export class for advanced use cases
export { WhisperTranscriber };
