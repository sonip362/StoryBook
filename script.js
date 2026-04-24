// ===== Loading Shield (storybook.html preloader) =====
(() => {
  const loadingShield = document.getElementById('loadingShield');
  if (!loadingShield) return;

  const hideShield = () => {
    if (!loadingShield.isConnected) return;
    loadingShield.classList.remove('active');
    window.setTimeout(() => loadingShield.remove(), 650);
  };

  const waitForImages = () => {
    const images = Array.from(document.images || []);
    const pending = images.filter((img) => !img.complete);
    if (pending.length === 0) return Promise.resolve();

    return Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          })
      )
    );
  };

  const safetyTimeout = window.setTimeout(hideShield, 15000);

  const start = () => {
    waitForImages().then(() => {
      window.clearTimeout(safetyTimeout);
      hideShield();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

// ===== Mobile viewport height fix (prevents bottom void on browser UI resize) =====
const setAppViewportHeight = () => {
  document.documentElement.style.setProperty('--app-vh', `${window.innerHeight * 0.01}px`);
};
setAppViewportHeight();
window.addEventListener('resize', setAppViewportHeight);
window.addEventListener('orientationchange', setAppViewportHeight);

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
const dingSfx = new Audio('./assests/ding.mp3');
const whooshSfx = new Audio('./assests/whoosh.mp3');
whooshSfx.preload = 'auto';
whooshSfx.volume = 0.9;
dingSfx.preload = 'auto';
dingSfx.volume = 0.7;

// ===== Bat disappearance persistence =====
const BAT_FLAG = 'egg_bat_disappeared';
function applyBatRemovedState() {
  const removed = localStorage.getItem(BAT_FLAG) === 'true';
  const batImg = document.getElementById('batImage');
  const batSection = document.getElementById('batEasterEgg');
  if (removed) {
    if (batImg) batImg.style.display = 'none';
    if (batSection) batSection.innerHTML = '<p style="font-family: \'Cinzel\', serif; color:#005300; text-align:center;">The bat has disappeared! 🎉</p>';
  }
}
function setBatRemovedPersistent() {
  try { localStorage.setItem(BAT_FLAG, 'true'); } catch (e) { /* ignore */ }
}
// Apply on script load
applyBatRemovedState();

// ===== Paid unlock helper (300 gems) =====
// Show confirmation modal before purchasing the answer
function buyAnswerWithGems() {
  const COST = 300;
  const MIN_RESERVE = 300;
  const gemCountText = document.getElementById('gemCountText');
  const modal = document.getElementById('confirmPurchaseModal');
  if (!modal || !gemCountText) return;

  const available = parseInt(gemCountText.textContent || '0', 10) || 0;
  if (available < COST + MIN_RESERVE) {
    showEggToast(`Not enough gems. You must keep at least ${MIN_RESERVE} gems after purchase.`);
    return;
  }

  modal.classList.remove('hidden');
  // show (remove opacity-0)
  modal.classList.remove('opacity-0');
  modal.classList.add('opacity-100');

  const onCancel = () => {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
    cleanup();
  };

  const onConfirm = async () => {
    cleanup();
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
    await performPurchaseUnlock();
  };

  const cleanup = () => {
    const cancelBtn = document.getElementById('cancelPurchaseBtn');
    const confirmBtn = document.getElementById('confirmPurchaseBtn');
    if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
    if (confirmBtn) confirmBtn.removeEventListener('click', onConfirm);
  };

  const cancelBtn = document.getElementById('cancelPurchaseBtn');
  const confirmBtn = document.getElementById('confirmPurchaseBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
  if (confirmBtn) confirmBtn.addEventListener('click', onConfirm);
}

async function performPurchaseUnlock() {
  const COST = 300;
  const gemCountText = document.getElementById('gemCountText');
  const input = document.getElementById('batRemovalInput');
  const batSection = document.getElementById('batEasterEgg');
  if (!gemCountText || !input || !batSection) return;

  const available = parseInt(gemCountText.textContent || '0', 10) || 0;
  const MIN_RESERVE = 300;
  if (available < COST + MIN_RESERVE) {
    showEggToast(`Not enough gems. You must keep at least ${MIN_RESERVE} gems after purchase.`);
    return;
  }

  try {
    const res = await fetch('/api/easter-eggs/purchase-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eggId: 'bat_disappearance', cost: COST })
    });
    const payload = await res.json().catch(() => null);
    if (res.ok && payload?.ok) {
      // Update UI from server state
      updateEggCounter();
      input.value = 'prakashah';
      removeBat();
      return;
    }
    // If server rejected (e.g., insufficient gems), show message
    showEggToast(payload?.error || 'Purchase failed.');
  } catch (err) {
    // Fallback to local deduction if server unreachable
    const newVal = Math.max(0, available - COST);
    gemCountText.textContent = String(newVal);
    try { setBatRemovedPersistent(); } catch (e) {}
    input.value = 'prakashah';
    showEggToast('Answer unlocked for 300 gems (offline)');
    removeBat();
  }
}

// Expose for inline handler
window.buyAnswerWithGems = buyAnswerWithGems;

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

// ===== Page Locking System =====
const lockSteps = [
  { eggs: 1, gems: 100, desktopPercent: 0.26, mobilePercent: 0.40 },
  { eggs: 2, gems: 200, desktopPercent: 0.40, mobilePercent: 0.33 },
  { eggs: 3, gems: 300, desktopPercent: 0.66, mobilePercent: 0.60 }
];

const getOffsetTopWithin = (element, ancestor) => {
  let top = 0;
  let node = element;
  while (node && node !== ancestor) {
    top += node.offsetTop || 0;
    node = node.offsetParent;
  }
  return top;
};

const getLockHeight = (activeStep, isMobile, scrollContainer, scrollFrame) => {
  const frameHeight = scrollFrame?.getBoundingClientRect().height || 0;
  if (!frameHeight) return 0;

  // On mobile, first lock should appear right after the castle section.
  if (isMobile && activeStep.eggs === 1) {
    const draculaSection = document.querySelector('.dracula-section');
    if (draculaSection && scrollContainer) {
      const lockAt = getOffsetTopWithin(draculaSection, scrollContainer) - 12;
      if (lockAt > 0) return Math.min(lockAt, frameHeight);
    }
  }

  const percent = isMobile ? activeStep.mobilePercent : activeStep.desktopPercent;
  return frameHeight * percent;
};

const checkPageLock = (foundCount, gems) => {
  const contentLock = document.getElementById('contentLock');
  const reqEggs = document.getElementById('reqEggs');
  const reqGems = document.getElementById('reqGems');
  const reqEggsLabel = document.getElementById('reqEggsLabel');
  const reqGemsLabel = document.getElementById('reqGemsLabel');
  const scrollContainer = document.querySelector('.scroll-container');
  const scrollFrame = document.querySelector('.storybook-shell') || document.querySelector('.scroll-image');

  // Mobile lock elements
  const mobileLock = document.getElementById('mobileLock');
  const mobileReqEggs = document.getElementById('mobileReqEggs');
  const mobileReqGems = document.getElementById('mobileReqGems');
  const mobileReqEggsLabel = document.getElementById('mobileReqEggsLabel');
  const mobileReqGemsLabel = document.getElementById('mobileReqGemsLabel');

  const activeStep = lockSteps.find((step) => foundCount < step.eggs || gems < step.gems);

  if (!activeStep) {
    document.body.classList.remove('page-locked');
    if (scrollContainer) scrollContainer.style.removeProperty('--lock-height');
    if (mobileLock) mobileLock.classList.remove('mobile-lock-visible');
    if (contentLock) contentLock.classList.remove('lock-overlay-active');
    return;
  }

  const hasEgg = foundCount >= activeStep.eggs;
  const hasGems = gems >= activeStep.gems;

  if (reqEggsLabel) reqEggsLabel.innerHTML = `<span class="hidden sm:inline">${activeStep.eggs} </span>FOUND`;
  if (reqGemsLabel) reqGemsLabel.innerHTML = `<span class="hidden sm:inline">${activeStep.gems} </span>GEMS`;
  if (mobileReqEggsLabel) mobileReqEggsLabel.textContent = `${activeStep.eggs} EGG${activeStep.eggs > 1 ? 'S' : ''} FOUND`;
  if (mobileReqGemsLabel) mobileReqGemsLabel.textContent = `${activeStep.gems} GEMS`;

  // Desktop req badges
  if (reqEggs) reqEggs.classList.toggle('req-met', hasEgg);
  if (reqGems) reqGems.classList.toggle('req-met', hasGems);

  // Mobile req badges
  if (mobileReqEggs) mobileReqEggs.classList.toggle('mobile-req-met', hasEgg);
  if (mobileReqGems) mobileReqGems.classList.toggle('mobile-req-met', hasGems);

  document.body.classList.add('page-locked');

  // Calculate precision lock height for active step
  if (scrollFrame && scrollContainer) {
    const isMobile = window.innerWidth <= 768;
    const lockHeight = getLockHeight(activeStep, isMobile, scrollContainer, scrollFrame);
    if (lockHeight > 0) {
      scrollContainer.style.setProperty('--lock-height', `${lockHeight}px`);
    }
  }

  // On mobile, show the mobile lock overlay when user hits scroll limit
  // as a persistent header while locked
  if (window.innerWidth <= 768 && mobileLock) {
    mobileLock.classList.add('mobile-lock-visible');
  }
};


// Handle resize and scroll to keep lock state and visibility accurate
const handlePageScroll = () => {
  const contentLock = document.getElementById('contentLock');
  const mobileLock = document.getElementById('mobileLock');
  const page = document.querySelector('.page');
  const scrollContainer = document.querySelector('.scroll-container');

  if (!page || !scrollContainer) return;

  const isMobile = window.innerWidth <= 768;

  if (document.body.classList.contains('page-locked')) {
    const lockHeight = parseFloat(scrollContainer.style.getPropertyValue('--lock-height'));
    if (!lockHeight || lockHeight <= 0) return;

    // --- CLAMP scroll on mobile to kill the black void ---
    if (isMobile) {
      const maxScroll = Math.max(0, lockHeight - page.clientHeight);
      if (page.scrollTop > maxScroll) {
        page.scrollTop = maxScroll;
        return; // re-entry will re-run this handler
      }
    }

    const threshold = isMobile ? 60 : 100;
    const isAtLimit = (page.scrollTop + page.clientHeight) >= (lockHeight - threshold);

    if (isMobile) {
      if (mobileLock) mobileLock.classList.add('mobile-lock-visible');
      if (contentLock) contentLock.classList.remove('lock-overlay-active');
    } else {
      if (contentLock) contentLock.classList.toggle('lock-overlay-active', isAtLimit);
      if (mobileLock) mobileLock.classList.remove('mobile-lock-visible');
    }
  } else {
    if (contentLock) contentLock.classList.remove('lock-overlay-active');
    if (mobileLock) mobileLock.classList.remove('mobile-lock-visible');
  }
};

window.addEventListener('resize', () => {
  updateEggCounter();
  handlePageScroll();
});

document.querySelector('.page')?.addEventListener('scroll', handlePageScroll);

// ===== Coming Soon Vignette Visibility =====
(() => {
  const page = document.querySelector('.page');
  const vignette = document.getElementById('comingSoonVignette');
  if (!page || !vignette) return;

  const THRESHOLD_PX = 48; // how close to bottom (px) before showing

  const checkVignette = () => {
    const atBottom = (page.scrollTop + page.clientHeight) >= (page.scrollHeight - THRESHOLD_PX);
    if (atBottom) vignette.classList.add('coming-visible');
    else vignette.classList.remove('coming-visible');
  };

  page.addEventListener('scroll', checkVignette, { passive: true });
  window.addEventListener('resize', checkVignette);
  // run once on load
  window.addEventListener('load', checkVignette);
  // also run after images settle
  setTimeout(checkVignette, 700);
})();

// ===== Scroll Bottom Tap Toggle =====
// Hide only the bottom when tapped; register easter egg with the server
const scrollBottom = document.querySelector('.scroll-bottom');
const scrollTop = document.querySelector('.scroll-top');
let bottomHidden = false;
if (scrollBottom) {
  scrollBottom.addEventListener('click', () => {
    bottomHidden = !bottomHidden;
    if (bottomHidden) {
      scrollBottom.style.display = 'none';
      // Reveal crossword when bottom is tapped
      const crossword = document.getElementById('crosswordSection');
      if (crossword) crossword.style.display = '';
      // Register easter egg via endpoint (non-blocking)
      setTimeout(() => {
        if (typeof unlockEasterEgg === 'function') unlockEasterEgg('scroll_bottom_tap');
        else console.warn('unlockEasterEgg not available yet');
      }, 0);
    } else {
      scrollBottom.style.display = '';
      // Hide crossword when bottom is restored
      const crossword = document.getElementById('crosswordSection');
      if (crossword) crossword.style.display = 'none';
    }
  });
}

// If user taps the top area while bottom is hidden, restore the bottom
if (scrollTop) {
  scrollTop.addEventListener('click', () => {
    if (bottomHidden) {
      bottomHidden = false;
      if (scrollBottom) scrollBottom.style.display = '';
    }
  });
}

// ===== Easter Egg Counter =====
const eggCountText = document.getElementById('eggCountText');

const updateEggCounter = async () => {
  if (!eggCountText) return;
  const gemCountText = document.getElementById('gemCountText');
  try {
    const res = await fetch('/api/easter-eggs/progress', { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    if (data && data.ok) {
      eggCountText.textContent = `${data.foundCount} / ${data.total}`;
      const gems = data.gems !== undefined ? data.gems : 0;

      // Update lock state
      checkPageLock(data.foundCount, gems);

      if (gemCountText) {
        const oldVal = gemCountText.textContent;
        const newVal = gems;
        gemCountText.textContent = newVal;
        // Animation when gems increase (ignore initial load "0" to actual)
        if (oldVal !== "0" && oldVal !== newVal.toString() && oldVal !== "—") {
          const icon = gemCountText.parentElement;
          icon.classList.remove('gem-bounce');
          void icon.offsetWidth;
          icon.classList.add('gem-bounce');
        }
      }
    }
  } catch {
    // silently ignore — counter just stays at previous value
  }
};

// Load count on page open
updateEggCounter();

// Re-evaluate lock after full render/images settle (important for mobile layout heights).
window.addEventListener('load', () => {
  updateEggCounter();
  handlePageScroll();
});

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
}


const showGemToast = (amount) => {
  const toast = document.createElement('div');
  toast.className = 'gem-reward-toast';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:24px;height:24px;color:#00f2ff;filter:drop-shadow(0 0 8px rgba(0,242,255,0.8));">
      <path d="M12 2L4.5 9L12 22L19.5 9L12 2Z" />
    </svg>
    <span>+${amount} GEMS</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('show');
    dingSfx.currentTime = 0;
    dingSfx.play().catch(e => console.log('Ding play failed:', e));
  }, 100);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
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
      if (payload.gemsEarned > 0) {
        setTimeout(() => showGemToast(payload.gemsEarned), 800);
      }
      updateEggCounter();
    }
  } catch (error) {
    console.warn('Easter egg unlock failed:', error);
  }
};

