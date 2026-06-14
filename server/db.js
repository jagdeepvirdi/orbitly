import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5437'),
  database: process.env.DB_NAME     || 'orbitly',
  user:     process.env.DB_USER     || 'orbitly',
  password: process.env.DB_PASS     || 'orbitly',
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

export default pool;
