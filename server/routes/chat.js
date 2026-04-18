import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import crypto from 'crypto';
import { query } from '../db.js';
import { chat, MODELS } from '../services/ai.js';
import { toCamelArray } from '../utils.js';

const router = Router();

// ============================================================================
// SECURITY CAPS — The 7-layer defense against AI cost exploits
// ============================================================================

// Tier caps in cents (monthly, for authenticated users)
const TIER_CAPS = {
  free: 0,
  starter: 250,
  pro: 750,
  unlimited: 2500,
  power: 5000,
};

// Anon caps (unauthenticated users)
const ANON_DAILY_CAP_CENTS = 25;        // 25¢/day per IP (~40 Haiku msgs)
const ANON_ALLOWED_MODELS = ['haiku'];  // anons locked to cheapest model

// Body-size hard ceilings (enforced on every request)
const MAX_CONTEXT_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 3000;

// Global kill switch — if total AI spend across ALL users exceeds this in
// one day, anon requests are 503'd. Paid users still work (up to tier cap).
const GLOBAL_DAILY_BUDGET_CENTS = parseInt(process.env.AI_DAILY_BUDGET_CENTS, 10) || 200; // default $2/day

// ============================================================================
// Rate limiters (per-IP, in-memory — fine for single Railway instance)
// ============================================================================

const anonLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down and try again in an hour.', code: 'RATE_LIMITED' },
  keyGenerator: ipKeyGenerator,
});

const paidLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.', code: 'RATE_LIMITED' },
  keyGenerator: (req, res) => req.user?.id || ipKeyGenerator(req, res),
});

// Route the right limiter based on auth status
function applyRateLimit(req, res, next) {
  if (req.isAuthenticated()) return paidLimiter(req, res, next);
  return anonLimiter(req, res, next);
}

// ============================================================================
// Helpers
// ============================================================================

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 32);
}

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function getGlobalSpendToday() {
  const result = await query(
    `SELECT cents_spent FROM ai_daily_budget WHERE day = $1`,
    [today()]
  );
  return result.rows[0]?.cents_spent || 0;
}

async function getAnonSpendToday(ipHash) {
  const result = await query(
    `SELECT cents_spent FROM anon_spend WHERE ip_hash = $1 AND day = $2`,
    [ipHash, today()]
  );
  return result.rows[0]?.cents_spent || 0;
}

async function recordSpend(costCents, ipHash, isAnon) {
  // Always update global ceiling
  await query(
    `INSERT INTO ai_daily_budget (day, cents_spent) VALUES ($1, $2)
     ON CONFLICT (day) DO UPDATE SET cents_spent = ai_daily_budget.cents_spent + $2`,
    [today(), costCents]
  );
  // Update per-IP anon spend if anon
  if (isAnon) {
    await query(
      `INSERT INTO anon_spend (ip_hash, day, cents_spent, request_count) VALUES ($1, $2, $3, 1)
       ON CONFLICT (ip_hash, day) DO UPDATE SET
         cents_spent = anon_spend.cents_spent + $3,
         request_count = anon_spend.request_count + 1`,
      [ipHash, today(), costCents]
    );
  }
}

// ============================================================================
// Auth middleware
// ============================================================================

function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// Gates: authenticated users need paid tier; anons allowed but flagged + capped
async function requirePaidOrAnon(req, res, next) {
  try {
    // Layer 5: Global kill switch check (applies to everyone)
    const globalSpent = await getGlobalSpendToday();
    if (globalSpent >= GLOBAL_DAILY_BUDGET_CENTS) {
      // Paid users keep working — only block anons once global cap hit
      if (!req.isAuthenticated()) {
        return res.status(503).json({
          error: 'AI Writing Coach is taking a break for the day. Try again tomorrow, or sign up for a paid plan.',
          code: 'DAILY_BUDGET_EXCEEDED',
        });
      }
    }

    if (!req.isAuthenticated()) {
      // Layer 3: Anon per-IP daily cap
      const ipHash = hashIp(req.ip);
      const anonSpent = await getAnonSpendToday(ipHash);
      if (anonSpent >= ANON_DAILY_CAP_CENTS) {
        return res.status(429).json({
          error: 'Free daily AI limit reached. Sign up to keep going.',
          code: 'ANON_DAILY_CAP_REACHED',
        });
      }
      req.isAnon = true;
      req.ipHash = ipHash;
      return next();
    }

    // Authenticated: require paid tier + check monthly cap
    const tier = req.user.tier || 'free';
    if (tier === 'free') {
      return res.status(403).json({ error: 'AI Writing Coach requires a paid plan', code: 'UPGRADE_REQUIRED' });
    }
    const cap = TIER_CAPS[tier] || 0;
    const spent = req.user.ai_spend_cents || 0;
    if (spent >= cap) {
      return res.status(403).json({
        error: 'Monthly AI usage limit reached. Upgrade for more.',
        code: 'USAGE_CAP_REACHED',
        spent,
        cap,
      });
    }
    next();
  } catch (err) {
    console.error('Cap check failed:', err);
    res.status(500).json({ error: 'Internal error during auth check' });
  }
}

