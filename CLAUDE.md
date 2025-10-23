# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

> **⚠️ WASM BRANCH NOTICE**
>
> You are on the **`feature/wasm-mobile-offline`** branch.
>
> This branch implements a **client-side WASM architecture** that runs entirely in the browser, NOT the server-based architecture described below.
>
> **📱 For WASM branch documentation, see [CLAUDE-WASM.md](./CLAUDE-WASM.md)**
>
> **Key Differences:**
> - ❌ No Node.js/Express server
> - ❌ No FFmpeg (replaced with Web Audio API)
> - ❌ No whisper-cli.exe (replaced with Transformers.js WASM)
> - ✅ Runs offline on mobile (iOS/Android)
> - ✅ Progressive Web App (PWA)
> - ✅ Client-side audio processing
> - ✅ IndexedDB + Cache API storage
>
> The content below describes the **main branch** server-based architecture and is kept for reference and merge compatibility.

---

## Project Overview (Main Branch Architecture)

This is an offline speech-to-text web application that uses OpenAI's Whisper model via whisper.cpp. The application captures audio from the browser, sends it to a Node.js/Express server, and processes it through a local Whisper engine to generate transcripts entirely offline (no external API calls).

**Performance**: Transcribes **faster than real-time** (0.21x real-time factor) with GPU acceleration enabled.

**New Feature**: Includes automated form-filling for Home Health Agency (HHA) assessments. Users read a structured script, and the application automatically populates a 5-question assessment form based on the transcribed responses.

## Architecture

### Three-Layer System

1. **Frontend (public/)**: HTML5/JavaScript interface using MediaRecorder API
   - `index.html`: UI with record/stop buttons, transcript textarea, HHA assessment script display, and 5-question form
   - `app.js`: Handles microphone capture, records WebM audio, POSTs to server, parses transcriptions, and auto-fills form fields

2. **Backend (server.js)**: Express server with single `/transcribe` endpoint
   - Receives WebM audio via multipart upload (multer)
   - Validates audio duration (rejects clips <0.5s)
   - Converts audio to 16kHz mono WAV using FFmpeg with loudnorm filter
   - Invokes whisper-cli.exe with the local GGUF model
   - Returns transcript as JSON with detailed timing logs

3. **Whisper Engine (whisper_engine/)**: whisper.cpp v1.8.2 binaries
   - `whisper-cli.exe` (470KB): Command-line transcription executable (Oct 15, 2025 release)
   - `ggml-base.en.bin` (142MB): GGUF format Whisper model (base, English-only)
   - Required DLLs: `ggml.dll`, `ggml-base.dll`, `ggml-cpu.dll`, `whisper.dll`, `SDL2.dll`
   - **GPU acceleration enabled** with flash attention support

### Data Flow

```
Browser Mic → WebM Blob → POST /transcribe →
FFmpeg (convert to WAV + normalize) → whisper-cli.exe (transcribe with GPU) →
transcript.txt → JSON response → Display
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```
Installs express and multer (only two dependencies).

### 2. Download Whisper Model
The Whisper model file is not included in this repository due to GitHub's file size limits. Download it manually:

**Option A: Direct Download**
```bash
# Download ggml-base.en.bin (142MB, recommended)
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin -o whisper_engine/ggml-base.en.bin
```

**Option B: Manual Download**
1. Visit https://huggingface.co/ggerganov/whisper.cpp/tree/main
2. Download `ggml-base.en.bin` (142MB)
3. Place it in the `whisper_engine/` directory

**Alternative Models** (optional):
- `ggml-tiny.en.bin` (~75MB): Faster, less accurate
- `ggml-small.en.bin` (~466MB): Slower, more accurate

### 3. Start the Server
```bash
npm start
```
Starts Express server on http://localhost:3000. The frontend is accessible at this URL.

## Performance

### Actual Benchmarks (Intel i7-10710U, 16GB RAM)
- **10 seconds of audio** → 2.1 seconds processing time
- **Real-time factor**: 0.21x (processing is 4.7x faster than real-time)
- **Audio conversion (FFmpeg)**: ~250ms
- **Whisper transcription**: ~1.7s
- **Theoretical throughput**: 1 hour of audio → ~12.6 minutes processing

### Performance Optimizations Enabled
- GPU acceleration with CUDA/OpenCL (auto-detected)
- Flash attention for faster inference
- Multi-threading (auto-detects CPU cores, uses 12 threads on i7-10710U)
- Beam size 1 (greedy decoding for speed)
- No timestamp generation (speed optimization)
- Audio normalization for consistent results

## Important Technical Details

### Windows-Specific Configuration

