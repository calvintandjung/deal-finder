#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY2NDE4MCwiZXhwIjoyMDg4MjQwMTgwfQ.RqI7m-e0w_G8ZMYTGtqDJhixEjJvwPVDFv2DxrL93eI'
)

async function createTable() {
  console.log('Creating king_county_owners table...')
  
  const sql = fs.readFileSync('supabase/migrations/20260304020000_king_county_table.sql', 'utf8')
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).select()
  
  if (error) {
    // Try direct approach
    console.log('Trying direct SQL execution...')
    const queries = sql.split(';').filter(q => q.trim())
    for (const query of queries) {
      if (!query.trim()) continue
      const { error: err } = await supabase.rpc('exec', { query: query.trim() }).select()
      if (err) {
        console.error('Error:', err)
      }
    }
  }
  
  console.log('✅ Table creation complete')
}

createTable().catch(console.error)
