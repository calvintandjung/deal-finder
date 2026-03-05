#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'
)

async function checkTable() {
  console.log('Checking for king_county_owners table...')
  
  const { data, error, count } = await supabase
    .from('king_county_owners')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error('❌ Table does not exist or cannot be accessed:', error.message)
    console.log('\nAttempting to create table via SQL editor...')
    console.log('Please run this SQL in Supabase dashboard:')
    console.log('\nhttps://supabase.com/dashboard/project/zbizgmrtbqdgnyfnfasl/sql/new\n')
    return false
  }
  
  console.log(`✅ Table exists with ${count || 0} records`)
  return true
}

checkTable()
