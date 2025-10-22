# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an offline speech-to-text web application that uses OpenAI's Whisper model via whisper.cpp. The application captures audio from the browser, sends it to a Node.js/Express server, and processes it through a local Whisper engine to generate transcripts entirely offline (no external API calls).

**Performance**: Transcribes **faster than real-time** (0.21x real-time factor) with GPU acceleration enabled.

## Architecture

### Three-Layer System

1. **Frontend (public/)**: Simple HTML5/JavaScript interface using MediaRecorder API
   - `index.html`: UI with record/stop buttons and transcript textarea
   - `app.js`: Handles microphone capture, records WebM audio, and POSTs to server

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
