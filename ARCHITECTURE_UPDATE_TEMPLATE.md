# Architecture Walkthrough Update Template

**Instructions**: Copy this template, fill out only the sections that apply to your changes, and provide it to Claude Code. Delete/skip any sections that don't apply.

---

## 1. UPDATE OVERVIEW

**Date**: [Date of changes]

**Phase/Version**: [e.g., Phase 7, v2.0, etc.]

**Update Type** (check all that apply):
- [ ] New Feature
- [ ] Module Refactor
- [ ] Performance Improvement
- [ ] Bug Fix / Architecture Change
- [ ] New Dependency
- [ ] Removed Dependency
- [ ] API Change
- [ ] Documentation Only

**Summary** (1-2 sentences):
[Brief description of what changed and why]

---

## 2. AFFECTED MODULES

**Which modules were modified?** (check all that apply):
- [ ] app.js (Main Controller)
- [ ] audio-processor.js (Audio Processing)
- [ ] transcriber.js (Main Thread Interface)
- [ ] transcriber-worker.js (Background Thread)
- [ ] storage-manager.js (Persistence Layer)
- [ ] index.html (UI)
- [ ] New module: [name]
- [ ] Other: [specify]

---

## 3. EXECUTIVE SUMMARY UPDATES

**Does the Executive Summary need updates?** [ ] Yes / [ ] No

If yes, provide updates for:

**Key Features** (add/modify/remove):
```
- [Feature description]
```

**Technology Stack** (add/modify/remove):
```
- [Technology name and purpose]
```

---

## 4. HIGH-LEVEL DATA FLOW CHANGES

**Did the data flow change?** [ ] Yes / [ ] No

If yes, describe the new flow or modifications:
```
[Describe new steps, modified steps, or removed steps]
Example:
- NEW: After audio processing, data is now cached in IndexedDB
- MODIFIED: transcriber.js now batches requests
- REMOVED: Storage manager no longer saves temporary files
```

---

## 5. MODULE-SPECIFIC UPDATES

### Module: [Name of module]

**Section to Update**: [e.g., "Architecture", "Key Implementation Decisions", etc.]

**Action**: [ ] Add new section / [ ] Modify existing / [ ] Remove section

**New/Updated Content**:
```
[Paste the new content here, formatted in markdown]

Example:
#### Architecture:

**New Properties:**
- `cacheEnabled` - Controls IndexedDB caching
- `maxCacheSize` - Maximum cache size in MB

**New Methods:**
- `clearCache()` - Clears all cached data
```

**Code Examples** (if applicable):
```javascript
// Paste code example here
```

**Why This Change Was Made**:
```
[Explain the reasoning/decision]
Example:
- **Problem**: Users reported slow repeated transcriptions
- **Solution**: Cache processed audio to avoid reprocessing
- **Benefit**: 3x faster for repeated content
```

---

## 6. NEW TECHNICAL DECISIONS

**Did you make any new architectural decisions?** [ ] Yes / [ ] No

If yes, add new decision sections:

### Decision: [Title]

**Problem**:
```
[What problem needed solving?]
```

**Alternatives Considered**:
```
1. [Option 1] - [Why rejected]
2. [Option 2] - [Why rejected]
3. [Option 3 - Chosen] - [Why chosen]
```

**Solution/Implementation**:
```javascript
// Code example showing the solution
```

**Trade-offs Accepted**:
```
- [+] Benefit 1
- [+] Benefit 2
- [-] Drawback 1
- [-] Drawback 2
```

---

## 7. PERFORMANCE UPDATES

**Did performance characteristics change?** [ ] Yes / [ ] No

If yes, provide updated benchmarks:

**Timing Breakdown** (replace old values):
```
Operation:              Old Time    New Time
─────────────────────────────────────────────
[Operation name]:       [X]s        [Y]s
[Operation name]:       [X]s        [Y]s
Total:                  [X]s        [Y]s
```

**Model Performance** (if model changed):
```
| Model | Size | Download | Inference (10s audio) |
|-------|------|----------|---------------------|
| model-name | XXX MB | ~XXs | ~X-Ys |
```

---

## 8. NEW/UPDATED DIAGRAMS

**Do any diagrams need updates?** [ ] Yes / [ ] No

If yes:

**Diagram Location**: [e.g., "High-Level Data Flow", "Component Architecture"]

**Action**: [ ] Replace entirely / [ ] Add new step / [ ] Modify step / [ ] Remove step

**Updated Diagram**:
```
[Provide the new diagram in text/markdown format]
Example:
**Layer 7: New Caching Layer** - `cache-manager.js`
- In-memory LRU cache
- Cache invalidation logic
- Size management
```

---

## 9. INTEGRATION FLOW UPDATES

**Did the step-by-step integration flow change?** [ ] Yes / [ ] No

If yes, specify which steps:

**Step [Number]: [Title]**