async function removeBat() {
  console.log('removeBat invoked');
  const input = document.getElementById('batRemovalInput');
  const batImg = document.getElementById('batImage');
  const batSection = document.getElementById('batEasterEgg');

  if (!input || !batImg || !batSection) {
    console.warn('Bat removal elements missing');
    return;
  }

  // Ensure shake keyframes exist
  if (!document.getElementById('bat-shake-style')) {
    const s = document.createElement('style');
    s.id = 'bat-shake-style';
    s.textContent = `@keyframes bat-shake { 0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)} }`;
    document.head.appendChild(s);
  }

  const entered = input.value.trim().toLowerCase();
  const correct = 'prakashah';

  // Message element (first paragraph in the bat section)
  const msgEl = batSection.querySelector('p');
  if (entered === correct) {
    // Create a full-screen flash overlay appended to body to avoid stacking/context issues
    const overlay = document.createElement('div');
    overlay.id = 'batFlashOverlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      background: '#fff',
      zIndex: '99999'
    });
    document.body.appendChild(overlay);
    // Play whoosh sound when the flash appears
    if (typeof whooshSfx !== 'undefined') {
      whooshSfx.currentTime = 0;
      whooshSfx.play().catch((err) => console.log('Whoosh sound play failed:', err));
    }

    // Keep flash visible for 0.5s, then remove overlay and hide the bat
    setTimeout(() => {
      // Remove overlay
      overlay.remove();
      // Hide bat image
      batImg.style.display = 'none';
      // Replace section with success message
      batSection.innerHTML = '<p style="font-family: \'Cinzel\', serif; color:#005300; text-align:center;">The bat has disappeared! 🎉</p>';
      // Persist state so the bat does not reappear on reload
      try { setBatRemovedPersistent(); } catch (e) { /* ignore */ }
      // Unlock easter egg on the server
      unlockEasterEgg('bat_disappearance');
    }, 500);
  } else {
    // Incorrect word – visual shake + inline error message
    input.style.animation = 'bat-shake 0.5s';
    // Show temporary error message
    if (msgEl) {
      const original = msgEl.textContent;
      msgEl.textContent = 'Incorrect word. Try again.';
      msgEl.style.color = '#ff4444';
      setTimeout(() => {
        msgEl.textContent = original;
        msgEl.style.color = '#300000';
      }, 1500);
    }
    setTimeout(() => {
      input.style.animation = '';
    }, 500);
  }
}

