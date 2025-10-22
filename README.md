# Whisper Offline Speech-to-Text

An offline speech-to-text web application using OpenAI's Whisper model via whisper.cpp. Transcribe audio **faster than real-time** (0.21x real-time factor) with GPU acceleration, entirely offline with no external API calls.

## Features

- **Fully Offline**: No internet required after setup
- **Fast Processing**: ~2 seconds for 10 seconds of audio (4.7x faster than real-time)
- **GPU Accelerated**: Automatic CUDA/OpenCL detection
- **Simple Interface**: Record directly in your browser
- **Privacy Focused**: All processing happens locally on your machine

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

1. Click **Record** to start capturing audio
2. Speak into your microphone
3. Click **Stop & Transcribe** to process
4. View the transcript in the text area

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
