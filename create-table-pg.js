#!/usr/bin/env node
/**
 * Create King County table using node-postgres
 */
const { Client } = require('pg');
const fs = require('fs');

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY2NDE4MCwiZXhwIjoyMDg4MjQwMTgwfQ.yfrmftJtvbjNqBEOPhgfMOU3grBie_Eki7uSNi9YhQo';

async function createTable() {
  // Try connecting via pooler with JWT auth
  const client = new Client({
    host: 'aws-1-us-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.zbizgmrtbqdgnyfnfasl',
    password: serviceRoleKey, // Try using JWT as password
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📊 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected!\n');

    const sql = fs.readFileSync('./supabase/migrations/20260304020000_king_county_table.sql', 'utf8');
    
    console.log('📝 Executing migration...\n');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify
    const result = await client.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'king_county_owners'");
    console.log('✅ Table verification:', result.rows[0].count === '1' ? 'EXISTS' : 'NOT FOUND');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Alternative: Manual SQL execution required');
    console.log('1. Go to: https://supabase.com/dashboard/project/zbizgmrtbqdgnyfnfasl/sql/new');
    console.log('2. Copy and run this SQL:\n');
    const sql = fs.readFileSync('./supabase/migrations/20260304020000_king_county_table.sql', 'utf8');
    console.log('```sql');
    console.log(sql);
    console.log('```\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTable();