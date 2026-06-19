import { pool } from './db.js';

async function testDelete() {
  try {
    const res = await pool.query('DELETE FROM products WHERE id = $1 AND store_id = $2', [2, '28b92c0c-8965-4579-8376-63cd451d68e0']);
    console.log('Success', res.rowCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
testDelete();
