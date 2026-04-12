// Replace with your actual Render URL
const RENDER_URL = "https://storybook-jfps.onrender.com/ping";

// This "pings" Render immediately to wake it up while the user reads
window.onload = () => {
  console.log("Waking up the dragon (Render)...");
  fetch(RENDER_URL, { mode: 'no-cors' })
    .then(() => console.log("Render is warming up!"))
    .catch(err => console.log("Ping sent."));
};
// ===== Background Music Controller =====
const bgMusic = document.getElementById('bgMusic');
const soundToggle = document.getElementById('soundToggle');
const audioOverlay = document.getElementById('audioOverlay');
let isMuted = false;

const soundIconOn = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round"
          d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
  </svg>`;
const soundIconOff = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round"
          d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
  </svg>`;

if (bgMusic) bgMusic.volume = 0.4;

// Click overlay to start music (browser autoplay policy)
if (audioOverlay && bgMusic) {
  audioOverlay.addEventListener('click', () => {
    bgMusic.play().catch((err) => console.log('Audio play failed:', err)).finally(() => {
      audioOverlay.classList.add('audio-overlay-hidden');
      setTimeout(() => (audioOverlay.style.display = 'none'), 800);
    });
  });
}

// Sound toggle button
if (soundToggle && bgMusic) {
  soundToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    bgMusic.muted = isMuted;

    // If music was blocked by autoplay, try to play it now on user gesture
    if (!isMuted && bgMusic.paused) {
      bgMusic.play().catch((err) => console.log('Audio play failed on toggle:', err));
    }

    soundToggle.innerHTML = isMuted ? soundIconOff : soundIconOn;
    soundToggle.setAttribute('aria-label', isMuted ? 'Unmute background music' : 'Mute background music');

    // Sync state for next page or refresh
    sessionStorage.setItem('musicMuted', String(isMuted));
    sessionStorage.setItem('musicPlaying', String(!bgMusic.paused));
  });
}

// ===== Floating Particles =====
const particlesContainer = document.getElementById('particles');

function createParticle() {
  if (!particlesContainer) return;
  const particle = document.createElement('div');
  particle.classList.add('particle');
  const size = Math.random() * 4 + 2;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.left = `${Math.random() * 100}%`;
  particle.style.bottom = '-10px';
  particle.style.animationDuration = `${Math.random() * 8 + 6}s`;
  particle.style.animationDelay = `${Math.random() * 4}s`;
  particlesContainer.appendChild(particle);
  setTimeout(() => particle.remove(), 16000);
}

setInterval(createParticle, 500);
for (let i = 0; i < 15; i += 1) setTimeout(createParticle, i * 200);

// ===== Ticket Verification (admin-created accounts) =====
const normalizeString = (value) => String(value || '').trim();
const normalizeName = (value) => normalizeString(value).toLowerCase();
const normalizeClassSec = (value) => normalizeString(value).toUpperCase().replace(/\s+/g, '');
const normalizeRollNo = (value) => {
  const trimmed = normalizeString(value);
  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) ? asNumber : null;
};

const showFormError = (message) => {
  const el = document.getElementById('formError');
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('hidden', !message);
};

// ===== Form Submission =====
const ticketForm = document.getElementById('ticketForm');
if (ticketForm) {
  const rememberEl = document.getElementById('rememberMe');
  if (rememberEl) {
    rememberEl.checked = localStorage.getItem('sb_remember') === 'true';
    rememberEl.addEventListener('change', () => {
      if (rememberEl.checked) localStorage.setItem('sb_remember', 'true');
      else localStorage.removeItem('sb_remember');
    });
  }

  ticketForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showFormError('');

    const formData = new FormData(ticketForm);
    const data = Object.fromEntries(formData.entries());

    const inputName = normalizeName(data.name);
    const inputRollNo = normalizeRollNo(data.rollno);
    const inputClassSec = normalizeClassSec(data.classsec);
    const inputCode = normalizeString(data.code);

    if (!inputName || inputRollNo === null || !inputClassSec || !inputCode) {
      showFormError('Please fill all fields correctly.');
      return;
    }

    const btn = document.getElementById('submitBtn');
    const previousText = btn ? btn.textContent : '';
    if (btn) {
      btn.textContent = 'Checking...';
      btn.style.pointerEvents = 'none';
      btn.disabled = true;
    }

    try {
      const rememberMe = Boolean(rememberEl && rememberEl.checked);
      const res = await fetch('/api/ticket/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: normalizeString(data.name),
          rollNo: inputRollNo,
          classSec: normalizeString(data.classsec),
          accessCode: inputCode,
          rememberMe
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        showFormError(payload?.error || 'Details do not match an admin-created account. Please check and try again.');
        if (btn) {
          btn.textContent = previousText || 'Confirm';
          btn.style.pointerEvents = '';
          btn.disabled = false;
        }
        return;
      }

      if (btn) {
        btn.textContent = 'Confirmed';
        btn.style.background = 'linear-gradient(135deg, #2a5a3a, #3a7a4a, #2a5a3a)';
      }

      // Store music state before navigation
      if (bgMusic) {
        sessionStorage.setItem('musicPlaying', String(!bgMusic.paused));
        sessionStorage.setItem('musicTime', String(bgMusic.currentTime));
      }
      sessionStorage.setItem('musicMuted', String(isMuted));

      window.location.href = './storybook.html';
    } catch (err) {
      console.error('Ticket verification failed:', err);
      const message = String(err?.message || '');
      if (/Failed to fetch/i.test(message) || /ERR_CONNECTION_REFUSED/i.test(message)) {
        showFormError('Server is not running. Start it with: npm run server');
      } else {
        showFormError('Unable to verify right now. Please try again.');
      }
      if (btn) {
        btn.textContent = previousText || 'Confirm';
        btn.style.pointerEvents = '';
        btn.disabled = false;
      }
    }
  });
}

