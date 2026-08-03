import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ── Subscriptions ─────────────────────────────────────────────
router.get('/subscriptions', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM finance_subscriptions WHERE user_id = $1 ORDER BY name',
      [req.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/subscriptions', async (req, res) => {
  const { name, country, cat, emoji, amount, currency, billing_day, cycle = 'monthly', start_date } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO finance_subscriptions (name, country, cat, emoji, amount, currency, billing_day, cycle, start_date, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, country, cat, emoji, amount, currency, billing_day, cycle, start_date || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/subscriptions/:id', async (req, res) => {
  const { name, country, cat, emoji, amount, currency, billing_day, cycle = 'monthly', start_date } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE finance_subscriptions
       SET name=$1, country=$2, cat=$3, emoji=$4, amount=$5, currency=$6, billing_day=$7, cycle=$8, start_date=$9
       WHERE id=$10 AND user_id=$11
       RETURNING *`,
      [name, country, cat, emoji, amount, currency, billing_day, cycle, start_date || null, req.params.id, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/subscriptions/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM finance_subscriptions WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Loans ─────────────────────────────────────────────────────
router.get('/loans', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM finance_loans WHERE user_id = $1 ORDER BY name',
      [req.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/loans', async (req, res) => {
  const { name, bank, emi, currency, due_day, emoji } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO finance_loans (name, bank, emi, currency, due_day, emoji, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, bank, emi, currency, due_day, emoji || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/loans/:id', async (req, res) => {
  const { name, bank, emi, currency, due_day, emoji } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE finance_loans SET name=$1, bank=$2, emi=$3, currency=$4, due_day=$5, emoji=$6
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [name, bank, emi, currency, due_day, emoji || null, req.params.id, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/loans/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM finance_loans WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Credit Cards ──────────────────────────────────────────────
router.get('/credit-cards', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM finance_credit_cards WHERE user_id = $1 ORDER BY name',
      [req.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/credit-cards', async (req, res) => {
  const { name, bank, statement_day, due_day, currency, emoji } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO finance_credit_cards (name, bank, statement_day, due_day, currency, emoji, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, bank, statement_day, due_day, currency, emoji || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/credit-cards/:id', async (req, res) => {
  const { name, bank, statement_day, due_day, currency, emoji } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE finance_credit_cards SET name=$1, bank=$2, statement_day=$3, due_day=$4, currency=$5, emoji=$6
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [name, bank, statement_day, due_day, currency, emoji || null, req.params.id, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/credit-cards/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM finance_credit_cards WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Bills ─────────────────────────────────────────────────────
router.get('/bills', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM finance_bills WHERE user_id = $1 ORDER BY name',
      [req.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/bills', async (req, res) => {
  const { name, country, type, emoji, generation_day, due_day, amount, currency, cycle = 'monthly', start_date } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO finance_bills (name, country, type, emoji, generation_day, due_day, amount, currency, cycle, start_date, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, country, type, emoji, generation_day || null, due_day || null, amount, currency, cycle, start_date || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/bills/:id', async (req, res) => {
  const { name, country, type, emoji, generation_day, due_day, amount, currency, cycle = 'monthly', start_date } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE finance_bills SET name=$1, country=$2, type=$3, emoji=$4, generation_day=$5, due_day=$6, amount=$7, currency=$8, cycle=$9, start_date=$10
       WHERE id=$11 AND user_id=$12 RETURNING *`,
      [name, country, type, emoji, generation_day || null, due_day || null, amount || null, currency, cycle, start_date || null, req.params.id, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/bills/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM finance_bills WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Insurance ─────────────────────────────────────────────────
router.get('/insurance', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM finance_insurance WHERE user_id = $1 ORDER BY name',
      [req.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/insurance', async (req, res) => {
  const { name, provider, type = 'other', emoji, amount, currency, billing_day, country, policy_number, cycle = 'monthly', start_date } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO finance_insurance (name, provider, type, emoji, amount, currency, billing_day, country, policy_number, cycle, start_date, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, provider, type, emoji, amount, currency, billing_day || null, country, policy_number || null, cycle, start_date || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/insurance/:id', async (req, res) => {
  const { name, provider, type = 'other', emoji, amount, currency, billing_day, country, policy_number, cycle = 'monthly', start_date } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE finance_insurance SET name=$1, provider=$2, type=$3, emoji=$4, amount=$5, currency=$6, billing_day=$7, country=$8, policy_number=$9, cycle=$10, start_date=$11
       WHERE id=$12 AND user_id=$13 RETURNING *`,
      [name, provider, type, emoji, amount, currency, billing_day || null, country, policy_number || null, cycle, start_date || null, req.params.id, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/insurance/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM finance_insurance WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Paid toggle ───────────────────────────────────────────────
router.post('/paid/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  const month = req.query.month || new Date().toISOString().slice(0, 7) + '-01';
  const paidMonth = month.length === 7 ? month + '-01' : month;
  try {
    const { rows } = await db.query(
      `INSERT INTO finance_paid (user_id, item_type, item_id, paid_month, paid)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (item_type, item_id, paid_month)
       DO UPDATE SET paid = NOT finance_paid.paid
       RETURNING paid`,
      [req.userId, type, id, paidMonth]
    );
    res.json({ paid: rows[0].paid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/paid', async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7) + '-01';
  const paidMonth = month.length === 7 ? month + '-01' : month;
  try {
    const { rows } = await db.query(
      'SELECT item_type, item_id, paid FROM finance_paid WHERE paid_month = $1 AND user_id = $2',
      [paidMonth, req.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
