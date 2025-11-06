/**
 * WASM-based Whisper Offline PWA - Frontend Controller
 *
 * Fully client-side implementation - no server required!
 * Uses Web Audio API for processing and Transformers.js for transcription
 */

// Import audio processor and transcriber
import { processAudioForWhisper } from './audio-processor.js';
import { transcriber } from './transcriber.js';

// MediaRecorder state
let mediaRecorder;      // browser MediaRecorder instance (handles mic capture)
let chunks = [];        // recorded data chunks (WebM blobs)

// UI Elements
const recordBtn = document.getElementById("recordBtn");
const stopBtn   = document.getElementById("stopBtn");
const statusEl  = document.getElementById("status");
const output    = document.getElementById("output");

// Model selection (can be made configurable via UI later)
const DEFAULT_MODEL = 'Xenova/whisper-tiny.en'; // Fast, good accuracy
// Alternative models:
// - 'Xenova/whisper-base.en' (better accuracy, slower)
// - 'distil-whisper/distil-small.en' (fast with good accuracy)

/**
 * Start recording from the microphone
 */
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

    // When recording stops, we assemble the blob and process locally
    mediaRecorder.onstop = async () => {
      // Combine chunks into a single Blob with the correct MIME type
      const blob = new Blob(chunks, { type: "audio/webm" });
      // Process the blob locally (WASM transcription)
      await processRecordingLocally(blob);
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
    alert("Mic access failed. Use Chrome/Edge/Firefox and allow microphone access.");
  }
};

/**
 * Stop recording and trigger local transcription
 */
stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();                 // triggers onstop above
    statusEl.textContent = "Processing…"; // UX hint while processing
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  }
};

/**
 * Process the recorded audio locally using WASM
 * @param {Blob} blob - Audio blob from MediaRecorder
 */
async function processRecordingLocally(blob) {
  try {
    console.log('[App] Starting local transcription');

    // Step 1: Convert audio to format Whisper expects
    statusEl.textContent = "Converting audio…";
    const audioData = await processAudioForWhisper(blob);
    console.log(`[App] Audio processed: ${audioData.length} samples`);

    // Step 2: Transcribe using WASM Whisper
    statusEl.textContent = "Loading model…";

    const result = await transcriber.transcribe(audioData, {
      model: DEFAULT_MODEL,
      language: 'en',
      task: 'transcribe',
      return_timestamps: false,

      // Progress callback for real-time updates
      onProgress: (progress) => {
        console.log('[App] Progress:', progress);

        switch (progress.status) {
          case 'loading':
            statusEl.textContent = "Loading Whisper model…";
            break;

          case 'downloading':
            const percent = (progress.progress * 100).toFixed(0);
            const loadedMB = (progress.loaded / 1024 / 1024).toFixed(1);
            const totalMB = (progress.total / 1024 / 1024).toFixed(1);
            statusEl.textContent = `Downloading model: ${percent}% (${loadedMB}/${totalMB} MB)`;
            break;

          case 'transcribing':
            statusEl.textContent = "Transcribing…";
            // Could show partial text here if desired
            // output.value = progress.text || '';
            break;
        }
      }
    });

    // Step 3: Display the result
    const transcriptText = result.text || '';
    output.value = transcriptText;
    statusEl.textContent = "Done.";

    console.log('[App] Transcription complete:', transcriptText);

    // Step 4: Parse and auto-fill HHA form
    if (transcriptText) {
      parseAndFillHHAForm(transcriptText);
    }

  } catch (err) {
    console.error('[App] Transcription error:', err);
    statusEl.textContent = "Transcription error.";
    alert(`Transcription failed: ${err.message}\n\nCheck console for details.`);
  }
}

// ============================================================================
// HHA Form-Filling Logic (unchanged from original implementation)
// ============================================================================

/**
 * Parse the transcription text and extract HHA assessment answers
 * @param {string} text - Transcribed text
 * @returns {Object} - Parsed responses for Q1-Q5
 */
