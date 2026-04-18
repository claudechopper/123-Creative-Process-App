import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import pool, { query } from './db.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import chatRoutes from './routes/chat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Trust Railway's proxy
app.set('trust proxy', 1);

// Body parsing
app.use(express.json({ limit: '5mb' }));

// Sessions stored in PostgreSQL
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax',
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const result = await query(
        `INSERT INTO users (google_id, email, name, avatar_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (google_id) DO UPDATE SET name = $3, avatar_url = $4, email = $2
         RETURNING *`,
        [
          profile.id,
          profile.emails?.[0]?.value || '',
          profile.displayName || '',
          profile.photos?.[0]?.value || null,
        ]
      );
      done(null, result.rows[0]);
    } catch (err) {
      done(err);
    }
  }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0] || null);
  } catch (err) {
    done(err);
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', apiRoutes);

// Serve static frontend
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// Run schema migration then start
async function start() {
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await query(schema);
    console.log('Database schema ready');
  } catch (err) {
    console.warn('Schema migration skipped (no database?):', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
