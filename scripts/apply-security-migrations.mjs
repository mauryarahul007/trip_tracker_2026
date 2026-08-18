import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const DB_PASS = process.env.SUPABASE_DB_PASSWORD || '';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || '';

if (!DB_PASS || !PROJECT_REF) {
  console.error('Usage: SUPABASE_PROJECT_REF=... SUPABASE_DB_PASSWORD=... node scripts/apply-security-migrations.mjs');
  process.exit(1);
}

const config = {
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: DB_PASS,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 15000,
};

async function run() {
  console.log(`Connecting to Supabase database (db.${PROJECT_REF}.supabase.co)...`);
  const client = new Client(config);
  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully!');

    // Read and run Migration 0046
    const m46Path = path.resolve('supabase/migrations/0046_security_hardening_phase1.sql');
    const m46Sql = fs.readFileSync(m46Path, 'utf8');
    console.log('\n--> Executing Migration 0046...');
    await client.query(m46Sql);
    console.log('✓ Migration 0046 executed successfully!');

    // Read and run Migration 0047
    const m47Path = path.resolve('supabase/migrations/0047_security_hardening_phase2_join_limits.sql');
    const m47Sql = fs.readFileSync(m47Path, 'utf8');
    console.log('\n--> Executing Migration 0047...');
    await client.query(m47Sql);
    console.log('✓ Migration 0047 executed successfully!');

    console.log('\nAll migrations applied successfully!');
  } catch (err) {
    console.error('Error applying migrations:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