// Expose globally for inline HTML handlers
window.removeBat = removeBat;

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
  if (videoModal && modalContent) {
    modalContent.classList.remove('modal-show');
    // Wait for animation to finish before hiding container
    setTimeout(() => {
      videoModal.classList.add('hidden');
      videoModal.classList.remove('flex');
    }, 500);
  }
};

if (draculaImg && videoModal && modalContent) {
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

  // Close modal when clicking outside content area
  videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) closeDraculaModal();
  });
}

// ===== Morse Code Quiz Functionality =====
async function checkMorseAnswer() {
  const answerInput = document.getElementById('morseAnswer');
  const feedback = document.getElementById('quizFeedback');
  const quizContainer = document.getElementById('morseQuiz');

  if (!answerInput || !feedback) return;

  const userAnswer = answerInput.value.trim();
  const correctAnswer = '.-.'; // Morse code for 'R' is ".-."

  if (userAnswer === correctAnswer || userAnswer === '. - .' || userAnswer === '.-.') {
    feedback.textContent = 'Correct! You earned exactly 100 gems! 🎉';
    feedback.style.color = '#005300';

    // Hide the quiz after correct answer
    setTimeout(() => {
      if (quizContainer) {
        quizContainer.style.display = 'none';
      }
    }, 3000);

    // Add exactly 100 gems (not an easter egg) with one-time reward tracking
    const result = await addGems(100, 'morse_quiz_reward');

    if (result.success) {
      feedback.textContent = 'Correct! You earned exactly 100 gems! 🎉';
    } else if (result.alreadyClaimed) {
      feedback.textContent = 'You have already claimed this reward!';
      feedback.style.color = '#ff8800';

      // Hide the quiz if already claimed
      setTimeout(() => {
        if (quizContainer) {
          quizContainer.style.display = 'none';
        }
      }, 3000);
    } else {
      feedback.textContent = 'Error claiming reward. Please try again.';
      feedback.style.color = '#ff4444';
    }
  } else {
    feedback.textContent = 'Incorrect. Try again!';
    feedback.style.color = '#ff4444';

    // Clear feedback after 2 seconds
    setTimeout(() => {
      feedback.textContent = '';
    }, 2000);
  }
}

