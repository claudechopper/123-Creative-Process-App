import 'dotenv/config';
import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { query } from './db.js';
import chatRoutes from './routes/chat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Trust Railway's proxy so req.ip reflects the real client IP (for rate limits).
app.set('trust proxy', 1);

// Body parsing — capped at 1mb since we no longer accept cloud draft syncs.
// Chat route further clamps message/context sizes internally.
app.use(express.json({ limit: '1mb' }));

// Only route that exists: AI chat. No auth, no user accounts, no cloud sync.
// All writing data lives in the user's browser localStorage. Postgres is used
// only for AI cost tracking (anon_spend, ai_daily_budget, user_daily_spend).
app.use('/api/chat', chatRoutes);

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
