import { Router } from 'express';
import { query } from '../db.js';
import { toCamel, toCamelArray } from '../utils.js';

const router = Router();

function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.use(requireAuth);

// --- Drafts ---

router.get('/drafts', async (req, res) => {
  const result = await query(
    'SELECT * FROM drafts WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ drafts: toCamelArray(result.rows) });
});

router.post('/drafts', async (req, res) => {
  const { id, text, wordCount, projectId, createdAt, unlocksAt, refined, refinedText } = req.body;
  const result = await query(
    `INSERT INTO drafts (id, user_id, project_id, text, word_count, created_at, unlocks_at, refined, refined_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       text = EXCLUDED.text, word_count = EXCLUDED.word_count, project_id = EXCLUDED.project_id,
       refined = EXCLUDED.refined, refined_text = EXCLUDED.refined_text, updated_at = NOW()
     RETURNING *`,
    [
      id, req.user.id, projectId || null, text, wordCount || 0,
      new Date(createdAt || Date.now()).toISOString(),
      new Date(unlocksAt || Date.now() + 86400000).toISOString(),
      refined || false, refinedText || null,
    ]
  );
  res.json({ draft: toCamel(result.rows[0]) });
});

router.put('/drafts/:id', async (req, res) => {
  const { text, wordCount, projectId, refined, refinedText } = req.body;
  const sets = [];
  const vals = [];
  let idx = 1;

  if (text !== undefined) { sets.push(`text = $${idx++}`); vals.push(text); }
  if (wordCount !== undefined) { sets.push(`word_count = $${idx++}`); vals.push(wordCount); }
  if (projectId !== undefined) { sets.push(`project_id = $${idx++}`); vals.push(projectId); }
  if (refined !== undefined) { sets.push(`refined = $${idx++}`); vals.push(refined); }
  if (refinedText !== undefined) { sets.push(`refined_text = $${idx++}`); vals.push(refinedText); }
  sets.push(`updated_at = NOW()`);

  if (sets.length === 1) return res.json({ ok: true });

  vals.push(req.params.id, req.user.id);
  const result = await query(
    `UPDATE drafts SET ${sets.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
    vals
  );
  res.json({ draft: toCamel(result.rows[0]) });
});

router.delete('/drafts/:id', async (req, res) => {
  await query('DELETE FROM drafts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

router.post('/drafts/sync', async (req, res) => {
  const { drafts } = req.body;
  if (!Array.isArray(drafts)) return res.status(400).json({ error: 'drafts must be an array' });

  for (const d of drafts) {
    await query(
      `INSERT INTO drafts (id, user_id, project_id, text, word_count, created_at, unlocks_at, refined, refined_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         text = EXCLUDED.text, word_count = EXCLUDED.word_count, project_id = EXCLUDED.project_id,
         refined = EXCLUDED.refined, refined_text = EXCLUDED.refined_text, updated_at = NOW()`,
      [
        d.id, req.user.id, d.projectId || null, d.text, d.wordCount || 0,
        new Date(d.createdAt || Date.now()).toISOString(),
        new Date(d.unlocksAt || Date.now() + 86400000).toISOString(),
        d.refined || false, d.refinedText || null,
      ]
    );
  }

  const result = await query(
    'SELECT * FROM drafts WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ drafts: toCamelArray(result.rows) });
});

// --- Projects ---

router.get('/projects', async (req, res) => {
  const result = await query(
    'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ projects: toCamelArray(result.rows) });
});

router.post('/projects', async (req, res) => {
  const { id, name } = req.body;
  const result = await query(
    `INSERT INTO projects (id, user_id, name) VALUES (COALESCE($1, gen_random_uuid()), $2, $3) RETURNING *`,
    [id || null, req.user.id, name]
  );
  res.json({ project: toCamel(result.rows[0]) });
});

router.delete('/projects/:id', async (req, res) => {
  await query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

export default router;
