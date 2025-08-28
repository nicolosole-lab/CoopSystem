// temp-setup.js
import { Pool } from '@neondatabase/serverless';
import fs from 'fs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runSetup() {
  try {
    const sql = fs.readFileSync('scripts/clean-and-seed.sql', 'utf8');
    await pool.query(sql);
    console.log('Database setup completed!');
  } catch (error) {
    console.error('Setup failed:', error);
  } finally {
    await pool.end();
  }
}

runSetup();