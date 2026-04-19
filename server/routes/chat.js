import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import crypto from 'crypto';
import { chat, MODELS } from '../services/ai.js';

// In-memory spend tracking. Resets on deploy — acceptable for a free lead-magnet
// app since Anthropic prepaid balance is the real hard ceiling, and redeploys
// are rare. Keyed by UTC day string; old days get pruned on each request.
const ipSpend = new Map();    // key = `${ipHash}|${day}` -> cents
const globalSpend = new Map(); // key = day -> cents

function pruneOldDays() {
  const d = today();
  for (const k of globalSpend.keys()) if (k !== d) globalSpend.delete(k);
  for (const k of ipSpend.keys()) if (!k.endsWith('|' + d)) ipSpend.delete(k);
}

const router = Router();

// ============================================================================
// Free-forever, anon-only AI Coach.
// Three-layer cost defense (everyone uses the same path — no accounts):
//   Layer 1 — Per-IP daily cap: 25¢/day/IP  (~40 Haiku msgs)
//   Layer 2 — Global daily cap: $2/day total (hard kill switch, ~$60/mo worst case)
//   Layer 3 — Anthropic prepaid balance (no auto-reload) = hardware ceiling
// Plus: rate limiting, body-size caps, model restricted to Haiku.
// ============================================================================

const ANON_DAILY_CAP_CENTS = 25;        // 25¢/day per IP
const ALLOWED_MODELS = ['haiku'];       // cheapest only
const GLOBAL_DAILY_BUDGET_CENTS = parseInt(process.env.AI_DAILY_BUDGET_CENTS, 10) || 200;

// Body-size hard ceilings (enforced on every request)
const MAX_CONTEXT_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 3000;

// Rate limiter — 10 chat requests per hour per IP
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down and try again in an hour.', code: 'RATE_LIMITED' },
  keyGenerator: ipKeyGenerator,
});

// ============================================================================
// Helpers
// ============================================================================

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 32);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getGlobalSpendToday() {
  return globalSpend.get(today()) || 0;
}

function getIpSpendToday(ipHash) {
  return ipSpend.get(`${ipHash}|${today()}`) || 0;
}

function recordSpend({ costCents, ipHash }) {
  pruneOldDays();
  const d = today();
  globalSpend.set(d, (globalSpend.get(d) || 0) + costCents);
  const k = `${ipHash}|${d}`;
  ipSpend.set(k, (ipSpend.get(k) || 0) + costCents);
}

// Middleware: enforce both global kill switch and per-IP daily cap.
function enforceCaps(req, res, next) {
  if (getGlobalSpendToday() >= GLOBAL_DAILY_BUDGET_CENTS) {
    return res.status(503).json({
      error: 'AI Writing Coach is taking a break for the day — come back tomorrow!',
      code: 'DAILY_BUDGET_EXCEEDED',
    });
  }
  const ipHash = hashIp(req.ip);
  const ipSpent = getIpSpendToday(ipHash);
  if (ipSpent >= ANON_DAILY_CAP_CENTS) {
    return res.status(429).json({
      error: "You've used your free AI allowance for today. Come back tomorrow!",
      code: 'DAILY_CAP_REACHED',
      spent: ipSpent,
      cap: ANON_DAILY_CAP_CENTS,
    });
  }
  req.ipHash = ipHash;
  next();
}

// ============================================================================
// Routes
// ============================================================================

// Usage info for the UI progress bar
router.get('/info', async (req, res) => {
  try {
    const spent = getIpSpendToday(hashIp(req.ip));
    const models = Object.entries(MODELS)
      .filter(([key]) => ALLOWED_MODELS.includes(key))
      .map(([key, m]) => ({
        key,
        label: m.label,
        inputPer1M: m.inputPer1M,
        outputPer1M: m.outputPer1M,
      }));
    res.json({
      tier: 'free',
      cap: ANON_DAILY_CAP_CENTS,
      spent,
      models,
      isAnon: true,
      period: 'day',
    });
  } catch (err) {
    console.error('Info error:', err);
    res.status(500).json({ error: 'Failed to load info' });
  }
});

// Send a message
router.post('/', limiter, enforceCaps, async (req, res) => {
  try {
    let { message, context, model = 'haiku', history = [] } = req.body;

    // Body-size ceilings
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
    if (message.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_CHARS} chars)` });
    }
    if (context && context.length > MAX_CONTEXT_CHARS) {
      context = context.slice(0, MAX_CONTEXT_CHARS);
    }
    if (!Array.isArray(history)) history = [];
    if (history.length > MAX_HISTORY_MESSAGES) {
      history = history.slice(-MAX_HISTORY_MESSAGES);
    }

    // Model restriction — only Haiku is allowed.
    if (!ALLOWED_MODELS.includes(model)) model = 'haiku';
    if (!MODELS[model]) {
      return res.status(400).json({ error: 'Unknown model' });
    }

    const messages = [
      ...history.map(m => ({ role: m.role, content: String(m.content || '').slice(0, MAX_MESSAGE_CHARS) })),
      { role: 'user', content: message },
    ];

    const result = await chat(messages, { model, context: context || null });

    recordSpend({ costCents: result.costCents, ipHash: req.ipHash });

    const newSpent = getIpSpendToday(req.ipHash);

    res.json({
      text: result.text,
      model: result.model,
      costCents: result.costCents,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      spent: newSpent,
      cap: ANON_DAILY_CAP_CENTS,
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'AI request failed. Please try again.' });
  }
});

export default router;
