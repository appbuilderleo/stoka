import { pool } from './db.js';

async function testJoin() {
  try {
    const res = await pool.query(`
      SELECT b.id, b.name as brand_name, 
             json_build_object('id', p.id, 'name', p.name, 'icon', p.icon) as products
      FROM brands b
      LEFT JOIN products p ON b.product_id = p.id
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
testJoin();
