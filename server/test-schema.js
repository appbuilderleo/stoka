import { pool } from './db.js';

async function testDelete() {
  try {
    const res = await pool.query("SHOW CREATE TABLE brands");
    console.log(res.rows[0].create_statement);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
testDelete();
