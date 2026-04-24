const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const cors = require('cors');
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
const normalizeUsername = (value) => {
  const raw = normalizeString(value);
  if (!raw) return { username: null, usernameNormalized: null };
  const withAt = raw.startsWith('@') ? raw : `@${raw}`;
  const handle = withAt.slice(1);
  if (!/^[A-Za-z0-9_]{2,20}$/.test(handle)) {
    return { username: null, usernameNormalized: null };
  }
  return { username: `@${handle}`, usernameNormalized: `@${handle.toLowerCase()}` };
};
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

// Middleware — CORS for GitHub Pages ↔ Render cross-origin requests
app.use(cors({
  // Allow any origin (including requests with no origin). This is suitable for
  // development environments where the server may be accessed from various
  // devices on the local network. Credentials are still allowed so that the
  // session cookie works across origins.
  origin: function (origin, callback) {
    // If there is no origin (e.g., curl, mobile apps) or any origin, allow it.
    return callback(null, true);
  },
  credentials: true                // Allow cookies (sb_session) cross-origin
}));
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

// Lightweight ping for Loading Shield (wakes Render from cold start)
app.get('/ping', (_req, res) => {
  res.json({ status: 'awake' });
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
      .select('name rollNo classSec accessCode accessCodeNormalized used')
      .lean();
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid details.' });

    // Check if access code has already been used
    if (user.used) {
      return res.status(401).json({ ok: false, error: 'This access code has already been used.' });
    }

    const match =
      normalizeName(user.name) === inputName &&
      normalizeRollNo(user.rollNo) === inputRollNo &&
      normalizeClassSec(user.classSec) === inputClassSec &&
      normalizeAccessCode(user.accessCodeNormalized || user.accessCode) === inputCode;

    if (!match) return res.status(401).json({ ok: false, error: 'Invalid details.' });

    // Mark access code as used
    await TicketUser.updateOne(
      { accessCodeNormalized: inputCode },
      { $set: { used: true } }
    );

    await setSession(res, { name: user.name, rollNo: user.rollNo, classSec: user.classSec }, Boolean(rememberMe));
    return res.json({ ok: true, user: { name: user.name, rollNo: user.rollNo, classSec: user.classSec } });
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

app.post('/api/admin/create-user', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'Database not connected.' });
    }

    const { name, rollNo, classSec, accessCode } = req.body || {};

    if (!name || !rollNo || !classSec || !accessCode) {
      return res.status(400).json({ ok: false, error: 'All fields (name, roll no, class, access code) are required.' });
    }

    const rollNoNum = Number(rollNo);
    if (!Number.isFinite(rollNoNum)) {
      return res.status(400).json({ ok: false, error: 'Roll No must be a number.' });
    }

    const classSecNormalized = normalizeClassSec(classSec);
    const accessCodeNormalized = normalizeAccessCode(accessCode);

    // Check for duplicates
    const existingUser = await TicketUser.findOne({
      $or: [
        { rollNo: rollNoNum, classSecNormalized },
        { accessCodeNormalized }
      ]
    }).lean();

    if (existingUser) {
      if (existingUser.accessCodeNormalized === accessCodeNormalized) {
        return res.status(409).json({ ok: false, error: 'Access code already in use.' });
      }
      return res.status(409).json({ ok: false, error: 'User with this Roll No and Class already exists.' });
    }

    const newUser = await TicketUser.create({
      name,
      rollNo: rollNoNum,
      classSec,
      accessCode
    });

    return res.json({ ok: true, user: newUser });
  } catch (err) {
    console.error('Admin create user error:', err);
    return res.status(500).json({ ok: false, error: 'Server error while creating user.' });
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
      .select('easterEggs gems')
      .lean();

    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

    const unlocked = Array.isArray(user.easterEggs) ? user.easterEggs : [];
    return res.json({
      ok: true,
      unlocked,
      foundCount: unlocked.length,
      total: TOTAL_EASTER_EGGS,
      gems: user.gems || 0
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
      .select('_id easterEggs gems')
      .lean();
    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

    const unlocked = Array.isArray(user.easterEggs) ? user.easterEggs : [];
    const alreadyUnlocked = unlocked.includes(eggId);
    let gemsEarned = 0;
    let newGemTotal = user.gems || 0;

    if (!alreadyUnlocked) {
      gemsEarned = 100 + Math.floor(Math.random() * 51); // 100 to 150 gems
      newGemTotal += gemsEarned;
      await TicketUser.updateOne(
        { _id: user._id },
        {
          $addToSet: { easterEggs: eggId },
          $inc: { gems: gemsEarned }
        }
      );
    }

    const foundCount = alreadyUnlocked ? unlocked.length : unlocked.length + 1;
    return res.json({
      ok: true,
      eggId,
      newlyUnlocked: !alreadyUnlocked,
      gemsEarned,
      gems: newGemTotal,
      foundCount,
      total: TOTAL_EASTER_EGGS
    });
  } catch (err) {
    console.error('Easter egg unlock error:', err);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

// Purchase unlock for an easter egg (deduct gems)
app.post('/api/easter-eggs/purchase-unlock', async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'Database not connected. Try again in a moment.' });
    }

    const rawEggId = normalizeString(req.body?.eggId || '');
    const eggId = rawEggId.toLowerCase();
    const cost = Number(req.body?.cost) || 300;
    if (!/^[a-z0-9_-]{1,64}$/.test(eggId)) {
      return res.status(400).json({ ok: false, error: 'Invalid egg id.' });
    }
    if (!Number.isFinite(cost) || cost <= 0 || cost > 1000000) {
      return res.status(400).json({ ok: false, error: 'Invalid cost.' });
    }

    const user = await TicketUser.findOne(getUserQueryFromSession(sessionUser))
      .select('_id easterEggs gems')
      .lean();
    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

    const unlocked = Array.isArray(user.easterEggs) ? user.easterEggs : [];
    if (unlocked.includes(eggId)) {
      return res.status(400).json({ ok: false, error: 'Already unlocked.' });
    }

    const currentGems = user.gems || 0;
    const MIN_RESERVE = 300; // user must keep this many gems after purchase
    if (currentGems < cost + MIN_RESERVE) {
      return res.status(400).json({ ok: false, error: `Insufficient gems. You must keep at least ${MIN_RESERVE} gems after purchase.` });
    }

    // Deduct cost and add egg to unlocked list (no gem reward when purchasing)
    await TicketUser.updateOne(
      { _id: user._id },
      { $inc: { gems: -cost }, $addToSet: { easterEggs: eggId } }
    );

    const updated = await TicketUser.findById(user._id).select('gems easterEggs').lean();
    const foundCount = Array.isArray(updated.easterEggs) ? updated.easterEggs.length : 0;

    return res.json({ ok: true, eggId, newlyUnlocked: true, gems: updated.gems || 0, foundCount, total: TOTAL_EASTER_EGGS, cost });
  } catch (err) {
    console.error('Purchase unlock error:', err);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

// Add gems without counting as easter egg
app.post('/api/add-gems', async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'Database not connected. Try again in a moment.' });
    }

    const gemsToAdd = parseInt(req.body?.gems) || 0;
    const rewardId = req.body?.rewardId;
    
    if (gemsToAdd <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid gem amount.' });
    }

    const user = await TicketUser.findOne(getUserQueryFromSession(sessionUser))
      .select('_id gems rewardsReceived')
      .lean();
    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

    // Check if this is a one-time reward and if user has already received it
    if (rewardId) {
      const rewardsReceived = Array.isArray(user.rewardsReceived) ? user.rewardsReceived : [];
      if (rewardsReceived.includes(rewardId)) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Reward already claimed.',
          alreadyClaimed: true
        });
      }
    }

    const newGemTotal = (user.gems || 0) + gemsToAdd;
    
    // Update gems and track reward if it's a one-time reward
    const updateData = { $inc: { gems: gemsToAdd } };
    if (rewardId) {
      updateData.$addToSet = { rewardsReceived: rewardId };
    }
    
    await TicketUser.updateOne(
      { _id: user._id },
      updateData
    );

    return res.json({
      ok: true,
      gemsAdded: gemsToAdd,
      gems: newGemTotal,
      rewardId: rewardId || null
    });
  } catch (err) {
    console.error('Add gems error:', err);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'Database not connected.' });
    }

    const users = await TicketUser.find({})
      .select('name username classSec rollNo easterEggs gems profilePic')
      .lean();

    const leaderboard = users.map(u => {
      const eggsCount = Array.isArray(u.easterEggs) ? u.easterEggs.length : 0;
      const gemsCount = u.gems || 0;
      const exp = eggsCount * gemsCount;
      const fallbackUsername = `@seeker${String(u._id || '').slice(-4) || '0000'}`;
      const usernameData = normalizeUsername(u.username);
      const isCurrentUser =
        normalizeName(u.name) === normalizeName(sessionUser.name) &&
        normalizeRollNo(u.rollNo) === normalizeRollNo(sessionUser.rollNo) &&
        normalizeClassSec(u.classSec) === normalizeClassSec(sessionUser.classSec);
      return {
        username: usernameData.username || fallbackUsername,
        classSec: u.classSec,
        eggs: eggsCount,
        gems: gemsCount,
        exp: exp,
        profilePic: u.profilePic || null,
        isCurrentUser
      };
    })
      .sort((a, b) => b.exp - a.exp)
      .slice(0, 50); // Top 50

    return res.json({ ok: true, leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

// Get current authenticated user's profile (includes masked access code and profile pic)
app.get('/api/user/me', async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'Database not connected.' });
    }

    const user = await TicketUser.findOne(getUserQueryFromSession(sessionUser))
      .select('name rollNo classSec accessCode profilePic username')
      .lean();
    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

    const access = String(user.accessCode || '');
    const accessMasked = access ? access.charAt(0) + '***' : null;

    return res.json({ ok: true, user: {
      name: user.name,
      rollNo: user.rollNo,
      classSec: user.classSec,
      accessMasked,
      profilePic: user.profilePic || null,
      username: normalizeUsername(user.username).username
    }});
  } catch (err) {
    console.error('/api/user/me error:', err);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

// Save/update profile picture (expects { profilePic: 'data:image/...;base64,...' })
app.post('/api/user/profile-pic', async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'Database not connected.' });
    }

    const rawProfile = req.body?.profilePic ? String(req.body.profilePic) : '';
    const rawUsername = req.body?.username ? String(req.body.username).trim() : '';

    if (!rawProfile && !rawUsername) return res.status(400).json({ ok: false, error: 'Missing profilePic or username.' });

    const updateObj = {};

    if (rawProfile) {
      // Basic size limit to prevent huge DB fields (~200KB)
      if (rawProfile.length > 200000) return res.status(400).json({ ok: false, error: 'Image too large.' });
      // Basic validation: should start with data:image/
      if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(rawProfile)) {
        return res.status(400).json({ ok: false, error: 'Invalid image format. Provide a base64 data URL.' });
      }
      updateObj.profilePic = rawProfile;
    }

    if (rawUsername) {
      const usernameData = normalizeUsername(rawUsername);
      if (!usernameData.username || !usernameData.usernameNormalized) {
        return res.status(400).json({ ok: false, error: 'Invalid username. Use 2-20 letters, numbers or underscores.' });
      }
      updateObj.username = usernameData.username;
      updateObj.usernameNormalized = usernameData.usernameNormalized;
    }

    const update = await TicketUser.updateOne(getUserQueryFromSession(sessionUser), { $set: updateObj });
    if (!update.acknowledged) return res.status(500).json({ ok: false, error: 'Failed to save.' });
    if (!update.matchedCount) return res.status(404).json({ ok: false, error: 'User not found.' });

    return res.json({ ok: true });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ ok: false, error: 'Username is already taken.' });
    }
    console.error('/api/user/profile-pic error:', err);
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

app.post('/api/user/reset-data', async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'Database not connected.' });
    }

    const userQuery = getUserQueryFromSession(sessionUser);
    await TicketUser.updateOne(userQuery, {
      $set: {
        easterEggs: [],
        gems: 0
      }
    });

    return res.json({ ok: true, message: 'Progress reset successfully.' });
  } catch (err) {
    console.error('Reset data error:', err);
    return res.status(500).json({ ok: false, error: 'Server error while resetting data.' });
  }
});

// Protected Storybook route
app.get('/storybook.html', (req, res) => {
  getSessionUser(req)
    .then((user) => {
      if (!user) return res.redirect('/qr-login.html');
      return res.sendFile(path.join(__dirname, 'storybook.html'));
    })
    .catch(() => res.redirect('/qr-login.html'));
});

app.use(express.static(path.join(process.cwd()), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`StoryBook server running at http://localhost:${PORT}`);
});
