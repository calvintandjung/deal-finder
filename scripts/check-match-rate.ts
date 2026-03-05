import { createClient } from '@supabase/supabase-js'
import fuzzball from 'fuzzball'

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'
)

function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|ct|court|blvd|boulevard|way|pl|place|cir|circle)\b/gi, '')
    .replace(/\b(n|s|e|w|ne|nw|se|sw|north|south|east|west)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function checkMatchRate() {
  console.log('Fetching our properties...')
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('id, address, city, zip')
  
  if (propError) {
    console.error('Error fetching properties:', propError)
    return
  }
  
  console.log(`Found ${properties?.length || 0} properties\n`)
  
  let matched = 0
  let notMatched = 0
  const results: any[] = []
  
  for (const prop of properties || []) {
    const normalized = normalizeAddress(prop.address)
    
    // Try exact parcel match first (if we have parcel numbers)
    // Then fuzzy address match
    const { data: kcRecords } = await supabase
      .from('king_county_owners')
      .select('site_address, taxpayer_name, mailing_address, district')
      .ilike('site_address', `%${prop.address.split(' ').slice(0, 2).join(' ')}%`)
      .limit(10)
    
    let bestMatch = null
    let bestScore = 0
    
    for (const kc of kcRecords || []) {
      if (!kc.site_address) continue
      const kcNorm = normalizeAddress(kc.site_address)
      const score = fuzzball.ratio(normalized, kcNorm)
      if (score > bestScore) {
        bestScore = score
        bestMatch = kc
      }
    }
    
    if (bestScore >= 75) {
      matched++
      results.push({
        address: prop.address,
        matched: true,
        score: bestScore,
        kc_address: bestMatch?.site_address,
        owner: bestMatch?.taxpayer_name,
        mailing: bestMatch?.mailing_address
      })
    } else {
      notMatched++
      results.push({
        address: prop.address,
        matched: false,
        score: bestScore,
        kc_address: bestMatch?.site_address || 'No match found'
      })
    }
  }
  
  console.log('=' .repeat(60))
  console.log('MATCH RATE REPORT')
  console.log('=' .repeat(60))
  console.log(`Total properties: ${properties?.length || 0}`)
  console.log(`Matched (>=75%): ${matched}`)
  console.log(`Not matched: ${notMatched}`)
  console.log(`Match rate: ${((matched / (properties?.length || 1)) * 100).toFixed(1)}%`)
  console.log('')
  console.log('MATCHED PROPERTIES:')
  results.filter(r => r.matched).forEach(r => {
    console.log(`  ✅ ${r.address}`)
    console.log(`     → KC: ${r.kc_address} (${r.score}%)`)
    console.log(`     → Owner: ${r.owner || 'N/A'}`)
    console.log(`     → Mailing: ${r.mailing || 'N/A'}`)
  })
  console.log('')
  console.log('UNMATCHED PROPERTIES:')
  results.filter(r => !r.matched).forEach(r => {
    console.log(`  ❌ ${r.address} (best: ${r.score}% - ${r.kc_address})`)
  })
}

checkMatchRate().catch(console.error)
