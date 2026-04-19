import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import chatRoutes from './routes/chat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Trust Railway's proxy so req.ip reflects the real client IP (for rate limits).
app.set('trust proxy', 1);

// Security headers (applied to every response — HTML, JSON, and static).
// CSP is strict but permits the 4 LLM provider origins + localhost for Ollama,
// so BYO-key users can hit their provider directly from the browser.
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",  // inline styles are used throughout React components
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com http://localhost:* http://127.0.0.1:*",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Body parsing — capped at 1mb. Chat route further clamps internally.
app.use(express.json({ limit: '1mb' }));

// Only route that exists: AI chat. No auth, no user accounts, no database.
// All writing data lives in the user's browser localStorage.
// AI spend tracking is in-memory (resets on deploy — Anthropic prepaid balance
// is the real hard ceiling).
app.use('/api/chat', chatRoutes);

// Any other /api/* or /auth/* path = 404 (don't fall through to SPA HTML)
app.use(['/api', '/auth'], (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve static frontend
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback (non-API routes only — API 404s handled above)
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
