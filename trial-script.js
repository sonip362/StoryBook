// =====================================================
//  LOADING SHIELD — Trial Page Controller
//  GitHub-hosted frontend ↔ Render-hosted backend
// =====================================================

const RENDER_BASE_URL = 'https://storybook-jfps.onrender.com';
const PING_URL = `${RENDER_BASE_URL}/ping`;
const VERIFY_URL = `${RENDER_BASE_URL}/api/ticket/verify`;
const STORYBOOK_URL = `${RENDER_BASE_URL}/storybook.html`;
const SESSION_URL = `${RENDER_BASE_URL}/api/session`;

// ===== 1. State Management =====
let isServerAwake = false;
let pingPromise = null;       // Stores the wake-up promise so we can await it later
let pingResolved = false;     // True once the ping completes (success or fail after retries)

// ===== 2. Fire-and-Forget Ping (runs on page load) =====
window.addEventListener('load', () => {
  console.log('[Shield] 🐉 Waking the dragon (Render)...');
  pingPromise = wakeRenderServer();
});

async function wakeRenderServer() {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2s between retries

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout per attempt

      const res = await fetch(PING_URL, {
        method: 'GET',
        signal: controller.signal,
        // credentials: 'include' — only if cookies are needed cross-origin
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        isServerAwake = true;
        pingResolved = true;
        console.log(`[Shield] ✅ Render is awake (attempt ${attempt})`);
        return true;
      }
    } catch (err) {
      console.log(`[Shield] ⏳ Ping attempt ${attempt}/${MAX_RETRIES} — ${err.name === 'AbortError' ? 'timed out' : err.message}`);
    }

    // Wait before retrying (but not after the last attempt)
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY);
    }
  }

  // All retries exhausted
  pingResolved = true;
  console.log('[Shield] ⚠️ Could not wake Render after retries');
  return false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== 3. Auto-redirect if already authenticated (Remember Me) =====
(async () => {
  try {
    const res = await fetch(SESSION_URL, {
      cache: 'no-store',
      credentials: 'include',
    });
    const data = await res.json();
    if (data && data.authenticated) {
      window.location.replace(STORYBOOK_URL);
    }
  } catch {
    // Stay on trial page silently
  }
})();

// ===== 4. DOM Refs =====
const loginOverlay = document.getElementById('loginOverlay');
const loginPanel = document.getElementById('loginPanel');
const loadingShield = document.getElementById('loadingShield');
const shieldStatus = document.getElementById('shieldStatus');
const trialContent = document.getElementById('trialContent');
const loginTriggerBtn = document.getElementById('loginTriggerBtn');
const ticketFormTrial = document.getElementById('ticketFormTrial');
const formErrorTrial = document.getElementById('formErrorTrial');
const submitBtnTrial = document.getElementById('submitBtnTrial');
const closeLoginBtn = document.getElementById('closeLoginPanel');

// ===== 5. Normalization helpers (must match server) =====
const normalizeString = (v) => String(v || '').trim();
const normalizeName = (v) => normalizeString(v).toLowerCase();
const normalizeClassSec = (v) => normalizeString(v).toUpperCase().replace(/\s+/g, '');
const normalizeRollNo = (v) => {
  const trimmed = normalizeString(v);
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

const showTrialError = (msg) => {
  if (!formErrorTrial) return;
  formErrorTrial.textContent = msg || '';
  formErrorTrial.classList.toggle('hidden', !msg);
};

// ===== 6. Login Panel Toggle =====
if (loginTriggerBtn) {
  loginTriggerBtn.addEventListener('click', () => {
    loginOverlay.classList.add('active');
    loginPanel.classList.add('active');
  });
}

if (closeLoginBtn) {
  closeLoginBtn.addEventListener('click', () => {
    loginOverlay.classList.remove('active');
    loginPanel.classList.remove('active');
    showTrialError('');
  });
}

// Close panel on overlay background click
if (loginOverlay) {
  loginOverlay.addEventListener('click', (e) => {
    if (e.target === loginOverlay) {
      loginOverlay.classList.remove('active');
      loginPanel.classList.remove('active');
      showTrialError('');
    }
  });
}

// ===== 7. The Gate Logic — Form Submission =====
if (ticketFormTrial) {
  ticketFormTrial.addEventListener('submit', async (e) => {
    e.preventDefault();
    showTrialError('');

    const formData = new FormData(ticketFormTrial);
    const data = Object.fromEntries(formData.entries());

    const inputName = normalizeName(data.name);
    const inputRollNo = normalizeRollNo(data.rollno);
    const inputClassSec = normalizeClassSec(data.classsec);
    const inputCode = normalizeString(data.code);

    if (!inputName || inputRollNo === null || !inputClassSec || !inputCode) {
      showTrialError('Please fill all fields correctly.');
      return;
    }

    // Disable button
    if (submitBtnTrial) {
      submitBtnTrial.textContent = 'Verifying...';
      submitBtnTrial.disabled = true;
      submitBtnTrial.style.pointerEvents = 'none';
    }

    // --- THE GATE ---
    if (!isServerAwake && !pingResolved) {
      // Server is still waking up — show the Loading Shield
      showLoadingShield();
      await pingPromise;  // Wait for the background ping to finish
      hideLoadingShield();

      if (!isServerAwake) {
        showTrialError('The server is still waking up. Please try again in a moment.');
        resetSubmitBtn();
        return;
      }
    } else if (!isServerAwake && pingResolved) {
      // Ping completed but failed — one more try
      showLoadingShield();
      const lastChance = await wakeRenderServer();
      hideLoadingShield();

      if (!lastChance) {
        showTrialError('Server is currently unavailable. Please try again later.');
        resetSubmitBtn();
        return;
      }
    }

    // Server is awake — proceed with login
    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: normalizeString(data.name),
          rollNo: inputRollNo,
          classSec: normalizeString(data.classsec),
          accessCode: inputCode,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !payload?.ok) {
        showTrialError(payload?.error || 'Invalid details. Please check and try again.');
        resetSubmitBtn();
        return;
      }

      // ===== 8. SUCCESS → Transition =====
      if (submitBtnTrial) {
        submitBtnTrial.textContent = '✓ Welcome';
        submitBtnTrial.style.background = 'linear-gradient(135deg, #2a5a3a, #3a7a4a, #2a5a3a)';
      }

      // Fade out the entire trial page, then redirect
      document.body.classList.add('shield-fade-out');

      setTimeout(() => {
        window.location.href = STORYBOOK_URL;
      }, 900);

    } catch (err) {
      console.error('[Shield] Verify error:', err);
      showTrialError('Unable to verify right now. Please try again.');
      resetSubmitBtn();
    }
  });
}

