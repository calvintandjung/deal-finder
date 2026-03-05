#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'
)

async function debug() {
  console.log('Testing table access...\n')
  
  // Test 1: Select with id
  console.log('Test 1: select id')
  const { data: d1, error: e1 } = await supabase
    .from('king_county_owners')
    .select('id')
    .limit(1)
  console.log('Result:', { data: d1, error: e1 })
  
  // Test 2: Count
  console.log('\nTest 2: count')
  const { count, error: e2 } = await supabase
    .from('king_county_owners')
    .select('*', { count: 'exact', head: true })
  console.log('Result:', { count, error: e2 })
  
  // Test 3: Insert test record
  console.log('\nTest 3: insert test')
  const { data: d3, error: e3 } = await supabase
    .from('king_county_owners')
    .insert({
      parcel_number: 'TEST123',
      major: 'TEST',
      minor: '001'
    })
    .select()
  console.log('Result:', { data: d3, error: e3 })
}

debug()