// ===== Crossword Puzzle Functionality =====
async function checkCrosswordAnswers() {
  const feedback = document.getElementById('crosswordFeedback');
  if (!feedback) return;

  // Gather letters from the grid
  const getCell = (r, c) => {
    const el = document.getElementById(`cell-${r}-${c}`);
    return el ? el.value.trim().toUpperCase() : '';
  };

  // Across word (row 1, cols 1-4) should be CHEF (first cell prefilled with C)
  const across = [1, 2, 3, 4].map(col => getCell(1, col)).join('');
  // Down word (col 1, rows 1-7) should be CONQUER (first cell is C from across)
  const down = [1, 2, 3, 4, 5, 6, 7].map(row => getCell(row, 1)).join('');

  const correctAcross = 'CHEF';
  const correctDown = 'CONQUER';

  if (across === correctAcross && down === correctDown) {
    feedback.textContent = 'Correct! You earned 200 gems! 🎉';
    feedback.style.color = '#005300';
    const result = await addGems(200, 'crossword_reward');
    if (!result.success && result.alreadyClaimed) {
      feedback.textContent = 'You have already claimed this reward!';
      feedback.style.color = '#ff8800';
    }
    // Hide crossword after success
    setTimeout(() => {
      const section = document.getElementById('crosswordSection');
      if (section) section.style.display = 'none';
    }, 3000);
  } else {
    feedback.textContent = 'Incorrect. Try again!';
    feedback.style.color = '#ff4444';
  }
}

