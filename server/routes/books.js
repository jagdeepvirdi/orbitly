import { Router } from 'express';
import db from '../db.js';
import * as Sentry from '@sentry/node';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { plan_id } = req.query;
    let q = 'SELECT * FROM books WHERE user_id = $1';
    const params = [req.userId];
    if (plan_id) { q += ' AND plan_id = $2'; params.push(Number(plan_id)); }
    q += ' ORDER BY created_at';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (e) { console.error('[books]', e); Sentry.captureException(e); res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { plan_id, title, author, pages, genre, status = 'to-read',
          started_date, finished_date, rating, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO books (plan_id, title, author, pages, genre, status, started_date, finished_date, rating, notes, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [plan_id, title, author || null, pages ? Number(pages) : null,
       genre || null, status, started_date || null, finished_date || null,
       rating ? Number(rating) : null, notes || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) { console.error('[books]', e); Sentry.captureException(e); res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const allowed = ['title','author','pages','genre','status','started_date','finished_date','rating','notes'];
  const updates = allowed.filter(f => req.body[f] !== undefined);
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  const set  = updates.map((f, i) => `${f} = $${i + 3}`).join(', ');
  const vals = updates.map(f => {
    const v = req.body[f];
    if ((f === 'pages' || f === 'rating') && v !== null) return v ? Number(v) : null;
    return v;
  });
  try {
    const { rows } = await db.query(
      `UPDATE books SET ${set} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [Number(req.params.id), req.userId, ...vals]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { console.error('[books]', e); Sentry.captureException(e); res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM books WHERE id = $1 AND user_id = $2', [Number(req.params.id), req.userId]);
    res.json({ ok: true });
  } catch (e) { console.error('[books]', e); Sentry.captureException(e); res.status(500).json({ error: e.message }); }
});

export default router;
