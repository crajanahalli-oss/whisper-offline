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

    // Parse the transcription and auto-fill the HHA form
    if (text) {
      parseAndFillHHAForm(text);
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Transcription error.";
    alert("Transcription failed. Check the server console for details.");
  }
}

// Parse the transcription text and extract HHA assessment answers
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

// Extract domain keywords from transcription text
function extractDomains(text) {
  const domains = [];
  const domainKeywords = ['mobility', 'self-care', 'self care', 'communication', 'cognition', 'sensory'];

  // Find the section after "affects the following domains" or "following domains"
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

// Populate the HHA form with parsed responses
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

// Update Q5 enabled/disabled state based on Q4 answer
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

// Script toggle function
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

// Listen for Q4 changes to enable/disable Q5
document.addEventListener('DOMContentLoaded', () => {
  const q4Radios = document.querySelectorAll('input[name="q4"]');
  q4Radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateQ5State(e.target.value);
    });
  });
});
