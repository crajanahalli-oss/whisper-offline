// Simple front-end controller for recording mic audio and
// posting it to the server. The server does the Whisper work.

let mediaRecorder;      // browser MediaRecorder instance (handles mic capture)
let chunks = [];        // recorded data chunks (WebM blobs)

// Grab a few UI elements
const recordBtn = document.getElementById("recordBtn");
const stopBtn   = document.getElementById("stopBtn");
const statusEl  = document.getElementById("status");
const output    = document.getElementById("output");

// Start recording from the microphone
recordBtn.onclick = async () => {
  try {
    // Ask for audio only (no video). Browser will show a permission prompt.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    chunks = []; // reset chunks for a new recording

    // MediaRecorder will capture the stream in the browser's preferred codec (WebM/Opus in Chrome)
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    // As data becomes available, push it into our chunks array
    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    // When recording stops, we assemble the blob and send it to the server
    mediaRecorder.onstop = async () => {
      // Combine chunks into a single Blob with the correct MIME type
      const blob = new Blob(chunks, { type: "audio/webm" });
      // POST the blob to the /transcribe endpoint (server will convert + run Whisper)
      await sendForTranscription(blob);
      // Stop the mic stream so the device light turns off
      stream.getTracks().forEach(t => t.stop());
    };

    // Start the recording session
    mediaRecorder.start();
    statusEl.textContent = "Recording…";
    recordBtn.disabled = true;
    stopBtn.disabled = false;
  } catch (e) {
    console.error(e);
    // Most common issues: blocked mic permission, unsupported browser, or non-HTTPS origin
    alert("Mic access failed. Use Chrome/Edge on http://localhost and allow microphone.");
  }
};

// Stop recording and trigger upload/transcription
stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();                 // triggers onstop above
    statusEl.textContent = "Processing…"; // UX hint while server works
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  }
};

// Helper: send the recorded audio to the server and update the textbox with the result
async function sendForTranscription(blob) {
  const form = new FormData();
  // The field name "audio" must match the multer field name on the server
  form.append("audio", blob, "clip.webm");

  try {
    const res = await fetch("/transcribe", { method: "POST", body: form });
    if (!res.ok) throw new Error(await res.text());

    // Server returns { text: "…" }
    const { text } = await res.json();
    output.value = text || "";
    statusEl.textContent = "Done.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Transcription error.";
    alert("Transcription failed. Check the server console for details.");
  }
}
