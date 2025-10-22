/**
 * Minimal Express server that:
 *  1) Serves the static front-end (index.html + app.js)
 *  2) Accepts uploaded mic audio (WebM) via /transcribe
 *  3) Uses FFmpeg to convert to 16 kHz mono WAV
 *  4) Invokes whisper.cpp's CLI (whisper-cli.exe) with your local model
 *  5) Reads the generated transcript and returns it as JSON
 *
 * Requirements (one-time on Windows 11):
 *  - FFmpeg must be on PATH (ffmpeg -version should print)
 *  - whisper_engine\whisper-cli.exe (or main.exe) must exist
 *  - whisper_engine\ggml-small.en.bin (or any supported model) must exist
 */

import express from "express";           // web server framework
import multer from "multer";             // handles multipart/form-data (file uploads)
import { promisify } from "util";        // to turn callback-style exec into a promise
import { exec } from "child_process";    // to run ffmpeg and whisper-cli as shell commands
import path from "path";                 // path utilities (builds correct Windows paths)
import fs from "fs";                     // read transcript output file
import os from "os";                     // to detect CPU cores for threading

// Ensure whisper-cli can find its MinGW/MSYS2 runtime DLLs when spawned by Node
process.env.PATH = "C:\\msys64\\mingw64\\bin;" + process.env.PATH;

const app = express();
const port = 3000;

// Multer saves the uploaded audio into ./uploads/ with a random filename
const upload = multer({ dest: "uploads/" });

// Promisified exec so we can 'await' shell commands easily
const sh = promisify(exec);

// Use up to 8 threads by default (tweak as you like)
// const THREADS = Math.min((os.cpus()?.length ?? 4), 8);
const THREADS = Math.max(1, os.cpus().length);

// Serve files from ./public (index.html, app.js, etc.)
app.use(express.static("public"));

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.file) return res.status(400).json({ error: "No audio uploaded" });

    const inputPath = req.file.path;      // e.g., uploads\abcd.webm
    const wavPath   = `${inputPath}.wav`; // e.g., uploads\abcd.webm.wav

    console.log(`[TRANSCRIBE] Started processing: ${req.file.originalname} (${req.file.size} bytes)`);

    // First, check audio duration to avoid processing very short/invalid clips
    const probecmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
    const { stdout: durationStr } = await sh(probecmd);
    const duration = parseFloat(durationStr);

    if (isNaN(duration) || duration < 0.5) {
      return res.status(400).json({ error: "Audio too short (minimum 0.5 seconds)" });
    }

    console.log(`[TRANSCRIBE] Audio duration: ${duration.toFixed(2)}s`);

    // Convert browser WebM → 16k mono WAV with audio normalization
    // -af loudnorm: Normalize audio levels for consistent volume
    // -ar 16000: Resample to 16kHz (Whisper requirement)
    // -ac 1: Convert to mono
    const conversionStart = Date.now();
    const ff = `ffmpeg -y -i "${inputPath}" -af loudnorm -ar 16000 -ac 1 -f wav "${wavPath}"`;
    await sh(ff);
    console.log(`[TRANSCRIBE] Audio conversion took ${Date.now() - conversionStart}ms`);

    // Build whisper command
    const whisperBin = path.resolve("whisper_engine", "whisper-cli.exe");
    // Using GGUF base.en model for balanced speed and accuracy
    // Other options: ggml-tiny.en.bin (faster, less accurate), ggml-small.en.bin (slower, more accurate)
    const modelPath  = path.resolve("whisper_engine", "ggml-base.en.bin");

    // Optimized whisper command with performance and accuracy flags
    // --beam-size 1: Faster processing (greedy decoding)
    // --best-of 1: Don't generate multiple candidates
    // --temperature 0.0: More deterministic/accurate output
    // --no-timestamps: Skip timestamp generation for speed
    const cmd = `"${whisperBin}" -m "${modelPath}" -f "${wavPath}" -t ${THREADS} -l en ` +
      `--beam-size 1 --best-of 1 --temperature 0.0 ` +
      `-otxt -of "${inputPath}" --no-timestamps`;

    // Run whisper and capture stdout/stderr (some builds print transcript to stdout)
    console.log(`[TRANSCRIBE] Running Whisper with ${THREADS} threads...`);
    const whisperStart = Date.now();
    const { stdout = "", stderr = "" } = await sh(cmd).catch(err => {
      console.error("[WHISPER ERROR]", err.stderr || err.stdout || err.message);
      throw new Error(`whisper failed: ${err.stderr || err.stdout || err.message}`);
    });
    console.log(`[TRANSCRIBE] Whisper processing took ${Date.now() - whisperStart}ms`);

    // Log stderr if present (warnings, model info, etc.)
    if (stderr.trim()) {
      console.log("[WHISPER STDERR]", stderr.slice(0, 500)); // Log first 500 chars
    }

    // Preferred output path (if -of worked)
    const outTxtA = `${inputPath}.txt`;
    // Fallback many builds use: <wav>.txt (if -of not supported/ignored)
    const outTxtB = `${wavPath}.txt`;

    let transcript = "";
    if (fs.existsSync(outTxtA)) {
      transcript = fs.readFileSync(outTxtA, "utf8").trim();
    } else if (fs.existsSync(outTxtB)) {
      transcript = fs.readFileSync(outTxtB, "utf8").trim();
    } else if (stdout.trim()) {
      // Last resort: some builds print the transcript to stdout
      transcript = stdout.trim();
    } else {
      // Give a helpful error if we still didn't find anything
      throw new Error(
        "No transcript file produced. Looked for: " + outTxtA + " and " + outTxtB
      );
    }

    const totalTime = Date.now() - startTime;
    console.log(`[TRANSCRIBE] Success! Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
    console.log(`[TRANSCRIBE] Transcript: "${transcript.slice(0, 100)}${transcript.length > 100 ? '...' : ''}"`);

    res.json({ text: transcript });
  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error("[TRANSCRIBE ERROR]", err);
    console.error(`[TRANSCRIBE] Failed after ${totalTime}ms`);
    res.status(500).json({ error: String(err) });
  }
});

// Start the HTTP server and print the local URL
app.listen(port, () => {
  console.log(`Whisper offline test running at http://localhost:${port}`);
});