// Attach event listener for crossword button
const checkCrosswordBtn = document.getElementById('checkCrosswordBtn');
if (checkCrosswordBtn) {
  checkCrosswordBtn.addEventListener('click', checkCrosswordAnswers);
}

// Quiz is now always visible, no need for click event

// ===== Leaderboard Logic =====
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const closeLeaderboard = document.getElementById('closeLeaderboard');
const leaderboardBody = document.getElementById('leaderboardBody');

// Format a leaderboard row. If `isCurrent` is true, the row gets a green border and the name is wrapped in brackets.
const formatLeaderboardRow = (user, index, isCurrent = false) => {
  const isTop3 = index < 3;
  // Use professional dark accent colors for ranking
  const rankColor = isTop3 ? ['#b8860b', '#707070', '#8b4513'][index] : '#1a0f05cc';
  const rowBg = isTop3 ? 'rgba(0, 0, 0, 0.03)' : 'transparent';
  // Highlight current user with a subtle green background and display "[You]"
  const currentStyle = isCurrent ? 'background: rgba(0, 211, 0, 0.15);' : 'background: transparent;';
  const username = user.username || '@seeker';
  const displayName = isCurrent ? '[You]' : username;

  // Show avatar (if provided) as a small circle to the left of the name
  const avatarHtml = user.profilePic
    ? `<img src="${user.profilePic}" alt="avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;margin-right:10px;border:2px solid rgba(255,255,255,0.06);"/>`
    : (function(){
        const initial = (username && String(username).trim().replace(/^@/, '').charAt(0).toUpperCase()) || '?';
        return `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#222,#444);display:inline-flex;align-items:center;justify-content:center;margin-right:10px;border:2px solid rgba(255,255,255,0.04);font-family: 'Cinzel', serif;color:#fff;font-weight:700;font-size:16px;">${initial}</div>`;
      })();

  return `
    <tr style="background: ${rowBg}; border-bottom: 1px solid rgba(0,0,0,0.05); ${currentStyle}">
      <td class="px-5 py-4 rounded-l-2xl">
        <span class="font-cinzel text-sm font-black" style="color: ${rankColor}">${index + 1}</span>
      </td>
      <td class="px-5 py-4">
        <div class="flex items-center">
          ${avatarHtml}
          <div class="flex flex-col">
            <span class="text-base tracking-wide capitalize text-[#1a0f05] font-bold">${displayName}</span>
            <span class="text-[10px] text-[#1a0f05]/60 uppercase font-bold tracking-[0.2em]">${user.classSec}</span>
          </div>
        </div>
      </td>
      <td class="px-5 py-4 text-right rounded-r-2xl">
        <div class="flex flex-col items-end">
          <span class="font-cinzel text-sm text-[#1a0f05] font-black">${user.exp.toLocaleString()}</span>
          <span class="text-[9px] text-[#1a0f05]/40 font-bold tracking-tight">${user.eggs}🥚 · ${user.gems}💎</span>
        </div>
      </td>
    </tr>
  `;
};

