import pg from 'pg';
const { Pool, types } = pg;

// Return DATE columns as ISO strings (YYYY-MM-DD) rather than JS Date objects.
// Without this, node-postgres applies a local-timezone offset and dates shift by a day.
types.setTypeParser(1082, v => v);

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5437'),
  database: process.env.DB_NAME     || 'orbitly',
  user:     process.env.DB_USER     || 'orbitly',
  password: process.env.DB_PASS     || 'orbitly',
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

export default pool;
