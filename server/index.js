import express from 'express';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import GoogleStrategy from 'passport-google-oauth20';
import FacebookStrategy from 'passport-facebook';
import { createStore } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const backendOrigin = process.env.BACKEND_ORIGIN || `http://localhost:${process.env.BACKEND_PORT || process.env.PORT || 3100}`;

app.use(cors({ credentials: true, origin: frontendOrigin }));
app.use(express.json());

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

// Init DB
(async () => {
  store = await createStore();
  console.log('✅ PostgreSQL connected');
})();

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

const PORT = process.env.BACKEND_PORT || process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log('🚀 Server running on port', PORT);
});
