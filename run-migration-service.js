#!/usr/bin/env node
/**
 * Run King County migration using service role key
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://zbizgmrtbqdgnyfnfasl.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY2NDE4MCwiZXhwIjoyMDg4MjQwMTgwfQ.yfrmftJtvbjNqBEOPhgfMOU3grBie_Eki7uSNi9YhQo';

async function runMigration() {
  const sql = fs.readFileSync('./supabase/migrations/20260304020000_king_county_table.sql', 'utf8');
  
  console.log('📊 Running King County table migration via SQL Editor API...\n');
  
  // Use Supabase SQL Editor API endpoint
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    // SQL Editor API might not be available, try using supabase CLI with auth
    console.log('⚠️ REST API not available for DDL, using supabase CLI...\n');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // Save service role key to env and push
    process.env.SUPABASE_ACCESS_TOKEN = serviceRoleKey;
    
    try {
      const { stdout, stderr } = await execPromise(
        `cd ${__dirname} && supabase db push --include-all`,
        { env: { ...process.env, SUPABASE_ACCESS_TOKEN: serviceRoleKey } }
      );
      console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('\n📝 Manual step required:');
      console.log('Go to: https://supabase.com/dashboard/project/zbizgmrtbqdgnyfnfasl/sql');
      console.log('Paste and run the migration SQL from:');
      console.log('./supabase/migrations/20260304020000_king_county_table.sql\n');
      process.exit(1);
    }
  }
  
  console.log('✅ Checking if table was created...\n');
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from('king_county_owners')
    .select('id')
    .limit(1);
  
  if (error) {
    console.error('❌ Table not found:', error.message);
    console.log('\n📝 Manual step required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/zbizgmrtbqdgnyfnfasl/sql');
    console.log('2. Paste and run: ./supabase/migrations/20260304020000_king_county_table.sql\n');
    process.exit(1);
  }
  
  console.log('✅ Table exists! Migration successful.\n');
}

runMigration().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
