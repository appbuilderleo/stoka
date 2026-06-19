import { Pool } from 'pg';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace('?sslmode=verify-full', ''),
  ssl: {
    rejectUnauthorized: false
  }
});

// Create a global cache instance (default TTL: 5 minutes)
export const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

// Helper for caching database queries
export const getCachedOrFetch = async (key, fetchFn, ttl = 300) => {
  const cachedData = cache.get(key);
  if (cachedData) {
    console.log(`[Cache] HIT for key: ${key}`);
    return cachedData;
  }
  
  console.log(`[Cache] MISS for key: ${key}. Fetching from DB...`);
  const data = await fetchFn();
  cache.set(key, data, ttl);
  return data;
};

// Helper for query executing
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] Executed query in ${duration}ms`, { text });
    return res;
  } catch (error) {
    console.error(`[DB] Error executing query`, { text, error });
    throw error;
  }
};