// Fetch current session user info
let currentSessionUser = null;
const fetchCurrentUser = async () => {
  // Retrieve the currently logged‑in user from the session endpoint.
  // The endpoint returns { authenticated: Boolean, user: Object|null }.
  // We store the user object (if any) in `currentSessionUser` for leaderboard highlighting.
  try {
    // Use the richer profile endpoint so we include `username` when present
    const res = await fetch('/api/user/me', { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    if (data && data.ok && data.user) {
      currentSessionUser = data.user;
      console.log('Fetched current user:', currentSessionUser);
    } else {
      currentSessionUser = null;
      console.log('No authenticated user found');
    }
  } catch (e) {
    console.error('Failed to fetch current user:', e);
    currentSessionUser = null;
  }
};

const fetchLeaderboard = async () => {
  if (!leaderboardBody) return;
  leaderboardBody.innerHTML = '<tr><td colspan="3" class="text-center py-10 opacity-40 font-cinzel text-xs tracking-widest animate-pulse">Consulting the archives...</td></tr>';
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    if (data && data.ok) {
      if (data.leaderboard.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="3" class="text-center py-10 opacity-30 font-cinzel text-xs uppercase tracking-[0.2em]">No seekers found yet</td></tr>';
      } else {
        leaderboardBody.innerHTML = data.leaderboard
          .map((user, i) => {
            const isCurrent = Boolean(user.isCurrentUser);
            console.log('Leaderboard row', i, 'user:', user.username, 'isCurrent:', isCurrent);
            return formatLeaderboardRow(user, i, isCurrent);
          })
          .join('');
      }
    }
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    leaderboardBody.innerHTML = '<tr><td colspan="3" class="text-center py-10 text-red-400/50 font-cinzel text-[10px]">Failed to fetch rankings</td></tr>';
  }
};

if (leaderboardBtn && leaderboardModal) {
  leaderboardBtn.addEventListener('click', () => {
    fetchLeaderboard();
    leaderboardModal.classList.remove('hidden');
    leaderboardModal.classList.add('flex');
    setTimeout(() => leaderboardModal.classList.add('opacity-100'), 10);
  });
}

const hideLeaderboard = () => {
  if (!leaderboardModal) return;
  leaderboardModal.classList.remove('opacity-100');
  setTimeout(() => {
    leaderboardModal.classList.add('hidden');
    leaderboardModal.classList.remove('flex');
  }, 500);
};

if (closeLeaderboard) closeLeaderboard.addEventListener('click', hideLeaderboard);
if (leaderboardModal) {
  leaderboardModal.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) hideLeaderboard();
  });
}

// ===== Profile Modal & Upload Logic =====
const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const cancelProfileBtn = document.getElementById('cancelProfileBtn');
const profileFileInput = document.getElementById('profileFileInput');
const profileAvatarImg = document.getElementById('profileAvatarImg');
const profileNameEl = document.getElementById('profileName');
const profileClassEl = document.getElementById('profileClass');
const profileRollEl = document.getElementById('profileRoll');
const profileAccessEl = document.getElementById('profileAccess');
const profileUsernameInput = document.getElementById('profileUsernameInput');
const saveProfilePicBtn = document.getElementById('saveProfilePicBtn');
const profileStatus = document.getElementById('profileStatus');

let stagedProfileDataUrl = null;

const openProfileModal = async () => {
  if (!profileModal) return;
  profileStatus.textContent = '';
  profileModal.classList.remove('hidden');
  profileModal.classList.add('flex');
  // also add modal-show to animate the inner content into view
  setTimeout(() => {
    profileModal.classList.add('opacity-100');
    const inner = profileModal.querySelector('.modal-content-base');
    if (inner) inner.classList.add('modal-show');
  }, 10);
  // Load user info
  try {
    const res = await fetch('/api/user/me', { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    if (data && data.ok && data.user) {
      profileNameEl.textContent = data.user.name || '—';
      profileClassEl.textContent = data.user.classSec || '—';
      profileRollEl.textContent = data.user.rollNo || '—';
      profileAccessEl.textContent = data.user.accessMasked || '—';
      if (profileUsernameInput) profileUsernameInput.value = data.user.username ? ('@' + data.user.username) : '';
      if (data.user.profilePic) {
        profileAvatarImg.src = data.user.profilePic;
      }
    }
  } catch (e) {
    console.warn('Failed to load profile', e);
  }
};

const closeProfileModal = () => {
  if (!profileModal) return;
  profileModal.classList.remove('opacity-100');
  const inner = profileModal.querySelector('.modal-content-base');
  if (inner) inner.classList.remove('modal-show');
  setTimeout(() => {
    profileModal.classList.add('hidden');
    profileModal.classList.remove('flex');
  }, 300);
};

if (profileBtn) profileBtn.addEventListener('click', openProfileModal);
if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeProfileModal);
if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeProfileModal);

function handleSelectedFile(f) {
  if (!f) return;
  profileStatus.textContent = 'Processing image...';
  return compressImageFileToDataUrl(f, 190000 /* target bytes for base64 length */)
    .then((dataUrl) => {
      stagedProfileDataUrl = dataUrl;
      if (profileAvatarImg) profileAvatarImg.src = dataUrl;
      profileStatus.textContent = '';
    })
    .catch((err) => {
      console.error('Image processing failed', err);
      profileStatus.textContent = 'Failed to process image. Try a smaller file.';
      setTimeout(() => profileStatus.textContent = '', 2500);
    });
}

if (profileFileInput) {
  profileFileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    handleSelectedFile(f);
  });
}

// Drag & drop support
const profileDropZone = document.getElementById('profileDropZone');

// Prevent the browser from opening files dropped outside the drop zone
['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) => {
  window.addEventListener(evt, (e) => {
    // Only prevent default for file drag/drop events
    if (e && e.dataTransfer) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, false);
});

