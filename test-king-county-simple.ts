#!/usr/bin/env tsx
/**
 * Test King County integration - Simple version
 */

import { createClient } from '@supabase/supabase-js'
import * as fuzzball from 'fuzzball'

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'
)

function normalizeAddress(addr: string): string {
  if (!addr) return ''
  return addr
    .toLowerCase()
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|way|circle|cir|place|pl)\b/g, '')
    .replace(/\b(north|n|south|s|east|e|west|w|northeast|ne|northwest|nw|southeast|se|southwest|sw)\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

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
    const normalized = normalizeAddress(address)
    
    // Fetch potential matches
    const { data: candidates } = await supabase
      .from('king_county_owners')
      .select('*')
      .eq('district_name', 'SEATTLE')
      .limit(1000)
    
    if (!candidates || candidates.length === 0) {
      console.log('    ❌ No candidates found')
      continue
    }
    
    // Score each candidate
    let bestMatch: any = null
    let bestScore = 0
    
    for (const candidate of candidates) {
      if (!candidate.normalized_address) continue
      
      const score = fuzzball.ratio(normalized, candidate.normalized_address)
      if (score > bestScore) {
        bestScore = score
        bestMatch = candidate
      }
    }
    
    if (bestMatch && bestScore >= 70) {
      console.log(`    ✅ Match found! (${bestScore}% confidence)`)
      console.log(`       Property: ${bestMatch.property_address}`)
      console.log(`       Mailing: ${bestMatch.mailing_address || 'N/A'}`)
      console.log(`       Value: $${(bestMatch.total_assessed_value || 0).toLocaleString()}`)
    } else {
      console.log(`    ❌ No good match (best score: ${bestScore}%)`)
    }
  }
  
  console.log('\n🎉 Tests complete!')
}

testKingCountyData().catch(console.error)
