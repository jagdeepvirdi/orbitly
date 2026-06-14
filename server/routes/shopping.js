import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM shopping_items ORDER BY created_at');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { item } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO shopping_items (id, item) VALUES ($1, $2) RETURNING *`,
      [`s${Date.now()}`, item]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE shopping_items SET done = $2 WHERE id = $1 RETURNING *',
      [req.params.id, req.body.done]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM shopping_items WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
