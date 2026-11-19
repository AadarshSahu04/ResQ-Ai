import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('[Migration] Starting RESQ-AI database schema migrations...');

  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'resq_ai',
  });

  try {
    const client = await pool.connect();
    console.log('[Migration] Connected to PostgreSQL. Applying 001_init.sql...');

    const sqlPath = path.join(__dirname, '001_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('✅ [Migration Success] Tables (users, incidents, hazards) and PostGIS extensions applied successfully.');
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ [Migration Error]:', err.message);
    console.log('ℹ️  Note: Ensure PostgreSQL is running with PostGIS installed if deploying to a dedicated Postgres instance.');
    process.exit(1);
  }
}

runMigrations();
