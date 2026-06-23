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
  const { name, country, cat, emoji, amount, currency, billing_day, cycle = 'monthly' } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO finance_subscriptions (name, country, cat, emoji, amount, currency, billing_day, cycle, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, country, cat, emoji, amount, currency, billing_day, cycle, req.userId]
    );
    res.status(201).json(rows[0]);
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
  const { name, bank, emi, currency, due_day } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO finance_loans (name, bank, emi, currency, due_day, user_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, bank, emi, currency, due_day, req.userId]
    );
    res.status(201).json(rows[0]);
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
  const { name, bank, statement_day, due_day, currency } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO finance_credit_cards (name, bank, statement_day, due_day, currency, user_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, bank, statement_day, due_day, currency, req.userId]
    );
    res.status(201).json(rows[0]);
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
  const { name, country, type, emoji, generation_day, due_day, amount, currency } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO finance_bills (name, country, type, emoji, generation_day, due_day, amount, currency, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, country, type, emoji, generation_day, due_day, amount, currency, req.userId]
    );
    res.status(201).json(rows[0]);
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
