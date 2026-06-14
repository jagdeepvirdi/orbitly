import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM learning_plans ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { title, description, type = 'certification', color = '#6366f1', icon = '📚',
          exam_date, est_completion } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO learning_plans (title, description, type, color, icon, exam_date, est_completion)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description || null, type, color, icon, exam_date || null, est_completion || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const allowed = ['title', 'description', 'type', 'color', 'icon', 'exam_date', 'est_completion',
                   'cert_name', 'cert_issued', 'cert_expires', 'cert_url', 'cert_number', 'cert_issuer', 'passed'];
  const updates = allowed.filter(f => req.body[f] !== undefined);
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  const set  = updates.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const vals = updates.map(f => req.body[f]);
  try {
    const { rows } = await db.query(
      `UPDATE learning_plans SET ${set} WHERE id = $1 RETURNING *`,
      [Number(req.params.id), ...vals]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (id === 1) return res.status(403).json({ error: 'Cannot delete the Anthropic Certification Plan' });
  try {
    await db.query('UPDATE courses SET plan_id = NULL WHERE plan_id = $1', [id]);
    await db.query('DELETE FROM learning_plans WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
