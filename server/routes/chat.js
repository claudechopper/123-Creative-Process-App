import { Router } from 'express';
import { query } from '../db.js';
import { chat, MODELS } from '../services/ai.js';
import { toCamelArray } from '../utils.js';

const router = Router();

// Tier caps in cents
const TIER_CAPS = {
  free: 0,
  starter: 250,
  pro: 750,
  unlimited: 2500,
  power: 5000,
};

const ANON_CAP_CENTS = 250; // $2.50 for unauthenticated users

function requirePaid(req, res, next) {
  // Unauthenticated users: cap enforced client-side via localStorage, allow through
  if (!req.isAuthenticated()) {
    req.isAnon = true;
    return next();
  }
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
}

// Get available models + user's usage info
router.get('/info', (req, res) => {
  const isAnon = !req.isAuthenticated();
  const tier = isAnon ? 'anon' : (req.user?.tier || 'free');
  const cap = isAnon ? ANON_CAP_CENTS : (TIER_CAPS[tier] || 0);
  const spent = isAnon ? 0 : (req.user?.ai_spend_cents || 0);
  const models = Object.entries(MODELS).map(([key, m]) => ({
    key,
    label: m.label,
    inputPer1M: m.inputPer1M,
    outputPer1M: m.outputPer1M,
  }));
  res.json({ tier, cap, spent, models, isAnon });
});

// Send a message
router.post('/', requirePaid, async (req, res) => {
  try {
    const { message, projectId, context, model = 'haiku', history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    // Build messages array from history + new message
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const result = await chat(messages, { model, context: context || null });

    // Save message + update spend only for authenticated users
    let newSpent = 0;
    let tierCap = ANON_CAP_CENTS;
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
    res.status(500).json({ error: 'AI request failed: ' + err.message });
  }
});

// Get chat history for a project
router.get('/history/:projectId', async (req, res) => {
  const result = await query(
    `SELECT * FROM chat_messages WHERE user_id = $1 AND project_id = $2 ORDER BY created_at ASC`,
    [req.user.id, req.params.projectId]
  );
  res.json({ messages: toCamelArray(result.rows) });
});

// Clear chat history for a project
router.delete('/history/:projectId', async (req, res) => {
  await query(
    `DELETE FROM chat_messages WHERE user_id = $1 AND project_id = $2`,
    [req.user.id, req.params.projectId]
  );
  res.json({ ok: true });
});

export default router;
