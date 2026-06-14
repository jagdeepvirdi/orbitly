import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM tasks ORDER BY list, created_at'
    );
    const work     = rows.filter(r => r.list === 'work');
    const personal = rows.filter(r => r.list === 'personal');
    res.json({ work, personal });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { id, title, list, priority = 'Normal', due = '', status = 'todo', overdue = false, recurring = false } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO tasks (id, title, list, priority, due, status, overdue, recurring)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id || `t${Date.now()}`, title, list, priority, due, status, overdue, recurring]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const fields = ['title','list','priority','due','status','overdue','recurring'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  const set  = updates.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const vals = updates.map(f => req.body[f]);
  try {
    const { rows } = await db.query(
      `UPDATE tasks SET ${set} WHERE id = $1 RETURNING *`,
      [id, ...vals]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
