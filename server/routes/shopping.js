import { Router } from 'express';
import db from '../db.js';
import requireHousehold from '../middleware/requireHousehold.js';

const router = Router();
router.use(requireHousehold);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM shopping_items WHERE household_id = $1 ORDER BY created_at',
      [req.householdId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { item } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO shopping_items (item, household_id) VALUES ($1, $2) RETURNING *`,
      [item, req.householdId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE shopping_items SET done = $2 WHERE id = $1 AND household_id = $3 RETURNING *',
      [req.params.id, req.body.done, req.householdId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM shopping_items WHERE id = $1 AND household_id = $2',
      [req.params.id, req.householdId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
