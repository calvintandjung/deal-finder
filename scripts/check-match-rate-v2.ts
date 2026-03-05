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
    .select('id, address, city, zip, parcel_number')
  
  if (propError) {
    console.error('Error fetching properties:', propError)
    return
  }
  
  console.log(`Found ${properties?.length || 0} properties\n`)
  
  let matched = 0
  let notMatched = 0
  const results: any[] = []
  
  for (const prop of properties || []) {
    // Skip parcel-only entries, try parcel number match
    if (prop.address.startsWith('Parcel ')) {
      const parcelNum = prop.address.replace('Parcel ', '').trim()
      const { data: kcByParcel } = await supabase
        .from('king_county_owners')
        .select('*')
        .eq('parcel_number', parcelNum)
        .limit(1)
      
      if (kcByParcel && kcByParcel.length > 0) {
        matched++
        results.push({
          address: prop.address,
          matched: true,
          score: 100,
          method: 'parcel',
          kc_address: kcByParcel[0].property_address,
          owner: kcByParcel[0].mailing_address,
          mailing: `${kcByParcel[0].mailing_address}, ${kcByParcel[0].mailing_city_state} ${kcByParcel[0].mailing_zip}`
        })
        continue
      }
    }
    
    // Extract street number for searching
    const streetNumMatch = prop.address.match(/^(\d+)/)
    const streetNum = streetNumMatch ? streetNumMatch[1] : ''
    
    // Search KC records by street number
    const { data: kcRecords } = await supabase
      .from('king_county_owners')
      .select('*')
      .ilike('property_address', `${streetNum}%`)
      .limit(50)
    
    let bestMatch: any = null
    let bestScore = 0
    
    const normalized = normalizeAddress(prop.address)
    
    for (const kc of kcRecords || []) {
      if (!kc.property_address) continue
      const kcNorm = normalizeAddress(kc.property_address)
      const score = fuzzball.ratio(normalized, kcNorm)
      if (score > bestScore) {
        bestScore = score
        bestMatch = kc
      }
    }
    
    if (bestScore >= 70) {
      matched++
      results.push({
        address: prop.address,
        matched: true,
        score: bestScore,
        method: 'fuzzy',
        kc_address: bestMatch?.property_address,
        owner: bestMatch?.mailing_address,
        mailing: bestMatch ? `${bestMatch.mailing_address}, ${bestMatch.mailing_city_state} ${bestMatch.mailing_zip}` : 'N/A'
      })
    } else {
      notMatched++
      results.push({
        address: prop.address,
        matched: false,
        score: bestScore,
        kc_address: bestMatch?.property_address || 'No match found'
      })
    }
  }
  
  console.log('=' .repeat(70))
  console.log('KING COUNTY MATCH RATE REPORT')
  console.log('=' .repeat(70))
  console.log(`Total properties: ${properties?.length || 0}`)
  console.log(`Matched (>=70%): ${matched}`)
  console.log(`Not matched: ${notMatched}`)
  console.log(`MATCH RATE: ${((matched / (properties?.length || 1)) * 100).toFixed(1)}%`)
  console.log('')
  console.log('TOP MATCHES:')
  results.filter(r => r.matched).slice(0, 10).forEach(r => {
    console.log(`  ✅ ${r.address}`)
    console.log(`     → KC: ${r.kc_address} (${r.score}% via ${r.method})`)
    console.log(`     → Mailing: ${r.mailing}`)
  })
  if (matched > 10) console.log(`  ... and ${matched - 10} more matches`)
  console.log('')
  console.log('UNMATCHED (first 10):')
  results.filter(r => !r.matched).slice(0, 10).forEach(r => {
    console.log(`  ❌ ${r.address} (best: ${r.score}%)`)
  })
  if (notMatched > 10) console.log(`  ... and ${notMatched - 10} more unmatched`)
}

checkMatchRate().catch(console.error)
