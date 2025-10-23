# CLAUDE-WASM.md

This file documents the WASM-based mobile offline implementation on the `feature/wasm-mobile-offline` branch.

## Branch Overview

**Branch**: `feature/wasm-mobile-offline`
**Status**: Phase 3 Complete - Hybrid Storage Implemented
**Goal**: Convert server-based architecture to client-side WASM for mobile offline PWA support

## Current Capabilities (Phase 3)

### ✅ Hybrid Storage System

The application now includes a complete hybrid storage architecture combining Cache API and IndexedDB:

**Storage Manager** (`public/storage-manager.js`):
- **Cache API**: For Whisper model files and app assets (managed by Transformers.js + Service Worker)
- **IndexedDB**: For metadata, user data, and application state

### Features Implemented

**1. Model Metadata Management**
- Save model information (name, version, size, download date)
- Track last used timestamp
- Retrieve model metadata
- Support for multiple models

**2. Assessment Storage**
- Save HHA assessment form data
- Store transcriptions with form responses
- Optional audio blob storage
- Sync status tracking (for future cloud sync)
- Auto-increment ID generation
- Filter unsynced assessments
- Delete old assessments (configurable age)

**3. Settings Management**
- Save user preferences
- Retrieve individual settings with defaults
- Get all settings as object
- Settings persist across sessions

**4. Storage Management**
- Storage quota monitoring (usage/quota/percentage)
- Clear model cache functionality
- Clear all data (nuclear option)
- Storage breakdown by category
- Export assessments as JSON

**5. Testing Infrastructure**
- Comprehensive test suite (`public/storage-test.html`)
- Visual test results with success/error indicators
- Real-time console logging
- All 7 test sections passing

### Technical Details

**Dependencies (CDN-based)**:
- `idb@8` - IndexedDB wrapper (via CDN: https://cdn.jsdelivr.net/npm/idb@8/+esm)
- `@xenova/transformers@2.17.2` - WASM Whisper (not yet integrated)
- `workbox@7.0.0` - Service Worker utilities (not yet integrated)

**IndexedDB Schema** (v1):
```javascript
Database: hha-assessment
Stores:
  - models (keyPath: 'name')
  - assessments (keyPath: 'id', autoIncrement: true)
    - Indexes: timestamp, synced
  - settings (keyPath: 'key')
  - recordings (keyPath: 'id', autoIncrement: true)
```

**Cache API**:
```javascript
Cache: whisper-models-v1
Purpose: Store Whisper ONNX models and WASM files
```

### Storage Manager API

**Initialization**:
```javascript
import { storage } from './storage-manager.js';
await storage.init();
```

**Model Metadata**:
```javascript
// Save
await storage.saveModelMetadata({
  name: 'whisper-base.en',
  version: '1.0.0',
  sizeBytes: 180000000
});

// Retrieve
const model = await storage.getModelMetadata('whisper-base.en');

// Update last used
await storage.updateModelLastUsed('whisper-base.en');
```

**Assessments**:
```javascript
// Save
const id = await storage.saveAssessment({
  transcription: "The beneficiary was admitted...",
  formData: { q1: 'yes', q2: 'yes', ... }
});

// Retrieve all
const all = await storage.getAllAssessments();

// Get unsynced
const unsynced = await storage.getUnsyncedAssessments();

// Mark as synced
await storage.markAssessmentSynced(id);

// Delete old (30+ days)
await storage.deleteOldAssessments(30);
```

**Settings**:
```javascript
// Save
await storage.saveSetting('modelSize', 'base');

// Retrieve with default
const size = await storage.getSetting('modelSize', 'tiny');

// Get all
const settings = await storage.getAllSettings();
```

**Storage Management**:
```javascript
// Get quota info
const estimate = await storage.getStorageEstimate();
console.log(`Using ${estimate.usageGB} GB of ${estimate.quotaGB} GB`);

// Storage breakdown
const breakdown = await storage.getStorageBreakdown();

// Export
const json = await storage.exportAssessments();

// Clear
await storage.clearModelCache();
await storage.clearAllData();
```

## Differences from Main Branch

| Feature | Main Branch | WASM Branch |
|---------|-------------|-------------|
| **Server** | Node.js/Express required | No server needed (static files) |
| **Storage** | None (ephemeral) | IndexedDB + Cache API |
| **Model** | Local GGUF file | Will use ONNX via WASM |
| **Audio Processing** | FFmpeg (server) | Will use Web Audio API (browser) |
| **Transcription** | whisper-cli.exe | Will use Transformers.js (WASM) |
| **Offline** | Requires local server | True offline PWA |
| **Mobile** | Desktop only | iOS/Android compatible |
| **Data Persistence** | None | Full offline data storage |

## Next Phases

### Phase 4: Audio Processing (Not Started)
- Create `audio-processor.js`
- Replace FFmpeg with Web Audio API
- Browser-based audio conversion (WebM → 16kHz mono)
- Client-side loudness normalization

### Phase 5: WASM Transcription (Not Started)
- Create `transcriber.js` (Web Worker)
- Integrate Transformers.js
- Load Whisper model from Cache API
- Connect to storage manager

### Phase 6: PWA Configuration (Not Started)
- Create `manifest.json`
- Create `service-worker.js`
- Add offline caching
- iOS/Android install support

### Phase 7-12: Testing, Optimization, Documentation, Deployment

## Testing

**Run Storage Tests**:
1. Start server: `npm run serve`
2. Open: http://localhost:3000/storage-test.html
3. Click "Initialize Storage"
4. Run all tests (should see green ✅ for all)

## Known Issues & Limitations

**Current Phase**:
- ✅ All storage tests passing
- ✅ CDN-based module loading works
- ✅ IndexedDB schema tested and verified

**Future Considerations**:
- Model files will be large (~180MB) - first download will be slow
- Browser storage quotas vary (iOS Safari ~1GB, Chrome ~60% of disk)
- WASM performance slower than native but still faster than real-time

## Development Notes

**Module Resolution**:
- Using CDN imports for browser compatibility
- `import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm'`
- Future: May bundle with Vite/esbuild for production

**Storage Strategy**:
- Cache API managed by Transformers.js (automatic)
- IndexedDB managed by storage-manager.js (manual)
- Separation of concerns: models vs. user data

**Browser Compatibility**:
- Tested: Chrome (desktop)
- To test: Safari (iOS), Chrome (Android), Firefox

## Files Added/Modified (Phase 3)

**New Files**:
- `public/storage-manager.js` - Hybrid storage implementation
- `public/storage-test.html` - Test suite
- `WASM-IMPLEMENTATION-PLAN.md` - Overall plan
- `CLAUDE-WASM.md` - This file

**Modified Files**:
- `package.json` - Added WASM dependencies
- `package-lock.json` - Dependency lock file

**Unchanged** (from main branch):
- `public/index.html` - HHA form interface
- `public/app.js` - Frontend logic (will be modified in Phase 5)
- `server.js` - Kept for backward compatibility
- All whisper_engine files

## How to Switch Between Branches

**Switch to WASM branch**:
```bash
git checkout feature/wasm-mobile-offline
npm install
npm run serve
```

**Switch back to main**:
```bash
git checkout main
npm start
```

## Future Integration Plan

When WASM branch is complete, the main branch application and WASM branch can coexist:
- **Desktop users**: Use main branch (faster, native binaries)
- **Mobile users**: Use WASM branch (works offline, PWA installable)
- **Or**: Merge WASM into main and deprecate server-based approach

Decision will be made in Phase 12.
