import { Router } from 'express';
import db from '../db.js';
import requireHousehold from '../middleware/requireHousehold.js';
import * as Sentry from '@sentry/node';

const router = Router();

// ── Invite info & accept — no household required (user may not have one yet) ──

router.get('/invite/:token', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT hi.*, h.name AS household_name
       FROM household_invites hi
       JOIN households h ON h.id = hi.household_id
       WHERE hi.id = $1`,
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invite not found' });
    const invite = rows[0];
    if (invite.status !== 'pending') {
      return res.status(410).json({ error: 'Invite already used or expired' });
    }
    res.json(invite);
  } catch (e) {
    console.error('[household]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/invite/:token/accept', async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM household_invites WHERE id = $1 AND status = 'pending'`,
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invite not found or already used' });
    const invite = rows[0];

    // Check if user is already in a household
    const { rows: existing } = await db.query(
      'SELECT household_id FROM household_members WHERE user_id = $1',
      [userId]
    );
    if (existing.length > 0) {
      if (existing[0].household_id === invite.household_id) {
        return res.json({ ok: true, householdId: existing[0].household_id, alreadyMember: true });
      }
      return res.status(409).json({ error: 'You are already in a household' });
    }

    await db.query('BEGIN');
    try {
      await db.query(
        `INSERT INTO household_members (household_id, user_id, role)
         VALUES ($1, $2, 'member') ON CONFLICT (user_id) DO NOTHING`,
        [invite.household_id, userId]
      );
      await db.query(
        `UPDATE household_invites SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
        [invite.id]
      );
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    }

    res.json({ ok: true, householdId: invite.household_id });
  } catch (e) {
    console.error('[household]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

// ── Routes below require household context ────────────────────────────────────
router.use(requireHousehold);

// GET /api/household — current household info + members
router.get('/', async (req, res) => {
  try {
    const [{ rows: members }, { rows: hRows }] = await Promise.all([
      db.query(
        'SELECT user_id, role, added_at FROM household_members WHERE household_id = $1',
        [req.householdId]
      ),
      db.query('SELECT * FROM households WHERE id = $1', [req.householdId]),
    ]);
    res.json({ household: hRows[0], members, householdId: req.householdId });
  } catch (e) {
    console.error('[household]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/household/invites — list pending invites for this household
router.get('/invites', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM household_invites
       WHERE household_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [req.householdId]
    );
    res.json(rows);
  } catch (e) {
    console.error('[household]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/household/invite — create an invite link (+ optional email)
router.post('/invite', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO household_invites (household_id, inviter_user_id, invitee_email)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.householdId, req.userId, email.toLowerCase().trim()]
    );
    const invite = rows[0];
    const APP_URL = process.env.APP_URL || 'http://localhost:5177';
    const inviteLink = `${APP_URL}/?invite_token=${invite.id}`;

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Orbitly <noreply@orbitly.app>',
          to: email,
          subject: `You've been invited to join Orbitly`,
          html: `<p>You've been invited to share a household on Orbitly. Click the link to accept:</p>
                 <p><a href="${inviteLink}">${inviteLink}</a></p>
                 <p>This link is valid for 7 days.</p>`,
        });
      } catch (emailErr) {
        console.error('[household] email send failed:', emailErr.message);
      }
    }

    res.json({ invite, inviteLink });
  } catch (e) {
    console.error('[household]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
