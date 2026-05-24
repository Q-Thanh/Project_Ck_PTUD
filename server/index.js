import express from 'express';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import GoogleStrategy from 'passport-google-oauth20';
import FacebookStrategy from 'passport-facebook';
import { createStore } from './db.js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const backendOrigin = process.env.BACKEND_ORIGIN || `http://localhost:${process.env.BACKEND_PORT || process.env.PORT || 3100}`;

app.use(cors({ credentials: true, origin: frontendOrigin }));
app.use(express.json({ limit: '10mb' }));

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

let store;
let storeReady;

// Init DB
storeReady = (async () => {
  store = await createStore();
  console.log('✅ PostgreSQL connected');
})();

async function getStore() {
  if (!store) {
    await storeReady;
  }
  return store;
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

async function getRequestUser(req) {
  const userId = Number(req.headers['x-user-id'] || 0);
  if (!userId) return null;
  const dbStore = await getStore();
  return dbStore.getUserById(userId);
}

async function requireUser(req, res) {
  const user = await getRequestUser(req);
  if (!user) {
    res.status(401).json({ ok: false, message: 'Vui long dang nhap.' });
    return null;
  }
  return user;
}

async function requireAdmin(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (String(user.role) !== 'admin') {
    res.status(403).json({ ok: false, message: 'Ban khong co quyen admin.' });
    return null;
  }
  return user;
}

function hashSessionId(value) {
  const source = String(value || 'oauth-user');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash || Date.now();
}

function normalizeOAuthUser(profile, provider) {
  const email = profile.emails?.[0]?.value || `${profile.id}@${provider}.oauth.local`;
  const displayName = profile.displayName || email.split('@')[0] || 'OAuth User';
  return {
    id: hashSessionId(`${provider}:${profile.id || email}`),
    username: `${provider}_${String(profile.id || email).replace(/[^a-zA-Z0-9_-]/g, '')}`,
    displayName,
    email,
    role: 'user',
    provider,
    avatarUrl: profile.photos?.[0]?.value || '',
  };
}

function encodeOAuthToken(user) {
  return Buffer.from(JSON.stringify(user)).toString('base64url');
}

function redirectWithOAuthToken(res, user) {
  res.redirect(`${frontendOrigin}/auth/success?token=${encodeURIComponent(encodeOAuthToken(user))}`);
}

// ============ Google OAuth ============
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI || `${backendOrigin}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    done(null, normalizeOAuthUser(profile, 'google'));
  }));
}

// ============ Facebook OAuth ============
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy.Strategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_REDIRECT_URI || `${backendOrigin}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'photos']
  }, async (accessToken, refreshToken, profile, done) => {
    done(null, normalizeOAuthUser(profile, 'facebook'));
  }));
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  done(null, { id });
});

