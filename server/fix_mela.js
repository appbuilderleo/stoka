import { pool } from './db.js';

async function fix() {
  try {
    const userRes = await pool.query("SELECT id FROM profiles WHERE email = 'mela@gmail.com'");
    if (userRes.rows.length === 0) return console.log('user not found');
    const userId = userRes.rows[0].id;
    const storeRes = await pool.query("INSERT INTO stores (name, owner_id) VALUES ('Loja da Melanie', $1) RETURNING id", [userId]);
    const storeId = storeRes.rows[0].id;
    await pool.query("UPDATE profiles SET role = 'owner', store_id = $1 WHERE id = $2", [storeId, userId]);
    console.log('success');
  } catch(e) {
    console.error(e)
  } finally {
    process.exit();
  }
}
fix();
