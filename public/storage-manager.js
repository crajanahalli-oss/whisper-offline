/**
 * Hybrid Storage Manager for Whisper Offline PWA
 *
 * Uses Cache API for models/assets and IndexedDB for metadata/user data
 *
 * Architecture:
 * - Cache API: Whisper model files, app code, assets (managed by Transformers.js + Service Worker)
 * - IndexedDB: Model metadata, HHA assessments, settings, recordings
 */

import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

class StorageManager {
  constructor() {
    this.cache = null;
    this.db = null;
    this.DB_NAME = 'hha-assessment';
    this.DB_VERSION = 1;
    this.CACHE_NAME = 'whisper-models-v1';
  }

  /**
   * Initialize both Cache API and IndexedDB
   */
  async init() {
    try {
      // Initialize Cache API (for models)
      this.cache = await caches.open(this.CACHE_NAME);
      console.log('[Storage] Cache API initialized');

      // Initialize IndexedDB (for metadata and user data)
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Model metadata store
          if (!db.objectStoreNames.contains('models')) {
            const modelsStore = db.createObjectStore('models', { keyPath: 'name' });
            console.log('[Storage] Created models object store');
          }

          // User assessments store (offline queue)
          if (!db.objectStoreNames.contains('assessments')) {
            const assessmentsStore = db.createObjectStore('assessments', {
              keyPath: 'id',
              autoIncrement: true
            });
            assessmentsStore.createIndex('timestamp', 'timestamp');
            assessmentsStore.createIndex('synced', 'synced');
            console.log('[Storage] Created assessments object store');
          }

          // App settings store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
            console.log('[Storage] Created settings object store');
          }

          // Temporary audio recordings store
          if (!db.objectStoreNames.contains('recordings')) {
            db.createObjectStore('recordings', {
              keyPath: 'id',
              autoIncrement: true
            });
            console.log('[Storage] Created recordings object store');
          }
        }
      });

      console.log('[Storage] IndexedDB initialized');
      return true;
    } catch (error) {
      console.error('[Storage] Initialization failed:', error);
      throw error;
    }
  }

  // ===================================================================
  // MODEL METADATA (IndexedDB)
  // ===================================================================

  /**
   * Save model metadata to IndexedDB
   */
  async saveModelMetadata(meta) {
    if (!this.db) throw new Error('Storage not initialized');

    const modelData = {
      name: meta.name,
      version: meta.version || '1.0.0',
      downloadedAt: meta.downloadedAt || Date.now(),
      sizeBytes: meta.sizeBytes,
      lastUsed: Date.now(),
      cacheKeys: meta.cacheKeys || [] // URLs in Cache API
    };

    await this.db.put('models', modelData);
    console.log(`[Storage] Saved model metadata: ${meta.name}`);
  }

  /**
   * Get model metadata from IndexedDB
   */
  async getModelMetadata(name) {
    if (!this.db) throw new Error('Storage not initialized');
    return await this.db.get('models', name);
  }

  /**
   * Update model last used timestamp
   */
  async updateModelLastUsed(name) {
    if (!this.db) throw new Error('Storage not initialized');

    const meta = await this.getModelMetadata(name);
    if (meta) {
      meta.lastUsed = Date.now();
      await this.db.put('models', meta);
      console.log(`[Storage] Updated model last used: ${name}`);
    }
  }

  /**
   * Get all model metadata
   */
  async getAllModels() {
    if (!this.db) throw new Error('Storage not initialized');
    return await this.db.getAll('models');
  }

  // ===================================================================
  // ASSESSMENTS (IndexedDB)
  // ===================================================================

  /**
   * Save HHA assessment to IndexedDB
   */
  async saveAssessment(assessment) {
    if (!this.db) throw new Error('Storage not initialized');

    const assessmentData = {
      timestamp: Date.now(),
      transcription: assessment.transcription,
      formData: assessment.formData,
      audioBlob: assessment.audioBlob || null, // Optional: save audio
      synced: false // For future cloud sync
    };

    // Only include id if it's provided and valid
    if (assessment.id) {
      assessmentData.id = assessment.id;
    }

    const id = await this.db.put('assessments', assessmentData);
    console.log(`[Storage] Saved assessment: ${id}`);
    return id;
  }

  /**
   * Get single assessment by ID
   */
  async getAssessment(id) {
    if (!this.db) throw new Error('Storage not initialized');
    return await this.db.get('assessments', id);
  }

  /**
   * Get all assessments
   */
  async getAllAssessments() {
    if (!this.db) throw new Error('Storage not initialized');
    return await this.db.getAll('assessments');
  }

  /**
   * Get unsynced assessments (for future cloud sync)
   */
  async getUnsyncedAssessments() {
    if (!this.db) throw new Error('Storage not initialized');

    // Get all assessments and filter for unsynced ones
    const allAssessments = await this.db.getAll('assessments');
    return allAssessments.filter(a => a.synced === false);
  }

  /**
   * Mark assessment as synced
   */
  async markAssessmentSynced(id) {
    if (!this.db) throw new Error('Storage not initialized');

    const assessment = await this.getAssessment(id);
    if (assessment) {
      assessment.synced = true;
      await this.db.put('assessments', assessment);
      console.log(`[Storage] Marked assessment ${id} as synced`);
    }
  }

  /**
   * Delete old assessments (auto-cleanup)
   */
  async deleteOldAssessments(daysOld = 30) {
    if (!this.db) throw new Error('Storage not initialized');

    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const tx = this.db.transaction('assessments', 'readwrite');
    const index = tx.store.index('timestamp');

    // Get all assessments older than cutoff
    const cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
    let count = 0;

    while (cursor) {
      await cursor.delete();
      count++;
      await cursor.continue();
    }

    console.log(`[Storage] Deleted ${count} old assessments (older than ${daysOld} days)`);
    return count;
  }

  /**
   * Delete single assessment
   */
  async deleteAssessment(id) {
    if (!this.db) throw new Error('Storage not initialized');
    await this.db.delete('assessments', id);
    console.log(`[Storage] Deleted assessment: ${id}`);
  }

  // ===================================================================
  // SETTINGS (IndexedDB)
  // ===================================================================

  /**
   * Save setting
   */
  async saveSetting(key, value) {
    if (!this.db) throw new Error('Storage not initialized');
    await this.db.put('settings', { key, value });
    console.log(`[Storage] Saved setting: ${key}`);
  }

  /**
   * Get setting
   */
  async getSetting(key, defaultValue = null) {
    if (!this.db) throw new Error('Storage not initialized');

    const setting = await this.db.get('settings', key);
    return setting ? setting.value : defaultValue;
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    if (!this.db) throw new Error('Storage not initialized');
    const settings = await this.db.getAll('settings');
    const result = {};
    settings.forEach(s => result[s.key] = s.value);
    return result;
  }

  // ===================================================================
  // STORAGE MANAGEMENT
  // ===================================================================

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usagePercent: (estimate.usage / estimate.quota) * 100,
        usageGB: (estimate.usage / 1e9).toFixed(2),
        quotaGB: (estimate.quota / 1e9).toFixed(2)
      };
    }
    return null;
  }

  /**
   * Clear model cache (Cache API + metadata)
   */
  async clearModelCache() {
    try {
      // Clear Cache API (models)
      await caches.delete(this.CACHE_NAME);
      console.log('[Storage] Cleared Cache API');

      // Clear model metadata
      if (this.db) {
        await this.db.clear('models');
        console.log('[Storage] Cleared model metadata');
      }

      // Re-initialize cache
      this.cache = await caches.open(this.CACHE_NAME);

      return true;
    } catch (error) {
      console.error('[Storage] Failed to clear model cache:', error);
      throw error;
    }
  }

  /**
   * Clear all data (nuclear option)
   */
  async clearAllData() {
    try {
      // Clear Cache API
      await caches.delete(this.CACHE_NAME);

      // Clear all IndexedDB stores
      if (this.db) {
        await this.db.clear('models');
        await this.db.clear('assessments');
        await this.db.clear('recordings');
        await this.db.clear('settings');
      }

      console.log('[Storage] Cleared all data');

      // Re-initialize
      this.cache = await caches.open(this.CACHE_NAME);

      return true;
    } catch (error) {
      console.error('[Storage] Failed to clear all data:', error);
      throw error;
    }
  }

  /**
   * Export assessments as JSON
   */
  async exportAssessments() {
    if (!this.db) throw new Error('Storage not initialized');

    const assessments = await this.getAllAssessments();

    // Remove binary audio blobs from export
    const exportData = assessments.map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      date: new Date(a.timestamp).toISOString(),
      transcription: a.transcription,
      formData: a.formData,
      synced: a.synced
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get storage breakdown by store
   */
  async getStorageBreakdown() {
    if (!this.db) throw new Error('Storage not initialized');

    const assessments = await this.db.getAll('assessments');
    const models = await this.db.getAll('models');
    const recordings = await this.db.getAll('recordings');

    // Estimate sizes (rough)
    const assessmentSize = JSON.stringify(assessments).length;
    const modelMetaSize = JSON.stringify(models).length;
    const recordingSize = recordings.reduce((sum, r) =>
      sum + (r.blob ? r.blob.size : 0), 0
    );

    return {
      assessments: {
        count: assessments.length,
        sizeBytes: assessmentSize,
        sizeMB: (assessmentSize / 1e6).toFixed(2)
      },
      models: {
        count: models.length,
        sizeBytes: modelMetaSize,
        sizeMB: (modelMetaSize / 1e6).toFixed(2)
      },
      recordings: {
        count: recordings.length,
        sizeBytes: recordingSize,
        sizeMB: (recordingSize / 1e6).toFixed(2)
      }
    };
  }
}

// Export singleton instance
export const storage = new StorageManager();
