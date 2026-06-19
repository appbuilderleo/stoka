import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('server/.env') });
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace('?sslmode=verify-full', ''),
  ssl: true
});

async function checkDb() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in DB:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkDb();