if (profileDropZone) {
  profileDropZone.addEventListener('click', () => {
    if (profileFileInput) profileFileInput.click();
  });
  profileDropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (profileFileInput) profileFileInput.click();
    }
  });

  profileDropZone.addEventListener('dragenter', (e) => {
    if (e && e.dataTransfer) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    }
    profileDropZone.classList.add('dragover');
  });

  profileDropZone.addEventListener('dragover', (e) => {
    if (e && e.dataTransfer) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    }
    profileDropZone.classList.add('dragover');
  });

  profileDropZone.addEventListener('dragleave', (e) => {
    if (e && e.dataTransfer) {
      e.preventDefault();
      e.stopPropagation();
    }
    profileDropZone.classList.remove('dragover');
  });

  profileDropZone.addEventListener('drop', (e) => {
    if (e && e.dataTransfer) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    }
    profileDropZone.classList.remove('dragover');
    const f = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    if (!f) return;
    // set the hidden input's files for compatibility
    try {
      const dt = new DataTransfer();
      dt.items.add(f);
      if (profileFileInput) profileFileInput.files = dt.files;
    } catch (err) {
      // ignore if DataTransfer unavailable
    }
    handleSelectedFile(f);
  });
}

// Compress/resample an image file to a dataURL under maxBytes (approx base64 length)
function compressImageFileToDataUrl(file, maxBytes) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 512; // max width/height
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.max(width / maxDim, height / maxDim);
          width = Math.round(width / ratio);
          height = Math.round(height / ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try quality levels until under limit (for jpeg/webp)
        const mime = 'image/jpeg';
        let quality = 0.9;
        function attempt() {
          const dataUrl = canvas.toDataURL(mime, quality);
          // approximate byte length of base64: length of string
          if (dataUrl.length <= maxBytes || quality <= 0.35) {
            URL.revokeObjectURL(url);
            resolve(dataUrl);
          } else {
            quality -= 0.12;
            attempt();
          }
        }
        attempt();
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load error'));
    };
    img.src = url;
  });
}

if (saveProfilePicBtn) {
  saveProfilePicBtn.addEventListener('click', async () => {
    const rawUsername = profileUsernameInput ? String(profileUsernameInput.value || '').replace(/^@+/, '').trim() : '';
    const payload = {};
    if (stagedProfileDataUrl) payload.profilePic = stagedProfileDataUrl;
    if (rawUsername) payload.username = rawUsername;

    if (rawUsername && !/^[a-zA-Z0-9_]{2,30}$/.test(rawUsername)) {
      profileStatus.textContent = 'Invalid username. Use 2–30 letters, numbers or underscores.';
      return;
    }

    if (!payload.profilePic && !payload.username) {
      profileStatus.textContent = 'Choose an image or enter a username.';
      return;
    }

    profileStatus.textContent = 'Saving...';
    try {
      const res = await fetch('/api/user/profile-pic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.ok) {
        profileStatus.textContent = 'Saved.';
        if (payload.username && profileUsernameInput) {
          profileUsernameInput.value = `@${payload.username}`;
        }
        // Refresh leaderboard if open
        if (leaderboardModal && leaderboardModal.classList.contains('flex')) fetchLeaderboard();
      } else {
        profileStatus.textContent = 'Save failed: ' + (data?.error || 'unknown');
      }
    } catch (err) {
      console.error('Profile save failed', err);
      profileStatus.textContent = 'Save failed.';
    }
    setTimeout(() => { profileStatus.textContent = ''; }, 2500);
  });
}

// ===== Reset Data Logic =====
const resetDataBtn = document.getElementById('resetDataBtn');
const resetDataModal = document.getElementById('resetDataModal');
const confirmResetBtn = document.getElementById('confirmResetBtn');
const cancelResetBtn = document.getElementById('cancelResetBtn');
const alertModal = document.getElementById('alertModal');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const alertOkBtn = document.getElementById('alertOkBtn');

// Helper function to show alert modal
function showAlertModal(title, message) {
  return new Promise((resolve) => {
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertModal.classList.add('active');
    
    const handleClose = () => {
      alertModal.classList.remove('active');
      alertOkBtn.removeEventListener('click', handleClose);
      resolve();
    };
    
    alertOkBtn.addEventListener('click', handleClose);
  });
}

// Helper function to show reset confirmation modal
function showResetConfirmModal() {
  return new Promise((resolve) => {
    resetDataModal.classList.add('active');
    
    const handleConfirm = async () => {
      resetDataModal.classList.remove('active');
      confirmResetBtn.removeEventListener('click', handleConfirm);
      cancelResetBtn.removeEventListener('click', handleCancel);
      resolve(true);
    };
    
    const handleCancel = () => {
      resetDataModal.classList.remove('active');
      confirmResetBtn.removeEventListener('click', handleConfirm);
      cancelResetBtn.removeEventListener('click', handleCancel);
      resolve(false);
    };
    
    confirmResetBtn.addEventListener('click', handleConfirm);
    cancelResetBtn.addEventListener('click', handleCancel);
  });
}

