import { Router } from 'express';
import db from '../db.js';
import * as Sentry from '@sentry/node';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.*, p.title AS plan_title, p.color AS plan_color, p.icon AS plan_icon
       FROM learning_events e
       LEFT JOIN learning_plans p ON p.id = e.plan_id
       WHERE e.user_id = $1
       ORDER BY e.event_date NULLS LAST, e.event_time NULLS LAST, e.created_at`,
      [req.userId]
    );
    res.json(rows);
  } catch (e) { console.error('[learningEvents]', e); Sentry.captureException(e); res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const {
    title, event_type = 'webinar', event_date, event_time, url, notes, plan_id, attended = false,
    has_cert = false, cert_name, cert_issuer, cert_number, cert_url, cert_issued, cert_expires,
  } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO learning_events
         (title, event_type, event_date, event_time, url, notes, plan_id, attended,
          has_cert, cert_name, cert_issuer, cert_number, cert_url, cert_issued, cert_expires, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [title, event_type, event_date || null, event_time || null, url || null, notes || null,
       plan_id || null, attended,
       has_cert, cert_name || null, cert_issuer || null, cert_number || null,
       cert_url || null, cert_issued || null, cert_expires || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) { console.error('[learningEvents]', e); Sentry.captureException(e); res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const {
    title, event_type, event_date, event_time, url, notes, plan_id, attended,
    has_cert, cert_name, cert_issuer, cert_number, cert_url, cert_issued, cert_expires,
  } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE learning_events
       SET title=$1, event_type=$2, event_date=$3, event_time=$4, url=$5, notes=$6,
           plan_id=$7, attended=$8,
           has_cert=$9, cert_name=$10, cert_issuer=$11, cert_number=$12,
           cert_url=$13, cert_issued=$14, cert_expires=$15
       WHERE id=$16 AND user_id=$17 RETURNING *`,
      [title, event_type || 'webinar', event_date || null, event_time || null,
       url || null, notes || null, plan_id || null, attended ?? false,
       has_cert ?? false, cert_name || null, cert_issuer || null, cert_number || null,
       cert_url || null, cert_issued || null, cert_expires || null,
       Number(req.params.id), req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { console.error('[learningEvents]', e); Sentry.captureException(e); res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM learning_events WHERE id=$1 AND user_id=$2', [Number(req.params.id), req.userId]);
    res.json({ ok: true });
  } catch (e) { console.error('[learningEvents]', e); Sentry.captureException(e); res.status(500).json({ error: e.message }); }
});

export default router;