// ===== 9. Loading Shield Show / Hide =====
function showLoadingShield() {
  if (loadingShield) {
    loadingShield.classList.add('active');
    animateShieldText();
  }
}

function hideLoadingShield() {
  if (loadingShield) {
    loadingShield.classList.remove('active');
  }
}

// Cycle through atmospheric loading messages
const shieldMessages = [
  'Preparing the Castle...',
  'Awakening the Dragon...',
  'Lighting the Torches...',
  'Opening the Gates...',
  'Almost there...',
];

let shieldMsgIndex = 0;
let shieldInterval = null;

function animateShieldText() {
  if (!shieldStatus) return;
  shieldMsgIndex = 0;
  shieldStatus.textContent = shieldMessages[0];

  if (shieldInterval) clearInterval(shieldInterval);
  shieldInterval = setInterval(() => {
    shieldMsgIndex = (shieldMsgIndex + 1) % shieldMessages.length;
    shieldStatus.style.opacity = '0';
    setTimeout(() => {
      shieldStatus.textContent = shieldMessages[shieldMsgIndex];
      shieldStatus.style.opacity = '1';
    }, 300);
  }, 2500);
}

function resetSubmitBtn() {
  if (submitBtnTrial) {
    submitBtnTrial.textContent = 'Enter the Story';
    submitBtnTrial.disabled = false;
    submitBtnTrial.style.pointerEvents = '';
    submitBtnTrial.style.background = '';
  }
}

// ===== 10. Floating Particles =====
const particlesContainer = document.getElementById('particles');

function createParticle() {
  if (!particlesContainer) return;
  const p = document.createElement('div');
  p.classList.add('particle');
  const size = Math.random() * 4 + 2;
  p.style.width = `${size}px`;
  p.style.height = `${size}px`;
  p.style.left = `${Math.random() * 100}%`;
  p.style.bottom = '-10px';
  p.style.animationDuration = `${Math.random() * 8 + 6}s`;
  p.style.animationDelay = `${Math.random() * 4}s`;
  particlesContainer.appendChild(p);
  setTimeout(() => p.remove(), 16000);
}

setInterval(createParticle, 500);
for (let i = 0; i < 15; i++) setTimeout(createParticle, i * 200);

// ===== 11. Background Music (optional for trial) =====
const bgMusicTrial = document.getElementById('bgMusic');
const soundToggleTrial = document.getElementById('soundToggle');
let isMutedTrial = false;

const iconOn = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/></svg>`;
const iconOff = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/></svg>`;

if (bgMusicTrial) bgMusicTrial.volume = 0.4;

if (soundToggleTrial && bgMusicTrial) {
  soundToggleTrial.addEventListener('click', () => {
    isMutedTrial = !isMutedTrial;
    bgMusicTrial.muted = isMutedTrial;
    if (!isMutedTrial && bgMusicTrial.paused) {
      bgMusicTrial.play().catch(() => {});
    }
    soundToggleTrial.innerHTML = isMutedTrial ? iconOff : iconOn;
  });
}

// Autoplay on first interaction
document.addEventListener('click', function firstPlay() {
  if (bgMusicTrial && bgMusicTrial.paused) {
    bgMusicTrial.play().catch(() => {});
  }
  document.removeEventListener('click', firstPlay);
}, { once: true });