// ===== Stagger form rows entrance (qr-login.html only) =====
document.querySelectorAll('#ticketForm > div').forEach((row, i) => {
  row.style.opacity = '0';
  row.style.transform = 'translateY(20px)';
  row.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  setTimeout(() => {
    row.style.opacity = '1';
    row.style.transform = 'translateY(0)';
  }, 400 + i * 150);
});

// ===== Mobile Header Scroll Logic (storybook.html) =====
const storyHeader = document.getElementById('storyHeader');
const scrollPage = document.querySelector('.page');

if (storyHeader && scrollPage) {
  const handleScroll = () => {
    const scrollTop = scrollPage.scrollTop;
    const scrollHeight = scrollPage.scrollHeight - scrollPage.clientHeight;

    // Update Page Indicator (all devices)
    const pageIndicator = document.getElementById('pageIndicator');
    if (pageIndicator) {
      if (scrollHeight <= 0) {
        pageIndicator.textContent = 'PAGE 1';
      } else {
        const scrollPct = (scrollTop / scrollPage.clientHeight) * 100;
        const pageNum = Math.max(1, Math.ceil(scrollPct / 50));
        pageIndicator.textContent = `PAGE ${pageNum}`;
      }
    }

    // Standard behavior for desktop
    if (window.innerWidth > 768) {
      storyHeader.style.opacity = '1';
      storyHeader.style.transform = 'translateY(0)';
      storyHeader.style.pointerEvents = 'auto';
      return;
    }

    // Scroll detection for mobile
    if (scrollHeight <= 0) {
      storyHeader.style.opacity = '1';
      storyHeader.style.transform = 'translateY(0)';
      return;
    }

    const scrollPercent = (scrollTop / scrollHeight) * 100;

    if (scrollPercent >= 15) {
      storyHeader.style.opacity = '1';
      storyHeader.style.transform = 'translateY(0)';
      storyHeader.style.pointerEvents = 'auto';
    } else {
      storyHeader.style.opacity = '0';
      storyHeader.style.transform = 'translateY(-100%)';
      storyHeader.style.pointerEvents = 'none';
    }
  };

  scrollPage.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll);
  // Initial check
  handleScroll();
}

// ===== Storybook Page Logic =====
const castleImage = document.querySelector('.castle-image');
const titleHotspot = document.querySelector('.title-hotspot');
const batSfx = new Audio('./assests/bat.mp3');
const triggeredEggs = new Set();
let tapTimestamps = [];
let holdTimer = null;

// Restore music state from previous page (storybook.html)
if (bgMusic) {
  const wasPlaying = sessionStorage.getItem('musicPlaying') === 'true';
  const wasMuted = sessionStorage.getItem('musicMuted') === 'true';
  const musicTime = parseFloat(sessionStorage.getItem('musicTime')) || 0;

  if (wasPlaying) {
    bgMusic.currentTime = musicTime;
    bgMusic.play().catch((err) => console.log('Audio play failed:', err));
  }

  if (wasMuted) {
    isMuted = true;
    bgMusic.muted = true;
    if (soundToggle) soundToggle.innerHTML = soundIconOff;
  } else {
    if (soundToggle) soundToggle.innerHTML = soundIconOn;
  }
}

// ===== Easter Egg Counter =====
const eggCountText = document.getElementById('eggCountText');

