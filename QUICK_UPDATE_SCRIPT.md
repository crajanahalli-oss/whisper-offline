# Quick Architecture Update Script

**Use this for simple, minor updates. For major changes, use `ARCHITECTURE_UPDATE_TEMPLATE.md`**

---

## QUICK UPDATE FORMAT

Copy and fill out:

```
UPDATE: [What changed in 1 sentence]

LOCATION: [Section name or module]

ACTION: [Replace/Add/Remove]

OLD CONTENT (if replacing):
"""
[Paste old content between triple quotes]
"""

NEW CONTENT:
"""
[Paste new content between triple quotes]
"""

WHY: [Brief reason]
```

---

## EXAMPLES

### Example 1: Update Performance Numbers

```
UPDATE: Processing time improved due to optimization

LOCATION: Performance Characteristics > Timing Breakdown

ACTION: Replace

OLD CONTENT:
"""
Audio processing:       0.25s
Transcription:          4s
Total:                  ~15s
"""

NEW CONTENT:
"""
Audio processing:       0.15s
Transcription:          3s
Total:                  ~13s
"""

WHY: Implemented caching in audio processor
```

### Example 2: Add New Function to Module

```
UPDATE: Added clearCache() method to storage-manager.js

LOCATION: Module 5: storage-manager.js > Architecture > Methods

ACTION: Add

NEW CONTENT:
"""
- Cache Management: `clearModelCache()`, `clearAllData()`, `getStorageEstimate()`
"""

WHY: Users need ability to free up storage space
```

### Example 3: Update Dependency Version

```
UPDATE: Upgraded Transformers.js to v3.0.0

LOCATION: Dependencies > Runtime Dependencies

ACTION: Replace

OLD CONTENT:
"""
**1. @xenova/transformers@2.17.2**
"""

NEW CONTENT:
"""
**1. @xenova/transformers@3.0.0**
- **Breaking Change**: New import syntax required
- **New Feature**: WebGPU support for 2x faster inference
"""

WHY: Better performance and GPU support on desktop
```

### Example 4: Add New Code Example

```
UPDATE: Show example of error handling in transcriber

LOCATION: Module 3: transcriber.js > Key Implementation Decisions > (after Progress Delegation Pattern)

ACTION: Add

NEW CONTENT:
"""
##### 5. Error Retry Pattern

```javascript
async transcribe(audio, options = {}) {
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this._attemptTranscribe(audio, options);
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
      }
    }
  }

  throw lastError;
}
```

**Why retry pattern?**
- Network issues during model download
- Temporary worker failures
- Memory pressure on mobile devices

**Benefits**:
- Improves reliability
- Better user experience (automatic recovery)
- Exponential backoff prevents hammering
"""

WHY: Users reported intermittent failures on slow networks
```

### Example 5: Remove Outdated Section

```
UPDATE: Removed manual FFmpeg instructions

LOCATION: Module 2: audio-processor.js > Alternatives Considered

ACTION: Remove

OLD CONTENT:
"""
**Alternative considered**: Manual resampling with interpolation
[entire section about manual implementation]
"""

WHY: No longer relevant since we use Web Audio API
```

---

## BATCH UPDATES

For multiple small changes, list them all:

```
BATCH UPDATE: Phase 7 minor fixes

1. UPDATE: Model default changed to distil-small
   LOCATION: Module 4 > SDK Integration > Supported Models
   ACTION: Replace
   OLD: const DEFAULT_MODEL = 'Xenova/whisper-tiny.en';
   NEW: const DEFAULT_MODEL = 'distil-whisper/distil-small.en';

2. UPDATE: Added WebGPU mention
   LOCATION: Performance Characteristics > Model Performance Comparison
   ACTION: Add note
   NEW: "Note: With WebGPU enabled, inference is 2-3x faster on desktop"

3. UPDATE: Fixed typo
   LOCATION: Module 1 > Recording State Management
   ACTION: Replace
   OLD: "no `new WhisperTranscriber()` needed"
   NEW: "no `new MediaRecorder()` duplication"
```

---

## INSTRUCTIONS FOR CLAUDE CODE

When you receive a quick update:
1. Locate the exact section mentioned
2. Apply the action (Replace/Add/Remove)
3. Regenerate PDF: `npx md-to-pdf architecture-walkthrough.md`
4. Confirm: "Updated [LOCATION] - [ACTION] completed"

---

**TIP**: For complex updates with multiple modules affected, use the full `ARCHITECTURE_UPDATE_TEMPLATE.md` instead!
