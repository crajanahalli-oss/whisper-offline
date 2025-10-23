# Whisper Offline Speech-to-Text

An offline speech-to-text web application using OpenAI's Whisper model via whisper.cpp. Transcribe audio **faster than real-time** (0.21x real-time factor) with GPU acceleration, entirely offline with no external API calls.

> **📱 Mobile WASM Branch Available**: Check out the `feature/wasm-mobile-offline` branch for a browser-only WASM implementation that works on iOS/Android. See [CLAUDE-WASM.md](./CLAUDE-WASM.md) for details.

## Features

- **Fully Offline**: No internet required after setup
- **Fast Processing**: ~2 seconds for 10 seconds of audio (4.7x faster than real-time)
- **GPU Accelerated**: Automatic CUDA/OpenCL detection
- **Simple Interface**: Record directly in your browser
- **Privacy Focused**: All processing happens locally on your machine
- **HHA Assessment Form**: Automated form-filling for Home Health Agency assessments with script-based voice recording

## Quick Start

### Prerequisites

- **Node.js** (v14 or higher)
- **FFmpeg** installed and on PATH ([download here](https://ffmpeg.org/download.html))
- Windows 11 (binaries included for Windows; other platforms need whisper.cpp compilation)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/crajanahalli-oss/whisper-offline.git
cd whisper-offline
```

2. **Install dependencies**
```bash
npm install
```

3. **Download Whisper model**
```bash
# Download ggml-base.en.bin (142MB, recommended)
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin -o whisper_engine/ggml-base.en.bin
```

Or manually download from [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp/tree/main) and place in `whisper_engine/`

4. **Start the server**
```bash
npm start
```

5. **Open your browser** to http://localhost:3000

## Usage

### Basic Transcription
1. Click **Record** to start capturing audio
2. Speak into your microphone
3. Click **Stop & Transcribe** to process
4. View the transcript in the text area

### HHA Assessment Form-Filling
1. Read the **Home Health Agency Assessment Script** displayed on the page
2. Click **Record** and speak following the script format
3. Click **Stop & Transcribe** to process
4. The form automatically fills with detected answers:
   - Q1-Q4: Yes/No responses
   - Q5: Affected domains (Mobility, Self-care, Communication, Cognition, Sensory)
5. Review and manually edit any fields as needed
6. Transcript is displayed alongside the form for reference

**Example Script:**
```
"I will now provide the assessment information for this patient. Regarding admission,
the beneficiary was admitted to our home health agency directly from an acute care
facility. For the certification process, the home health certification and face-to-face
encounter were performed by the same physician. Concerning documentation, we do have
HHA-generated records that have been signed, dated, and incorporated into the certifying
physician's records. As for functional status, there is a structural impairment present.
The structural impairment affects the following domains: mobility, self-care, and cognition."
```

## Architecture

- **Frontend**: HTML5 + MediaRecorder API for browser audio capture
- **Backend**: Express server with FFmpeg preprocessing
- **Engine**: whisper.cpp v1.8.2 with GGUF model support

## Performance Benchmarks

**Intel i7-10710U, 16GB RAM:**
- 10 seconds of audio → 2.1 seconds processing time
- Real-time factor: 0.21x (processing is 4.7x faster than real-time)
- Theoretical throughput: 1 hour of audio → ~12.6 minutes

## Model Options

- `ggml-tiny.en.bin` (~75MB): Fastest, less accurate
- `ggml-base.en.bin` (~142MB): **Recommended** - balanced speed/accuracy
- `ggml-small.en.bin` (~466MB): Slower, more accurate
- `ggml-medium.en.bin` (~1.5GB): Very slow, highest accuracy

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed technical documentation, troubleshooting, and advanced configuration.

## License

ISC

## Credits

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) by Georgi Gerganov
- [OpenAI Whisper](https://github.com/openai/whisper) model