if (resetDataBtn) {
  resetDataBtn.addEventListener('click', async () => {
    const confirmed = await showResetConfirmModal();

    if (confirmed) {
      try {
        const res = await fetch('/api/user/reset-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.ok) {
          showEggToast("Progress Reset Successful");
          // Refresh the page to reset all states or manually update
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          await showAlertModal("Reset Failed", "Failed to reset data: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        console.error("Reset error:", err);
        await showAlertModal("Error", "An error occurred while resetting your data.");
      }
    }
  });
}

// ===== Help Tutorial Logic =====
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelp = document.getElementById('closeHelp');

const showHelp = () => {
  if (!helpModal) return;
  const content = helpModal.querySelector('.modal-content-base');
  helpModal.classList.remove('hidden');
  helpModal.classList.add('flex');
  if (content) content.classList.add('modal-show');
  // Fade in background overlay
  setTimeout(() => helpModal.classList.add('opacity-100'), 10);
};

const hideHelp = () => {
  if (!helpModal) return;
  const content = helpModal.querySelector('.modal-content-base');
  helpModal.classList.remove('opacity-100');
  if (content) content.classList.remove('modal-show');
  setTimeout(() => {
    helpModal.classList.add('hidden');
    helpModal.classList.remove('flex');
  }, 500);
};

if (helpBtn) helpBtn.addEventListener('click', showHelp);
if (closeHelp) closeHelp.addEventListener('click', hideHelp);
if (helpModal) {
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) hideHelp();
  });
}

// Add gems without counting as easter egg
const addGems = async (amount, rewardId = null) => {
  try {
    const body = { gems: amount };
    if (rewardId) {
      body.rewardId = rewardId;
    }

    const res = await fetch('/api/add-gems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data && data.ok) {
      console.log(`Added ${amount} gems successfully`);
      // Update the UI to reflect the new gem count
      updateGemCount(data.gems);
      return { success: true, data };
    } else {
      console.error('Failed to add gems:', data?.error);
      return { success: false, error: data?.error, alreadyClaimed: data?.alreadyClaimed };
    }
  } catch (err) {
    console.error('Error adding gems:', err);
    return { success: false, error: err.message };
  }
};

// Update gem count display
const updateGemCount = (gems) => {
  const gemCountText = document.getElementById('gemCountText');
  if (gemCountText) {
    gemCountText.textContent = gems;
  }
};

// ===== Scroll Reveal Logic =====
const initScrollReveal = () => {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Target all meaningful content elements
  const selectors = [
    '.castle-section p',
    '.castle-section img',
    '.dracula-section p',
    '.dracula-section img',
    '.dracula-story',
    '.quiz-container',
    '.dracula-row',
    '.dracula-narrative'
  ];

  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      // Avoid fixed or already animated elements
      if (!el.closest('#storyHeader') && !el.closest('#loadingShield')) {
        el.classList.add('reveal');
        revealObserver.observe(el);
      }
    });
  });
};

// Initialize after content load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollReveal);
} else {
  initScrollReveal();
}

// ===== Draggable Key Easter Egg =====
(() => {
  const key = document.getElementById('draggableKey');
  const door = document.getElementById('mysteriousDoor');
  if (!key || !door) return;

  let isDragging = false;
  let startX, startY;
  let initialLeft, initialTop;

  // Store original fixed positions to snap back if needed
  // Using fixed values that match the CSS initial state for consistency
  const originBottom = 18;
  const originLeftOffset = 22;

  key.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const currentRect = key.getBoundingClientRect();
    key.style.bottom = 'auto';
    key.style.left = currentRect.left + 'px';
    key.style.top = currentRect.top + 'px';
    
    initialLeft = currentRect.left;
    initialTop = currentRect.top;
    
    key.setPointerCapture(e.pointerId);
    key.style.transition = 'none';
    key.style.zIndex = '1000';
    key.style.transform = 'scale(1.2) rotate(15deg)';
  });

  key.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    key.style.left = (initialLeft + dx) + 'px';
    key.style.top = (initialTop + dy) + 'px';
  });

  key.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    key.releasePointerCapture(e.pointerId);

    const keyRect = key.getBoundingClientRect();
    const doorRect = door.getBoundingClientRect();

    // Check for overlap between the key and the door
    const isOverDoor = (
      keyRect.left < doorRect.right &&
      keyRect.right > doorRect.left &&
      keyRect.top < doorRect.bottom &&
      keyRect.bottom > doorRect.top
    );

    if (isOverDoor) {
      // Trigger Easter Egg
      door.src = './assests/images/door-open.webp';
      unlockEasterEgg('door_key_unlock');
      
      // Success animation for the key before it disappears
      key.style.transition = 'all 0.5s ease-out';
      key.style.transform = 'scale(0) rotate(360deg)';
      key.style.opacity = '0';
      
      // Visual feedback on the door
      door.style.transition = 'filter 0.5s ease';
      door.style.filter = 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.8))';
      
      setTimeout(() => {
        key.style.display = 'none';
        door.style.filter = '';
      }, 1000);
    } else {
      // Snap back to original position
      key.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      key.style.transform = '';
      
      // We calculate where it should go back in the viewport
      // to match bottom: 18px; left: 22px;
      const targetLeft = originLeftOffset;
      const targetTop = window.innerHeight - originBottom - key.offsetHeight;
      
      key.style.left = targetLeft + 'px';
      key.style.top = targetTop + 'px';
      
      setTimeout(() => {
        if (!isDragging) {
          key.style.bottom = originBottom + 'px';
          key.style.left = originLeftOffset + 'px';
          key.style.top = 'auto';
          key.style.transition = '';
        }
      }, 600);
    }
  });


})();

// ===== PDF Download Button =====
document.getElementById('downloadPdfBtn')?.addEventListener('click', function() {
    const link = document.createElement('a');
    link.href = './storybook.pdf';
    link.download = 'storybook.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