// ============ Routes ============
// Google
app.get('/api/auth/google',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).send('Google OAuth is not configured.');
    }
    return next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${frontendOrigin}/login` }),
  (req, res) => {
    redirectWithOAuthToken(res, req.user);
  }
);

// Facebook
app.get('/api/auth/facebook',
  (req, res, next) => {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      return res.status(503).send('Facebook OAuth is not configured.');
    }
    return next();
  },
  passport.authenticate('facebook')
);

app.get('/api/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: `${frontendOrigin}/login` }),
  (req, res) => {
    redirectWithOAuthToken(res, req.user);
  }
);

// Get current user
app.get('/api/auth/me', (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) res.status(500).json({ error: err });
    else res.json({ success: true });
  });
});

// Core API
app.get('/api/health', asyncRoute(async (_req, res) => {
  const dbStore = await getStore();
  res.json({ ok: true, ...(await dbStore.getHealth()) });
}));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const dbStore = await getStore();
  const result = await dbStore.registerUser(req.body || {});
  if (!result?.ok) {
    res.status(400).json(result || { ok: false, message: 'Dang ky that bai.' });
    return;
  }
  res.status(201).json(result);
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const dbStore = await getStore();
  const result = await dbStore.loginUser(req.body || {});
  if (!result?.ok) {
    res.status(401).json(result || { ok: false, message: 'Dang nhap that bai.' });
    return;
  }
  res.json(result);
}));

app.get('/api/users/me', asyncRoute(async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const dbStore = await getStore();
  const profile = await dbStore.getMyProfile(user.id);
  if (!profile) {
    res.status(404).json({ ok: false, message: 'Khong tim thay nguoi dung.' });
    return;
  }
  res.json({ ok: true, ...profile });
}));

app.put('/api/users/me/profile', asyncRoute(async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const dbStore = await getStore();
  const profile = await dbStore.updateMyProfile(user.id, req.body || {});
  if (!profile) {
    res.status(404).json({ ok: false, message: 'Khong tim thay nguoi dung.' });
    return;
  }
  res.json({ ok: true, ...profile });
}));

// Restaurants
app.get('/api/restaurants/nearby', asyncRoute(async (req, res) => {
  const dbStore = await getStore();
  const items = await dbStore.listNearbyRestaurants(req.query.lat, req.query.lng, {
    radiusKm: req.query.radiusKm,
    limit: req.query.limit,
  });
  res.json({ ok: true, items });
}));

app.get('/api/restaurants/decision', asyncRoute(async (req, res) => {
  const dbStore = await getStore();
  const item = await dbStore.decideRestaurant(req.query.lat, req.query.lng, {
    radiusKm: req.query.radiusKm,
  });
  res.json({ ok: true, item });
}));

app.get('/api/restaurants', asyncRoute(async (req, res) => {
  const dbStore = await getStore();
  const items = await dbStore.listPublicRestaurants({
    query: req.query.query,
    area: req.query.area,
    category: req.query.category,
  });
  res.json({ ok: true, items });
}));

app.get('/api/restaurants/:id', asyncRoute(async (req, res) => {
  const dbStore = await getStore();
  const item = await dbStore.getRestaurantById(req.params.id);
  if (!item) {
    res.status(404).json({ ok: false, message: 'Khong tim thay quan an.' });
    return;
  }
  res.json({ ok: true, item });
}));

// Community
app.get('/api/community/posts', asyncRoute(async (req, res) => {
  const dbStore = await getStore();
  const feed = await dbStore.listCommunityPosts({
    status: req.query.status,
    restaurantId: req.query.restaurantId,
    query: req.query.query,
    page: req.query.page,
    pageSize: req.query.pageSize,
  });
  res.json({ ok: true, ...feed });
}));

app.post('/api/community/posts', asyncRoute(async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const dbStore = await getStore();
  const result = await dbStore.submitPostForModeration(req.body || {}, user);
  if (!result?.ok) {
    res.status(400).json(result || { ok: false, message: 'Khong the tao bai dang.' });
    return;
  }
  res.status(201).json(result);
}));

app.post('/api/community/posts/:id/comments', asyncRoute(async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const dbStore = await getStore();
  const post = await dbStore.addCommentToPost(req.params.id, req.body || {}, user);
  if (!post) {
    res.status(400).json({ ok: false, message: 'Khong the them binh luan cho bai dang nay.' });
    return;
  }
  res.status(201).json({ ok: true, post });
}));

// Admin
app.get('/api/admin/stats', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  res.json({ ok: true, ...(await dbStore.getAdminStats(req.query.weekRange)) });
}));

app.get('/api/admin/restaurants', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const items = await dbStore.listAdminRestaurants({
    query: req.query.query,
    area: req.query.area,
    hidden: req.query.hidden,
  });
  res.json({ ok: true, items });
}));

app.post('/api/admin/restaurants', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const item = await dbStore.createRestaurant(req.body || {});
  res.status(201).json({ ok: true, item });
}));

app.patch('/api/admin/restaurants/:id', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const item = await dbStore.updateRestaurant(req.params.id, req.body || {});
  if (!item) {
    res.status(404).json({ ok: false, message: 'Khong tim thay quan an.' });
    return;
  }
  res.json({ ok: true, item });
}));

app.patch('/api/admin/restaurants/:id/visibility', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const item = await dbStore.toggleRestaurantVisibility(req.params.id, Boolean(req.body?.hidden));
  if (!item) {
    res.status(404).json({ ok: false, message: 'Khong tim thay quan an.' });
    return;
  }
  res.json({ ok: true, item });
}));

app.post('/api/admin/restaurants/:id/tags', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const item = await dbStore.attachTagsToRestaurant(req.params.id, req.body?.tags);
  if (!item) {
    res.status(404).json({ ok: false, message: 'Khong tim thay quan an.' });
    return;
  }
  res.json({ ok: true, item });
}));

app.post('/api/admin/restaurants/sync', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  res.json({ ok: true, ...(await dbStore.syncRestaurantsFromSource()) });
}));

app.get('/api/admin/posts', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const items = await dbStore.listPosts({
    status: req.query.status,
    restaurantId: req.query.restaurantId,
    query: req.query.query,
  });
  res.json({ ok: true, items });
}));

app.patch('/api/admin/posts/:id/approve', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const post = await dbStore.approvePost(req.params.id, admin);
  if (!post) {
    res.status(404).json({ ok: false, message: 'Khong tim thay bai dang.' });
    return;
  }
  res.json({ ok: true, post });
}));

app.patch('/api/admin/posts/:id/reject', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const post = await dbStore.rejectPost(req.params.id, req.body?.note, admin);
  if (!post) {
    res.status(404).json({ ok: false, message: 'Khong tim thay bai dang.' });
    return;
  }
  res.json({ ok: true, post });
}));

app.patch('/api/admin/posts/:id', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const post = await dbStore.updatePost(req.params.id, req.body || {}, admin);
  if (!post) {
    res.status(404).json({ ok: false, message: 'Khong tim thay bai dang.' });
    return;
  }
  res.json({ ok: true, post });
}));

app.post('/api/admin/posts/:id/tags', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const post = await dbStore.attachTagsToPost(req.params.id, req.body?.tags, admin);
  if (!post) {
    res.status(404).json({ ok: false, message: 'Khong tim thay bai dang.' });
    return;
  }
  res.json({ ok: true, post });
}));

app.get('/api/admin/users/risk-signals', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const items = await dbStore.listRiskSignals(req.query.limit);
  res.json({ ok: true, items });
}));

app.get('/api/admin/users', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const items = await dbStore.listUsers({
    status: req.query.status,
    query: req.query.query,
  });
  res.json({ ok: true, items });
}));

app.patch('/api/admin/users/:id/status', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const item = await dbStore.updateUserStatus(req.params.id, req.body?.status);
  if (!item) {
    res.status(400).json({ ok: false, message: 'Khong the cap nhat trang thai nguoi dung.' });
    return;
  }
  res.json({ ok: true, item });
}));

app.get('/api/admin/notifications', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const items = await dbStore.listNotifications({
    unreadOnly: req.query.unreadOnly === 'true',
    targetUserId: req.query.targetUserId,
  });
  res.json({ ok: true, items });
}));

app.patch('/api/admin/notifications/:id/read', asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const dbStore = await getStore();
  const item = await dbStore.markNotificationRead(req.params.id);
  if (!item) {
    res.status(404).json({ ok: false, message: 'Khong tim thay thong bao.' });
    return;
  }
  res.json({ ok: true, item });
}));

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(rootDir, 'dist');

  app.use(express.static(distDir));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ ok: false, message: 'Loi server khi doc du lieu.' });
});

const PORT = process.env.BACKEND_PORT || process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log('🚀 Server running on port', PORT);
});