function parseHHATranscription(text) {
  const lowerText = text.toLowerCase();

  const responses = {
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: []
  };

  // Q1: Beneficiary admitted directly from acute/post-acute facility
  if (lowerText.includes('was admitted')) {
    responses.q1 = 'yes';
  } else if (lowerText.includes('was not admitted')) {
    responses.q1 = 'no';
  }

  // Q2: Certification and F2F encounter by same physician
  if (lowerText.includes('were performed by the same')) {
    responses.q2 = 'yes';
  } else if (lowerText.includes('were not performed by the same')) {
    responses.q2 = 'no';
  }

  // Q3: HHA records signed, dated, and incorporated
  if (lowerText.includes('we do have')) {
    responses.q3 = 'yes';
  } else if (lowerText.includes('we do not have')) {
    responses.q3 = 'no';
  }

  // Q4: Structural impairment present
  if (lowerText.includes('there is a structural impairment')) {
    responses.q4 = 'yes';
  } else if (lowerText.includes('there is no structural impairment')) {
    responses.q4 = 'no';
  }

  // Q5: Extract domains (only if Q4 = yes)
  if (responses.q4 === 'yes') {
    responses.q5 = extractDomains(lowerText);
  }

  return responses;
}

/**
 * Extract domain keywords from transcription text
 * @param {string} text - Transcribed text (lowercase)
 * @returns {Array<string>} - Array of detected domains
 */
function extractDomains(text) {
  const domains = [];
  const domainKeywords = ['mobility', 'self-care', 'self care', 'communication', 'cognition', 'sensory'];

  //  d the section after "affects the following domains" or "following domains"
  const domainsMatch = text.match(/(?:affects the following domains|following domains)[:\s]+(.*?)(?:\.|$)/i);
  const domainsSection = domainsMatch ? domainsMatch[1] : text;

  // Check for each domain keyword
  if (domainsSection.includes('mobility')) domains.push('mobility');
  if (domainsSection.includes('self-care') || domainsSection.includes('self care')) domains.push('self-care');
  if (domainsSection.includes('communication')) domains.push('communication');
  if (domainsSection.includes('cognition')) domains.push('cognition');
  if (domainsSection.includes('sensory')) domains.push('sensory');

  return domains;
}

/**
 * Populate the HHA form with parsed responses
 * @param {string} text - Transcribed text
 */
