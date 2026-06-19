import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('server/.env') });
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace('verify-full', 'require')
});

async function test() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Connected successfully:', res.rows);
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await pool.end();
  }
}

test();
