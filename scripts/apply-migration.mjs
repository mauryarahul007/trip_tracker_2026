import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const DB_PASS = process.env.SUPABASE_DB_PASSWORD || '';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || '';
const migrationPath = process.argv[2];

if (!DB_PASS || !PROJECT_REF || !migrationPath) {
  console.error('Usage: SUPABASE_PROJECT_REF=... SUPABASE_DB_PASSWORD=... node scripts/apply-migration.mjs supabase/migrations/00XX_name.sql');
  process.exit(1);
}

const config = {
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: DB_PASS,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
};

async function run() {
  const sql = fs.readFileSync(path.resolve(migrationPath), 'utf8');
  console.log(`Connecting to db.${PROJECT_REF}.supabase.co...`);
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`Executing ${migrationPath}...`);
    await client.query(sql);
    console.log('✓ Migration applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