// ============================================================================
// Routes
// ============================================================================

// Info (usage + models available)
router.get('/info', async (req, res) => {
  try {
    const isAnon = !req.isAuthenticated();
    const tier = isAnon ? 'anon' : (req.user?.tier || 'free');
    const cap = isAnon ? ANON_DAILY_CAP_CENTS : (TIER_CAPS[tier] || 0);
    let spent = 0;
    if (isAnon) {
      try { spent = await getAnonSpendToday(hashIp(req.ip)); } catch { spent = 0; }
    } else {
      spent = req.user?.ai_spend_cents || 0;
    }
    const allowed = isAnon ? ANON_ALLOWED_MODELS : Object.keys(MODELS);
    const models = Object.entries(MODELS)
      .filter(([key]) => allowed.includes(key))
      .map(([key, m]) => ({
        key,
        label: m.label,
        inputPer1M: m.inputPer1M,
        outputPer1M: m.outputPer1M,
      }));
    res.json({ tier, cap, spent, models, isAnon });
  } catch (err) {
    console.error('Info error:', err);
    res.status(500).json({ error: 'Failed to load info' });
  }
});

// Send a message
router.post('/', applyRateLimit, requirePaidOrAnon, async (req, res) => {
  try {
    let { message, projectId, context, model = 'haiku', history = [] } = req.body;

    // Layer 4: Body-size hard ceilings
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

    // Layer 1: Model restriction for anons
    if (req.isAnon && !ANON_ALLOWED_MODELS.includes(model)) {
      model = 'haiku';
    }
    if (!MODELS[model]) {
      return res.status(400).json({ error: 'Unknown model' });
    }

    // Build messages array from sanitized history + new message
    const messages = [
      ...history.map(m => ({ role: m.role, content: String(m.content || '').slice(0, MAX_MESSAGE_CHARS) })),
      { role: 'user', content: message },
    ];

    const result = await chat(messages, { model, context: context || null });

    // Layer 5 + Layer 3: record spend (global + per-IP for anons, or per-user)
    await recordSpend(result.costCents, req.ipHash, !!req.isAnon);

    // Save message + update spend for authenticated users only
    let newSpent = 0;
    let tierCap = ANON_DAILY_CAP_CENTS;
    if (!req.isAnon) {
      await query(
        `INSERT INTO chat_messages (user_id, project_id, role, content, cost_cents) VALUES ($1, $2, 'user', $3, 0)`,
        [req.user.id, projectId || null, message]
      );
      await query(
        `INSERT INTO chat_messages (user_id, project_id, role, content, cost_cents) VALUES ($1, $2, 'assistant', $3, $4)`,
        [req.user.id, projectId || null, result.text, result.costCents]
      );
      await query(
        `UPDATE users SET ai_spend_cents = ai_spend_cents + $1 WHERE id = $2`,
        [result.costCents, req.user.id]
      );
      const tier = req.user.tier || 'free';
      newSpent = (req.user.ai_spend_cents || 0) + result.costCents;
      tierCap = TIER_CAPS[tier] || 0;
    } else {
      newSpent = await getAnonSpendToday(req.ipHash);
    }

    res.json({
      text: result.text,
      model: result.model,
      costCents: result.costCents,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      spent: newSpent,
      cap: tierCap,
    });
  } catch (err) {
    console.error('Chat error:', err);
    // Don't leak raw error details to client
    res.status(500).json({ error: 'AI request failed. Please try again.' });
  }
});

// Layer 6: history endpoints now require authentication
router.get('/history/:projectId', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM chat_messages WHERE user_id = $1 AND project_id = $2 ORDER BY created_at ASC LIMIT 500`,
      [req.user.id, req.params.projectId]
    );
    res.json({ messages: toCamelArray(result.rows) });
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

router.delete('/history/:projectId', requireAuth, async (req, res) => {
  try {
    await query(
      `DELETE FROM chat_messages WHERE user_id = $1 AND project_id = $2`,
      [req.user.id, req.params.projectId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('History delete error:', err);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

export default router;