- **FFmpeg Requirement**: FFmpeg must be installed and available on PATH for audio conversion
- **File Paths**: Uses Windows-style paths throughout; path.resolve() builds correct absolute paths
- **GPU Support**: Automatically detected and enabled if available (check console logs for confirmation)

### Audio Processing Pipeline

The server applies several preprocessing steps:
1. **Duration validation**: Rejects audio shorter than 0.5 seconds
2. **Loudness normalization**: FFmpeg `-af loudnorm` for consistent volume
3. **Resampling**: Converts to 16kHz mono WAV (Whisper requirement)

### Threading

- Server automatically detects CPU cores via `os.cpus().length` and uses all available cores for Whisper transcription (server.js:37)
- Thread count is passed to whisper-cli.exe via `-t` flag
- Example: i7-10710U (12 threads) uses all 12 threads

### Whisper CLI Optimization Flags

The server uses optimized flags for speed and accuracy (server.js:78-85):
- `--beam-size 1`: Greedy decoding for faster processing
- `--best-of 1`: Skip generating multiple candidates
- `--temperature 0.0`: Deterministic output for consistency
- `--no-timestamps`: Skip timestamp generation (speed boost)
- `-l en`: English language optimization

### Whisper CLI Output Handling

The server checks for transcript in multiple locations because different whisper.cpp builds handle the `-of` (output file) flag differently:

1. First checks: `${inputPath}.txt` (preferred, if -of worked)
2. Falls back to: `${wavPath}.txt` (common fallback in many builds)
3. Last resort: Parse stdout (some builds print transcript to stdout)

### Logging and Debugging

Detailed console logs track performance:
- File upload size and name
- Audio duration
- FFmpeg conversion time
- Whisper processing time
- Total processing time
- First 100 characters of transcript
- Whisper stderr output (model info, GPU status, warnings)

### File Cleanup

The server does NOT automatically delete temporary files in `uploads/`. Over time, this directory will accumulate .webm, .wav, and .txt files. Consider adding cleanup logic or periodically emptying the directory.

## Model Configuration

**Current model**: `ggml-base.en.bin` (GGUF format, English-only, 142MB)
- Source: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
- Format: GGUF (modern, optimized format - not old GGML)
- Language: English only
- Size: base (balanced speed/accuracy)

### Switching Models

