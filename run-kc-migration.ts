import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'
)

async function createTable() {
  // Try inserting a test record - if table doesn't exist, we'll get an error
  const { error: testError } = await supabase
    .from('king_county_owners')
    .select('id')
    .limit(1)
  
  if (testError && testError.code === '42P01') {
    console.log('❌ Table does not exist yet.')
    console.log('\n📋 Please run this SQL in Supabase SQL Editor:')
    console.log('https://zbizgmrtbqdgnyfnfasl.supabase.co/project/zbizgmrtbqdgnyfnfasl/sql')
    console.log('\n' + '='.repeat(60))
    const fs = require('fs')
    const path = require('path')
    const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/001_king_county_table.sql'), 'utf-8')
    console.log(sql)
    console.log('='.repeat(60) + '\n')
    process.exit(1)
  } else if (testError) {
    console.error('Unexpected error:', testError)
    process.exit(1)
  } else {
    console.log('✅ Table exists!')
  }
}

createTable()
