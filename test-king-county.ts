#!/usr/bin/env tsx
/**
 * Test King County integration
 */

import { createClient } from '@supabase/supabase-js'
import { lookupKingCounty } from './lib/skipTrace/kingCounty'
import { runSkipTrace } from './lib/skipTrace'

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'
)

async function testKingCountyData() {
  console.log('🧪 Testing King County Data Integration\n')
  
  // Step 1: Check if table exists and has data
  console.log('1. Checking table...')
  const { data: sample, error, count } = await supabase
    .from('king_county_owners')
    .select('*', { count: 'exact' })
    .limit(5)
  
  if (error) {
    console.error('❌ Table not found or error:', error.message)
    console.log('\n⚠️  Please run the migration SQL first!')
    console.log('See: data/king-county/README.md')
    return
  }
  
  console.log(`✅ Table exists with ${count?.toLocaleString()} records`)
  console.log('\nSample records:')
  sample?.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec.property_address} (Parcel: ${rec.parcel_number})`)
  })
  
  // Step 2: Test fuzzy matching
  console.log('\n2. Testing fuzzy address matching...')
  
  const testAddresses = [
    '3400 Ravenna Ave N',
    '3600 Wallingford Ave N',
    '6500 S Brandon St'
  ]
  
  for (const address of testAddresses) {
    console.log(`\n  Testing: ${address}`)
    const match = await lookupKingCounty(address)
    
    if (match) {
      console.log(`    ✅ Match found! (${match.match_score}% confidence, ${match.match_method})`)
      console.log(`       Property: ${match.property_address}`)
      console.log(`       Mailing: ${match.mailing_address}`)
      console.log(`       Value: $${(match.total_assessed_value || 0).toLocaleString()}`)
    } else {
      console.log(`    ❌ No match`)
    }
  }
  
  // Step 3: Test full skip trace with King County
  console.log('\n3. Testing full skip trace integration...')
  
  const { data: properties } = await supabase
    .from('properties')
    .select('id, address, city, owner_name, parcel_number')
    .eq('city', 'Seattle')
    .limit(3)
  
  if (properties && properties.length > 0) {
    for (const prop of properties) {
      console.log(`\n  Property: ${prop.address}`)
      
      const result = await runSkipTrace({
        property_id: prop.id,
        owner_name: prop.owner_name || 'Unknown',
        property_address: prop.address,
        city: prop.city,
        state: 'WA',
        parcel_number: prop.parcel_number
      })
      
      console.log(`    Sources: ${result.sources_used.join(', ')}`)
      console.log(`    Success: ${result.success}`)
      console.log(`    Confidence: ${result.confidence}`)
      console.log(`    Cost: $${result.cost}`)
      
      if (result.additional_addresses.length > 0) {
        console.log(`    Mailing: ${result.additional_addresses[0]}`)
      }
    }
  }
  
  console.log('\n🎉 Tests complete!')
}

testKingCountyData().catch(console.error)