**Action**: [ ] Add new step / [ ] Modify step / [ ] Remove step / [ ] Renumber steps

**Updated Content**:
```
[Provide the updated step content]
```

---

## 10. DEPENDENCIES UPDATES

**Were dependencies added, removed, or updated?** [ ] Yes / [ ] No

If yes:

**Added Dependencies**:
```
- **Name**: [package@version]
  - **Purpose**: [What it does]
  - **Size**: [KB/MB]
  - **Used in**: [Which file(s)]
  - **Why**: [Reason for adding]
```

**Removed Dependencies**:
```
- **Name**: [package@version]
  - **Why Removed**: [Reason]
  - **Replaced By**: [New solution, or "None"]
```

**Updated Dependencies**:
```
- **Name**: [package]
  - **Old Version**: [X.Y.Z]
  - **New Version**: [X.Y.Z]
  - **Breaking Changes**: [Yes/No - describe if yes]
  - **Why Updated**: [Reason]
```

---

## 11. JAVASCRIPT HOOKS UPDATES

**Were new hooks added or existing ones modified?** [ ] Yes / [ ] No

If yes:

**New Hooks**:
```
| Hook Type | Location | Purpose |
|-----------|----------|---------|
| [Type] | [file:line] | [Description] |
```

**Modified Hooks**:
```
| Hook Type | Old Location | New Location | What Changed |
|-----------|--------------|--------------|--------------|
| [Type] | [file:line] | [file:line] | [Change description] |
```

**Removed Hooks**:
```
| Hook Type | Location | Why Removed |
|-----------|----------|-------------|
| [Type] | [file:line] | [Reason] |
```

---

## 12. CODE EXAMPLES TO UPDATE/ADD

**Are there code examples that need updating?** [ ] Yes / [ ] No

If yes:

**Location in Document**: [Section name or line number]

**Action**: [ ] Replace code / [ ] Add new code / [ ] Remove code

**Old Code** (if replacing):
```javascript
// Paste old code here
```

**New Code**:
```javascript
// Paste new code here
```

**Explanation of Changes**:
```
[Explain what changed and why]
```

---

## 13. REMOVED FEATURES/SECTIONS

**Were any features or sections removed?** [ ] Yes / [ ] No

If yes:

**Section to Remove**: [Section name or location]

**Reason for Removal**:
```
[Why was this removed?]
Example:
- Feature deprecated in Phase 7
- Replaced by new implementation
- No longer relevant to architecture
```

---

## 14. ADDITIONAL NOTES

**Any other information Claude Code should know?**
```
[Free-form notes, warnings, special instructions, etc.]

Examples:
- Be careful to preserve the explanation in Module 3 about lazy initialization
- The new code uses async/await instead of promises - update all examples
- Make sure to mention this is breaking change from v1.x
```

---

## 15. VERIFICATION CHECKLIST

After making updates, verify:
- [ ] All module sections are consistent with changes
- [ ] Code examples compile/make sense
- [ ] Performance numbers are updated
- [ ] Dependencies list is current
- [ ] No broken references to removed features
- [ ] PDF regenerates without errors
- [ ] All diagrams render correctly

---

## EXAMPLE USAGE

Here's a quick example of how to fill this out:

```markdown
## 1. UPDATE OVERVIEW

**Date**: November 1, 2025
**Phase/Version**: Phase 7 - PWA Features
**Update Type**:
- [x] New Feature
- [x] New Dependency

**Summary**: Added service worker for offline app caching and implemented PWA manifest for mobile installation.

## 2. AFFECTED MODULES
- [x] New module: service-worker.js
- [x] index.html (UI)

## 5. MODULE-SPECIFIC UPDATES

### Module: service-worker.js (NEW)

**Section to Update**: Add new module section after storage-manager.js

**Action**: [x] Add new section

**New/Updated Content**:
### Module 6: service-worker.js (Service Worker)

**Location**: `C:\Users\Chinmay\Projects\whisper-offline\public\service-worker.js`
**Lines**: 150
**Role**: Cache application assets for offline use

#### Architecture:

**Caching Strategy:**
- Cache-first for app files (HTML, JS, CSS)
- Network-first for API calls
- Stale-while-revalidate for models

**Cached Assets:**
- All JavaScript modules
- HTML and CSS files
- Icons and images

[etc...]
```

---

**INSTRUCTIONS FOR CLAUDE CODE**:

When you receive this completed template:

1. Read through all sections marked with [x] or filled content
2. Locate the corresponding sections in `architecture-walkthrough.md`
3. Make the specified updates (add/modify/remove content)
4. Ensure consistency across all related sections
5. Run: `npx md-to-pdf architecture-walkthrough.md`
6. Verify the PDF renders correctly
7. Report what was changed and confirm completion

---

**SAVE THIS TEMPLATE**: Keep this file in your repo for future reference!
