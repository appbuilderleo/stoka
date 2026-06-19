import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
  console.log('Starting CockroachDB initialization...');
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    
    console.log('Executing schema...');
    await pool.query(schemaSql);
    
    console.log('Schema executed successfully.');
    
    // Check if subscription_plans were created
    const plansRes = await pool.query('SELECT * FROM subscription_plans');
    console.log(`Found ${plansRes.rowCount} subscription plans.`);
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

initDB();