To use a different Whisper model:
1. Download a GGUF-format model from Hugging Face (https://huggingface.co/ggerganov/whisper.cpp)
2. Place it in `whisper_engine/`
3. Update `modelPath` in server.js:76 to point to the new model file

**Available GGUF models** (English-only):
- `ggml-tiny.en.bin` (~75MB): Fastest, less accurate
- `ggml-base.en.bin` (~142MB): **Current - balanced** ✓
- `ggml-small.en.bin` (~466MB): Slower, more accurate
- `ggml-medium.en.bin` (~1.5GB): Very slow, highest accuracy

**Performance trade-off**: Larger models = more accurate but slower. For real-time use, base.en is recommended.

## Binary Updates

**Current version**: whisper.cpp v1.8.2 (Oct 15, 2025)

To update whisper.cpp binaries:
1. Download latest release from: https://github.com/ggml-org/whisper.cpp/releases
2. Extract the Windows ZIP file
3. Replace `whisper-cli.exe` and DLLs in `whisper_engine/`
4. Test to ensure compatibility with GGUF models

**Required DLLs** (v1.8.2):
- `ggml.dll` (~66KB)
- `ggml-base.dll` (~516KB)
- `ggml-cpu.dll` (~590KB)
- `whisper.dll` (~473KB)
- `SDL2.dll` (~2.4MB)

## Browser Compatibility

- Requires HTTPS or localhost for microphone access (browser security policy)
- MediaRecorder API with audio/webm support (works in Chrome, Edge, Firefox)
- Safari may require different MIME type handling

## Troubleshooting

### If transcription fails:
1. FFmpeg is installed: `ffmpeg -version`
2. whisper-cli.exe exists in whisper_engine/
3. Model file (ggml-base.en.bin) exists in whisper_engine/
4. Required DLLs are present in whisper_engine/
5. Check server console output for specific error messages

### If transcription is slow or inaccurate:
1. Check console logs for GPU status: `use gpu = 1` means GPU is enabled
2. Verify GGUF model format (not old GGML)
3. Ensure whisper.cpp version is v1.7.0+ for GGUF support
4. Check if flash attention is enabled: `flash attn = 1`
5. Monitor thread count - should match CPU cores

### If you see gibberish transcripts:
- This indicates incompatible whisper-cli.exe and model format
- Old binaries (<v1.7.0) don't support GGUF models properly
- Solution: Upgrade to whisper.cpp v1.8.0+

### Common Issues:
- **Audio too short error**: Recording must be at least 0.5 seconds
- **No transcript file produced**: Check whisper stderr logs for model loading errors
- **Slow processing**: Verify GPU acceleration is enabled in logs
- **DLL not found errors**: Ensure all 5 DLLs are in whisper_engine/

## HHA Assessment Form-Filling Feature

### Overview
The application includes automated form-filling for Home Health Agency (HHA) assessments. Users follow a structured script during recording, and the application automatically populates a 5-question assessment form based on keyword detection in the transcribed text.

### Feature Components

**1. Script Display (index.html)**
- Collapsible script section showing the HHA assessment template
- Users read this script during recording to ensure proper keyword detection
- Click header to expand/collapse script view

**2. Assessment Form (index.html)**
- **Q1-Q4**: Radio buttons for Yes/No responses
  - Q1: Beneficiary admitted directly from acute/post-acute facility
  - Q2: Certification and F2F encounter by same physician
  - Q3: HHA-generated records signed, dated, and incorporated
  - Q4: Structural impairment present
- **Q5**: Checkboxes for affected domains (conditional on Q4=Yes)
  - Domains: Mobility, Self-care, Communication, Cognition, Sensory
- Green highlighting and "Auto-filled" badges indicate auto-detected responses
- All fields remain manually editable

**3. Parsing Logic (app.js)**
- `parseHHATranscription()`: Keyword-based detection using simple string matching
- `extractDomains()`: Extracts domain keywords from transcript text
- `parseAndFillHHAForm()`: Populates form fields with detected values
- `updateQ5State()`: Enables/disables Q5 based on Q4 answer

### Keyword Detection Rules

**Q1 Detection:**
- "was admitted" → Yes
- "was not admitted" → No

**Q2 Detection:**
- "were performed by the same" → Yes
- "were not performed by the same" → No

**Q3 Detection:**
- "we do have" → Yes
- "we do not have" → No

**Q4 Detection:**
- "there is a structural impairment" → Yes
- "there is no structural impairment" → No

**Q5 Detection (only if Q4 = Yes):**
- Searches for domain keywords: "mobility", "self-care", "communication", "cognition", "sensory"
- Looks in section after "affects the following domains" or scans entire transcript
- Checks all matching domains in form

### User Flow

1. User views the HHA assessment script on page
2. User clicks "Record" and reads the script aloud, selecting [was/was not], [were/were not], [do/do not], [is/is no] options
3. User clicks "Stop & Transcribe"
4. Transcript appears in textarea
5. Form auto-fills with detected responses (green highlighting + badges)
6. User reviews and manually edits any fields as needed
7. Q5 automatically enables/disables based on Q4 selection

### Example Script Usage

**Full Script:**
```
"I will now provide the assessment information for this patient. Regarding admission,
the beneficiary was admitted to our home health agency directly from an acute care
facility. For the certification process, the home health certification and face-to-face
encounter were performed by the same physician. Concerning documentation, we do have
HHA-generated records that have been signed, dated, and incorporated into the certifying
physician's records. As for functional status, there is a structural impairment present.
The structural impairment affects the following domains: mobility, self-care, and cognition."
```

**Expected Form Population:**
- Q1: Yes (detected "was admitted")
- Q2: Yes (detected "were performed by the same")
- Q3: Yes (detected "we do have")
- Q4: Yes (detected "there is a structural impairment")
- Q5: Mobility, Self-care, Cognition checked (detected all three keywords)

### Technical Notes

- **Client-side parsing**: All form-filling logic runs in the browser (no server changes)
- **Fuzzy matching**: Not implemented - relies on exact phrase matching for reliability
- **Case-insensitive**: All text converted to lowercase before matching
- **Conditional logic**: Q5 only enabled when Q4 = "Yes" (enforced via JavaScript event listeners)
- **Manual override**: All auto-filled values can be changed by clicking different options
- **Visual feedback**: Auto-filled questions show green border and badge
- **No persistence**: Form data is not saved (demo/review only)

### Troubleshooting HHA Feature

**Form not auto-filling:**
1. Open browser DevTools (F12) → Console tab
2. Look for `Parsed HHA responses:` log entry
3. Check which fields were detected (null = not detected)
4. Verify your speech matched the expected phrases exactly

**Wrong answers detected:**
- Ensure you spoke the exact phrases from the script
- Check transcript textarea to see what Whisper transcribed
- Manually correct any incorrect auto-filled values

**Q5 not enabling:**
- Q5 only enables when Q4 is set to "Yes"
- If Q4 auto-filled as "No", manually change it to "Yes" to enable Q5

**Domains not detected in Q5:**
- Verify you said "affects the following domains: [domain list]"
- Check transcript for correct domain spellings
- Manually check any missing domains in the form
