import { pool } from './db.js';

async function alterDb() {
  try {
    await pool.query('ALTER TABLE stores ADD COLUMN IF NOT EXISTS stock_low_threshold INT DEFAULT 20');
    await pool.query('ALTER TABLE stores ADD COLUMN IF NOT EXISTS stock_stable_threshold INT DEFAULT 50');
    console.log('Columns added');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
alterDb();
