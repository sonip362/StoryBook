const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const TicketUser = require('./models/TicketUser');
const TicketSession = require('./models/TicketSession');

const app = express();
const PORT = process.env.PORT || 8080;
const TOTAL_EASTER_EGGS = 10;

const getMongoUri = () => process.env.MONGODB_URI || process.env['MONGODB-URL'] || '';

const normalizeString = (value) => String(value || '').trim();
const normalizeName = (value) => normalizeString(value).toLowerCase();
const normalizeClassSec = (value) => normalizeString(value).toUpperCase().replace(/\s+/g, '');
const normalizeAccessCode = (value) => normalizeString(value).toLowerCase().replace(/\s+/g, '');
const normalizeRollNo = (value) => {
  const trimmed = normalizeString(value);
  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) ? asNumber : null;
};

const parseCookies = (cookieHeader) => {
  const cookies = {};
  const header = String(cookieHeader || '');
  if (!header) return cookies;
  header.split(';').forEach((part) => {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey ? rawKey.trim() : '';
    if (!key) return;
    cookies[key] = rest.join('=').trim();
  });
  return cookies;
};

const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const SESSION_TTL_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const setSession = async (res, user, rememberMe) => {
  const sessionId = crypto.randomUUID();
  const ttl = rememberMe ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);

  await TicketSession.create({ sessionId, user, expiresAt });

  const maxAgeSeconds = Math.floor(ttl / 1000);
  res.setHeader('Set-Cookie', [
    `sb_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`
  ]);
};

const getSessionUser = async (req) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.sb_session;
  if (!sessionId) return null;

  const entry = await TicketSession.findOne({ sessionId }).select('user expiresAt').lean();
  if (!entry) return null;

  if (entry.expiresAt && Date.now() >= new Date(entry.expiresAt).getTime()) {
    await TicketSession.deleteOne({ sessionId });
    return null;
  }

  return entry.user || null;
};

const getUserQueryFromSession = (sessionUser) => ({
  nameNormalized: normalizeName(sessionUser.name),
  rollNo: normalizeRollNo(sessionUser.rollNo),
  classSecNormalized: normalizeClassSec(sessionUser.classSec)
});

// Middleware
app.use(express.json({ limit: '1mb' }));

// DB
const mongoUri = getMongoUri();
if (!mongoUri) {
  console.error('Missing MongoDB URL. Set MONGODB_URI or MONGODB-URL in .env');
} else {
  mongoose
    .connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
}

// Routes
app.get('/', (_req, res) => {
  res.redirect('/qr-login.html');
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api/session', (req, res) => {
  getSessionUser(req)
    .then((user) => res.json({ authenticated: Boolean(user), user: user || null }))
    .catch(() => res.json({ authenticated: false, user: null }));
});

app.post('/api/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.sb_session;

  const clearCookie = () => {
    res.setHeader('Set-Cookie', 'sb_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ ok: true });
  };

  if (!sessionId) return clearCookie();
  TicketSession.deleteOne({ sessionId })
    .then(() => clearCookie())
    .catch(() => clearCookie());
});

app.post('/api/ticket/verify', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'Database not connected. Try again in a moment.' });
    }

    const { name, rollNo, classSec, accessCode, rememberMe } = req.body || {};

    const inputName = normalizeName(name);
    const inputRollNo = normalizeRollNo(rollNo);
    const inputClassSec = normalizeClassSec(classSec);
    const inputCode = normalizeAccessCode(accessCode);

    if (!inputName || inputRollNo === null || !inputClassSec || !inputCode) {
      return res.status(400).json({ ok: false, error: 'Missing or invalid fields.' });
    }

    // Query by accessCode first (unique), then verify other fields after normalization.
    // This stays compatible even if older rows are missing normalized fields.
    const user = await TicketUser.findOne({ accessCodeNormalized: inputCode })
      .select('name rollNo classSec accessCode accessCodeNormalized')
      .lean();
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid details.' });

    const match =
      normalizeName(user.name) === inputName &&
      normalizeRollNo(user.rollNo) === inputRollNo &&
      normalizeClassSec(user.classSec) === inputClassSec &&
      normalizeAccessCode(user.accessCodeNormalized || user.accessCode) === inputCode;

    if (!match) return res.status(401).json({ ok: false, error: 'Invalid details.' });

    await setSession(res, { name: user.name, rollNo: user.rollNo, classSec: user.classSec }, Boolean(rememberMe));
    return res.json({ ok: true, user: { name: user.name, rollNo: user.rollNo, classSec: user.classSec } });
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

app.get('/api/easter-eggs/progress', async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'Database not connected. Try again in a moment.' });
    }

    const user = await TicketUser.findOne(getUserQueryFromSession(sessionUser))
      .select('easterEggs')
      .lean();

    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

    const unlocked = Array.isArray(user.easterEggs) ? user.easterEggs : [];
    return res.json({
      ok: true,
      unlocked,
      foundCount: unlocked.length,
      total: TOTAL_EASTER_EGGS
    });
  } catch (err) {
    console.error('Easter egg progress error:', err);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

app.post('/api/easter-eggs/unlock', async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'Database not connected. Try again in a moment.' });
    }

    const rawEggId = normalizeString(req.body?.eggId);
    const eggId = rawEggId.toLowerCase();
    if (!/^[a-z0-9_-]{1,64}$/.test(eggId)) {
      return res.status(400).json({ ok: false, error: 'Invalid egg id.' });
    }

    const user = await TicketUser.findOne(getUserQueryFromSession(sessionUser))
      .select('_id easterEggs')
      .lean();
    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

    const unlocked = Array.isArray(user.easterEggs) ? user.easterEggs : [];
    const alreadyUnlocked = unlocked.includes(eggId);

    if (!alreadyUnlocked) {
      await TicketUser.updateOne(
        { _id: user._id },
        { $addToSet: { easterEggs: eggId } }
      );
    }

    const foundCount = alreadyUnlocked ? unlocked.length : unlocked.length + 1;
    return res.json({
      ok: true,
      eggId,
      newlyUnlocked: !alreadyUnlocked,
      foundCount,
      total: TOTAL_EASTER_EGGS
    });
  } catch (err) {
    console.error('Easter egg unlock error:', err);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

app.get('/storybook.html', (req, res) => {
  getSessionUser(req)
    .then((user) => {
      if (!user) return res.redirect('/qr-login.html');
      return res.sendFile(path.join(__dirname, 'storybook.html'));
    })
    .catch(() => res.redirect('/qr-login.html'));
});

// Static assets (keep after protected routes so `/storybook.html` can't bypass auth)
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`StoryBook server running at http://localhost:${PORT}`);
});
