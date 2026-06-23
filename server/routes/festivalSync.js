import db from '../db.js';

const DEFAULT_SUBSCRIPTIONS = ['IN', 'TH', 'hindu', 'sikh'];

export async function syncUserFestivals(userId) {
  // 1. Fetch enabled calendars from user_calendars
  const { rows: subs } = await db.query(
    'SELECT calendar_id FROM user_calendars WHERE user_id = $1 AND enabled = true',
    [userId]
  );
  
  let calendars = [];
  if (subs.length === 0) {
    // If user has no subscriptions, insert default subscriptions into user_calendars
    for (const sub of DEFAULT_SUBSCRIPTIONS) {
      await db.query(
        `INSERT INTO user_calendars (user_id, calendar_id, enabled)
         VALUES ($1, $2, true)
         ON CONFLICT (user_id, calendar_id) DO NOTHING`,
        [userId, sub]
      );
    }
    calendars = DEFAULT_SUBSCRIPTIONS;
  } else {
    calendars = subs.map(r => r.calendar_id);
  }

  // 2. Map calendar subscriptions to database calendar classifications
  const dbCalendars = [];
  for (const c of calendars) {
    if (c === 'IN') dbCalendars.push('indian');
    else if (c === 'TH') dbCalendars.push('thai');
    else dbCalendars.push(c); // sikh, christian, jain, islamic, thai-buddhist, hindu
  }

  // 3. Find all global festival IDs matching the active calendars
  let targetIds = [];
  if (dbCalendars.length > 0) {
    const { rows: targetFestivals } = await db.query(
      'SELECT id FROM festivals WHERE calendar = ANY($1)',
      [dbCalendars]
    );
    targetIds = targetFestivals.map(r => r.id);
  }

  // 4. Fetch currently mapped festival IDs in user_festivals
  const { rows: currentFestivals } = await db.query(
    'SELECT festival_id FROM user_festivals WHERE user_id = $1',
    [userId]
  );
  const currentIds = currentFestivals.map(r => r.festival_id);

  const currentSet = new Set(currentIds);
  const targetSet = new Set(targetIds);

  const toInsert = targetIds.filter(id => !currentSet.has(id));
  const toDelete = currentIds.filter(id => !targetSet.has(id));

  // 5. Perform additions/deletions in database
  if (toInsert.length > 0) {
    const insertValues = [];
    const params = [userId];
    for (let i = 0; i < toInsert.length; i++) {
      insertValues.push(`($1, $${i + 2})`);
      params.push(toInsert[i]);
    }
    await db.query(
      `INSERT INTO user_festivals (user_id, festival_id)
       VALUES ${insertValues.join(',')}
       ON CONFLICT (user_id, festival_id) DO NOTHING`,
      params
    );
  }

  if (toDelete.length > 0) {
    await db.query(
      'DELETE FROM user_festivals WHERE user_id = $1 AND festival_id = ANY($2)',
      [userId, toDelete]
    );
  }
}
