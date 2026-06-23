import db from '../db.js';

export default async function requireHousehold(req, res, next) {
  const userId = req.userId;
  try {
    // Fast path: user already has a household membership
    let { rows } = await db.query(
      'SELECT household_id FROM household_members WHERE user_id = $1',
      [userId]
    );
    if (rows.length > 0) {
      req.householdId = rows[0].household_id;
      return next();
    }

    // Slow path: create household for new user (idempotent via ON CONFLICT)
    await db.query(
      `INSERT INTO households (name, created_by) VALUES ($1, $2) ON CONFLICT (created_by) DO NOTHING`,
      [`${userId}'s Household`, userId]
    );

    const { rows: hRows } = await db.query(
      'SELECT id FROM households WHERE created_by = $1',
      [userId]
    );
    const householdId = hRows[0].id;

    await db.query(
      `INSERT INTO household_members (household_id, user_id, role)
       VALUES ($1, $2, 'owner') ON CONFLICT (user_id) DO NOTHING`,
      [householdId, userId]
    );

    // Re-read in case a concurrent request created membership with a different household
    const { rows: final } = await db.query(
      'SELECT household_id FROM household_members WHERE user_id = $1',
      [userId]
    );
    req.householdId = final[0].household_id;
    next();
  } catch (e) {
    console.error('[requireHousehold]', e.message);
    res.status(500).json({ error: 'Could not initialize household' });
  }
}
