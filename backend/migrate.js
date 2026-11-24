require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });
(async () => {
  try { const sql = fs.readFileSync(path.join(__dirname, 'migrations/001_init.sql'), 'utf8'); await pool.query(sql); console.log('Database migration completed.'); }
  finally { await pool.end(); }
})().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