function parseAndFillHHAForm(text) {
  const responses = parseHHATranscription(text);
  console.log('Parsed HHA responses:', responses);

  // Fill Q1
  if (responses.q1) {
    const q1Radio = document.querySelector(`input[name="q1"][value="${responses.q1}"]`);
    if (q1Radio) {
      q1Radio.checked = true;
      document.getElementById('q1-container').classList.add('auto-filled');
      document.getElementById('q1-badge').style.display = 'inline-block';
    }
  }

  // Fill Q2
  if (responses.q2) {
    const q2Radio = document.querySelector(`input[name="q2"][value="${responses.q2}"]`);
    if (q2Radio) {
      q2Radio.checked = true;
      document.getElementById('q2-container').classList.add('auto-filled');
      document.getElementById('q2-badge').style.display = 'inline-block';
    }
  }

  // Fill Q3
  if (responses.q3) {
    const q3Radio = document.querySelector(`input[name="q3"][value="${responses.q3}"]`);
    if (q3Radio) {
      q3Radio.checked = true;
      document.getElementById('q3-container').classList.add('auto-filled');
      document.getElementById('q3-badge').style.display = 'inline-block';
    }
  }

  // Fill Q4
  if (responses.q4) {
    const q4Radio = document.querySelector(`input[name="q4"][value="${responses.q4}"]`);
    if (q4Radio) {
      q4Radio.checked = true;
      document.getElementById('q4-container').classList.add('auto-filled');
      document.getElementById('q4-badge').style.display = 'inline-block';
      // Trigger Q4 change to enable/disable Q5
      updateQ5State(responses.q4);
    }
  }

  // Fill Q5 (domains)
  if (responses.q5.length > 0) {
    responses.q5.forEach(domain => {
      const checkbox = document.querySelector(`input[name="q5"][value="${domain}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
    document.getElementById('q5-container').classList.add('auto-filled');
    document.getElementById('q5-badge').style.display = 'inline-block';
  }
}

/**
 * Update Q5 enabled/disabled state based on Q4 answer
 * @param {string} q4Value - 'yes' or 'no'
 */
function updateQ5State(q4Value) {
  const q5Container = document.getElementById('q5-container');
  const q5Checkboxes = document.querySelectorAll('input[name="q5"]');

  if (q4Value === 'yes') {
    q5Container.classList.remove('disabled');
    q5Checkboxes.forEach(cb => cb.disabled = false);
  } else {
    q5Container.classList.add('disabled');
    q5Checkboxes.forEach(cb => {
      cb.disabled = true;
      cb.checked = false;
    });
    // Remove auto-fill badge if Q4 is No
    document.getElementById('q5-badge').style.display = 'none';
    q5Container.classList.remove('auto-filled');
  }
}

/**
 * Script toggle function (for collapsible script section)
 */
function toggleScript() {
  const scriptContent = document.getElementById('scriptContent');
  const toggleIcon = document.getElementById('toggleIcon');

  if (scriptContent.classList.contains('collapsed')) {
    scriptContent.classList.remove('collapsed');
    toggleIcon.textContent = '▼';
  } else {
    scriptContent.classList.add('collapsed');
    toggleIcon.textContent = '▶';
  }
}

// Make toggleScript available globally (called from HTML onclick)
window.toggleScript = toggleScript;

// ============================================================================
// PWA Install Prompt Logic
// ============================================================================

/**
 * Handle PWA install prompt
 */
function initializeInstallPrompt() {
  const installPrompt = document.getElementById('installPrompt');
  const installBtn = document.getElementById('installBtn');
  const dismissBtn = document.getElementById('dismissInstallBtn');

  // Check if already installed
  if (window.isInstalledPWA && window.isInstalledPWA()) {
    console.log('[Install Prompt] App already installed as PWA');
    return;
  }

  // Show install prompt when app becomes installable (Android Chrome)
  window.addEventListener('appinstallable', () => {
    console.log('[Install Prompt] Showing install prompt');
    installPrompt.classList.add('visible');
  });

  // Handle install button click
  installBtn.addEventListener('click', async () => {
    console.log('[Install Prompt] Install button clicked');

    if (window.showInstallPrompt) {
      const accepted = await window.showInstallPrompt();
      if (accepted) {
        console.log('[Install Prompt] User accepted install');
        installPrompt.classList.remove('visible');
      }
    } else {
      console.warn('[Install Prompt] showInstallPrompt not available');
      // Show iOS instructions if on iOS
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        alert('To install:\n1. Tap the Share button\n2. Tap "Add to Home Screen"');
      }
    }
  });

  // Handle dismiss button click
  dismissBtn.addEventListener('click', () => {
    console.log('[Install Prompt] Install prompt dismissed');
    installPrompt.classList.remove('visible');
  });

  // Hide prompt when app is installed
  window.addEventListener('appinstalled', () => {
    console.log('[Install Prompt] App installed, hiding prompt');
    installPrompt.classList.remove('visible');
  });
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the app on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] WASM Whisper Offline PWA initialized');

  // Listen for Q4 changes to enable/disable Q5
  const q4Radios = document.querySelectorAll('input[name="q4"]');
  q4Radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateQ5State(e.target.value);
    });
  });

  // Initialize PWA install prompt
  initializeInstallPrompt();

  console.log('[App] Model:', DEFAULT_MODEL);
  console.log('[App] First transcription will download the model (~75MB for tiny.en)');
});