const updateEggCounter = async () => {
  if (!eggCountText) return;
  try {
    const res = await fetch('/api/easter-eggs/progress', { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    if (data && data.ok) {
      eggCountText.textContent = `${data.foundCount} / ${data.total}`;
    }
  } catch {
    // silently ignore — counter just stays at previous value
  }
};

// Load count on page open
updateEggCounter();

// ===== Easter Egg helpers =====

const showEggToast = (message) => {
  let toast = document.getElementById('eggToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'eggToast';
    toast.className = 'egg-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
};

const unlockEasterEgg = async (eggId) => {
  if (triggeredEggs.has(eggId)) return;
  triggeredEggs.add(eggId);
  try {
    const response = await fetch('/api/easter-eggs/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eggId })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) return;
    if (payload.newlyUnlocked) {
      showEggToast(`${payload.foundCount}/${payload.total} easter egg found`);
      updateEggCounter();
    }
  } catch (error) {
    console.warn('Easter egg unlock failed:', error);
  }
};

// ===== Castle triple-tap easter egg =====
batSfx.preload = 'auto';
batSfx.volume = 0.9;

const onCastleTap = () => {
  const now = Date.now();
  tapTimestamps = tapTimestamps.filter((stamp) => now - stamp <= 700);
  tapTimestamps.push(now);
  if (tapTimestamps.length >= 3) {
    tapTimestamps = [];
    castleImage.classList.remove('castle-shake');
    void castleImage.offsetWidth;
    castleImage.classList.add('castle-shake');
    batSfx.currentTime = 0;
    batSfx.play().catch((err) => console.log('Bat sound play failed:', err));
    unlockEasterEgg('castle_triple_tap');
  }
};

if (castleImage) {
  castleImage.addEventListener('pointerup', onCastleTap);
  castleImage.addEventListener('animationend', () => {
    castleImage.classList.remove('castle-shake');
  });
}

// ===== Title hold easter egg =====
const activateBloodTextMode = () => {
  if (document.body.classList.contains('blood-text-mode')) return;
  document.body.classList.add('blood-text-mode');
  unlockEasterEgg('dracula_title_hold');
};

const clearHoldTimer = () => {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
};

if (titleHotspot) {
  titleHotspot.addEventListener('pointerdown', () => {
    clearHoldTimer();
    holdTimer = setTimeout(activateBloodTextMode, 500);
  });
  titleHotspot.addEventListener('pointerup', clearHoldTimer);
  titleHotspot.addEventListener('pointerleave', clearHoldTimer);
  titleHotspot.addEventListener('pointercancel', clearHoldTimer);
  titleHotspot.addEventListener('contextmenu', (event) => event.preventDefault());
}

// ===== Dracula Tap-Hold-Tap Easter Egg =====
const draculaImg = document.getElementById('draculaImg');
const videoModal = document.getElementById('videoModal');
const modalContent = document.getElementById('modalContent');
const modalVideo = document.getElementById('modalVideo');
const closeModal = document.getElementById('closeModal');

let comboState = 0; // 0: Idle, 1: Tapped once, 2: Held successfully
let draculaHoldStart = 0;
let draculaHoldTimer = null;

const resetDraculaCombo = () => {
  comboState = 0;
  if (draculaImg) draculaImg.style.transform = '';
};

// Function to close modal
const closeDraculaModal = () => {
  if (videoModal && modalContent && modalVideo) {
    modalContent.classList.remove('modal-show');
    // Wait for animation to finish before hiding container
    setTimeout(() => {
      videoModal.classList.add('hidden');
      videoModal.classList.remove('flex');
      modalVideo.pause();
      modalVideo.currentTime = 0;
    }, 500);
  }
};

if (draculaImg && videoModal && modalContent && modalVideo) {
  draculaImg.addEventListener('pointerdown', (e) => {
    draculaHoldStart = Date.now();
    if (comboState === 1) {
      draculaHoldTimer = setTimeout(() => {
        comboState = 2;
        draculaImg.style.transform = 'scale(0.92) rotate(3deg)';
      }, 1000);
    }
  });

  draculaImg.addEventListener('pointerup', (e) => {
    const duration = Date.now() - draculaHoldStart;
    if (draculaHoldTimer) clearTimeout(draculaHoldTimer);

    if (duration < 300) {
      if (comboState === 0) {
        comboState = 1;
        draculaImg.style.transform = 'scale(1.1)';
        setTimeout(() => { if (comboState === 1) resetDraculaCombo(); }, 2500);
      } else if (comboState === 2) {
        // Trigger Popup Modal
        videoModal.classList.remove('hidden');
        videoModal.classList.add('flex');
        // Small delay to ensure browser triggers transition
        requestAnimationFrame(() => {
          modalContent.classList.add('modal-show');
        });
        modalVideo.play();
        unlockEasterEgg('dracula_gesture_tap_hold_tap');
        resetDraculaCombo();
      } else {
        resetDraculaCombo();
      }
    } else if (duration >= 1000 && comboState === 2) {
      draculaImg.style.transform = 'scale(1.15) rotate(-3deg)';
      setTimeout(() => { if (comboState === 2) resetDraculaCombo(); }, 2500);
    } else {
      resetDraculaCombo();
    }
  });

  draculaImg.addEventListener('contextmenu', (e) => e.preventDefault());

  // Close button logic
  if (closeModal) {
    closeModal.addEventListener('click', closeDraculaModal);
  }

  // Close modal when video ends
  modalVideo.onended = closeDraculaModal;

  // Close modal when clicking outside content area
  videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) closeDraculaModal();
  });
}

