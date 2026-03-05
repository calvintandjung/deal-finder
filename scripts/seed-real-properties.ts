#!/usr/bin/env tsx
/**
 * Seed REAL Seattle properties from King County data
 * Filters for distressed/interesting properties based on multiple criteria
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zbizgmrtbqdgnyfnfasl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface KingCountyOwner {
  parcel_number: string
  property_address: string
  zip_code: string
  district_name: string
  mailing_address: string
  mailing_city_state: string
  mailing_zip: string
  lot_size_sqft: number
  bedrooms: number
  bathrooms: number
  building_sqft: number
  year_built: number
  assessed_land_value: number
  assessed_improvement_value: number
  total_assessed_value: number
  normalized_address: string
}

function calculateDistressScore(owner: KingCountyOwner): number {
  let score = 0
  
  // Absentee owner (mailing address != property address)
  const isAbsentee = owner.mailing_address?.trim().toLowerCase() !== owner.property_address?.trim().toLowerCase()
  if (isAbsentee) score += 20
  
  // Large lot (ADU potential)
  if (owner.lot_size_sqft >= 6000) score += 15
  if (owner.lot_size_sqft >= 8000) score += 10
  
  // Older property (more likely needs work)
  const age = new Date().getFullYear() - owner.year_built
  if (age > 50) score += 15
  else if (age > 30) score += 10
  else if (age > 20) score += 5
  
  // Low improvement value relative to land (potential teardown/rebuild)
  if (owner.assessed_land_value > 0 && owner.assessed_improvement_value > 0) {
    const improvementRatio = owner.assessed_improvement_value / owner.assessed_land_value
    if (improvementRatio < 0.3) score += 20 // improvement worth <30% of land
    else if (improvementRatio < 0.5) score += 10
  }
  
  return score
}

function normalizeAddress(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function parseAddress(fullAddress: string): { address: string; zip: string } {
  // King County format: "7013   GREENWOOD AVE N  98103"
  const parts = fullAddress.trim().split(/\s{2,}/)
  
  if (parts.length >= 2) {
    const zip = parts[parts.length - 1]
    const address = parts.slice(0, -1).join(' ')
    return { address, zip }
  }
  
  // Fallback: try to extract zip from end
  const zipMatch = fullAddress.match(/\b(\d{5})$/)
  if (zipMatch) {
    const zip = zipMatch[1]
    const address = fullAddress.replace(/\s*\d{5}$/, '').trim()
    return { address, zip }
  }
  
  return { address: fullAddress.trim(), zip: '' }
}

async function seedRealProperties(limit: number = 100) {
  console.log('🔍 Querying King County data for distressed properties...')
  
  // Query King County table with filters
  const { data: kcProperties, error: queryError } = await supabase
    .from('king_county_owners')
    .select('*')
    .eq('district_name', 'SEATTLE')
    .not('mailing_address', 'is', null)
    .not('property_address', 'is', null)
    .gte('lot_size_sqft', 4000) // Minimum lot size for potential
    .gte('year_built', 1900) // Valid year
    .lte('year_built', new Date().getFullYear())
    .limit(500) // Get more candidates to filter from
  
  if (queryError) {
    console.error('❌ Error querying King County data:', queryError)
    throw queryError
  }
  
  if (!kcProperties || kcProperties.length === 0) {
    console.error('❌ No King County properties found')
    return
  }
  
  console.log(`✅ Found ${kcProperties.length} candidate properties`)
  
  // Score and filter properties
  const scoredProperties = kcProperties
    .map(owner => ({
      owner,
      score: calculateDistressScore(owner)
    }))
    .filter(p => p.score >= 20) // Minimum distress score
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  
  console.log(`✅ Filtered to ${scoredProperties.length} high-potential properties`)
  
  // Transform to properties table format
  const properties = scoredProperties.map(({ owner, score }) => {
    const { address, zip } = parseAddress(owner.property_address)
    const isAbsentee = owner.mailing_address?.trim().toLowerCase() !== owner.property_address?.trim().toLowerCase()
    
    // Determine deal type based on characteristics
    let dealType = 'wholesaling'
    if (owner.lot_size_sqft >= 6000) dealType = 'adu'
    if (owner.assessed_improvement_value / owner.assessed_land_value < 0.3) dealType = 'teardown'
    
    return {
      address,
      city: 'Seattle',
      state: 'WA',
      zip: zip || owner.zip_code,
      county: 'King',
      parcel_number: owner.parcel_number,
      
      lot_size_sqft: owner.lot_size_sqft,
      building_sqft: owner.building_sqft,
      bedrooms: owner.bedrooms,
      bathrooms: owner.bathrooms,
      year_built: owner.year_built,
      property_type: 'single-family',
      
      is_corner_lot: false, // TODO: Could enhance with GIS data
      has_alley_access: false,
      has_hoa: false,
      
      assessed_value: owner.total_assessed_value,
      assessed_land_value: owner.assessed_land_value,
      assessed_improvement_value: owner.assessed_improvement_value,
      
      owner_mailing_address: owner.mailing_address,
      
      is_absentee_owner: isAbsentee,
      tax_delinquent: false,
      pre_foreclosure: false,
      estate_sale: false,
      divorce_filing: false,
      code_violations: 0,
      vacant: false,
      
      wholesaling_score: score,
      overall_score: score,
      deal_type: dealType,
      
      status: 'new',
      source: 'king-county-data',
      notes: `Distress score: ${score}. ${isAbsentee ? 'Absentee owner. ' : ''}Lot: ${owner.lot_size_sqft} sqft. Built: ${owner.year_built}.`
    }
  })
  
  console.log(`📝 Inserting ${properties.length} properties...`)
  
  // Clear existing fake properties first
  const { error: deleteError } = await supabase
    .from('properties')
    .delete()
    .or('parcel_number.like.ESTATE%,parcel_number.like.TAX%,parcel_number.is.null')
  
  if (deleteError) {
    console.error('⚠️  Warning: Could not clear fake properties:', deleteError)
  } else {
    console.log('✅ Cleared fake properties')
  }
  
  // Insert in batches of 50
  const batchSize = 50
  let inserted = 0
  
  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize)
    
    const { error: insertError } = await supabase
      .from('properties')
      .insert(batch)
    
    if (insertError) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError)
    } else {
      inserted += batch.length
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${properties.length})`)
    }
  }
  
  console.log(`\n✅ Seeded ${inserted} REAL Seattle properties from King County data`)
  console.log(`📊 Score range: ${scoredProperties[scoredProperties.length - 1]?.score} - ${scoredProperties[0]?.score}`)
  
  // Summary stats
  const absenteeCount = properties.filter(p => p.is_absentee_owner).length
  const aduCount = properties.filter(p => p.deal_type === 'adu').length
  const teardownCount = properties.filter(p => p.deal_type === 'teardown').length
  
  console.log(`\n📈 Summary:`)
  console.log(`  - Absentee owners: ${absenteeCount} (${Math.round(absenteeCount / properties.length * 100)}%)`)
  console.log(`  - ADU potential: ${aduCount} (${Math.round(aduCount / properties.length * 100)}%)`)
  console.log(`  - Teardown potential: ${teardownCount} (${Math.round(teardownCount / properties.length * 100)}%)`)
}

// Run if called directly
if (require.main === module) {
  const limit = parseInt(process.argv[2]) || 100
  seedRealProperties(limit)
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error)
      process.exit(1)
    })
}

export { seedRealProperties }
