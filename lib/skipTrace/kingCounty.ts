/**
 * King County Assessor Data Lookup
 * 
 * Fast local lookup for Seattle properties using official assessor data
 */

import { createClient } from '@/lib/supabase/client'
import * as fuzzball from 'fuzzball'

export interface KingCountyMatch {
  parcel_number: string
  property_address: string
  mailing_address: string | null
  mailing_city_state: string | null
  mailing_zip: string | null
  bedrooms: number | null
  bathrooms: number | null
  building_sqft: number | null
  year_built: number | null
  assessed_land_value: number | null
  assessed_improvement_value: number | null
  total_assessed_value: number | null
  match_score: number // 0-100
  match_method: 'exact_parcel' | 'fuzzy_address'
}

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

/**
 * Look up property in King County data
 * 
 * @param address - Property address
 * @param parcelNumber - Optional parcel number for exact match
 * @returns King County property data with mailing address, or null if not found
 */
export async function lookupKingCounty(
  address: string,
  parcelNumber?: string | null
): Promise<KingCountyMatch | null> {
  const supabase = createClient()
  
  // Method 1: Exact parcel number match (best)
  if (parcelNumber) {
    const { data, error } = await supabase
      .from('king_county_owners')
      .select('*')
      .eq('parcel_number', parcelNumber.replace(/[^0-9]/g, ''))
      .maybeSingle()
    
    if (data && !error) {
      return {
        parcel_number: data.parcel_number,
        property_address: data.property_address || '',
        mailing_address: data.mailing_address,
        mailing_city_state: data.mailing_city_state,
        mailing_zip: data.mailing_zip,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        building_sqft: data.building_sqft,
        year_built: data.year_built,
        assessed_land_value: data.assessed_land_value,
        assessed_improvement_value: data.assessed_improvement_value,
        total_assessed_value: data.total_assessed_value,
        match_score: 100,
        match_method: 'exact_parcel'
      }
    }
  }
  
  // Method 2: Fuzzy address match
  const normalized = normalizeAddress(address)
  
  if (!normalized) {
    return null
  }
  
  // Get candidates from same zip code if possible
  const zipMatch = address.match(/\b(\d{5})\b/)
  const zip = zipMatch ? zipMatch[1] : null
  
  let query = supabase
    .from('king_county_owners')
    .select('*')
  
  if (zip) {
    query = query.eq('zip_code', zip)
  } else {
    // Without zip, limit to reduce search space
    query = query.limit(100)
  }
  
  const { data: candidates, error } = await query
  
  if (error || !candidates || candidates.length === 0) {
    return null
  }
  
  // Fuzzy match against candidates
  let bestMatch: any = null
  let bestScore = 0
  
  for (const candidate of candidates) {
    const candidateNormalized = candidate.normalized_address || normalizeAddress(candidate.property_address || '')
    
    // Use fuzzy string matching
    const score = fuzzball.ratio(normalized, candidateNormalized)
    
    if (score > bestScore) {
      bestScore = score
      bestMatch = candidate
    }
  }
  
  // Only return matches above 80% confidence
  if (bestScore >= 80 && bestMatch) {
    return {
      parcel_number: bestMatch.parcel_number,
      property_address: bestMatch.property_address || '',
      mailing_address: bestMatch.mailing_address,
      mailing_city_state: bestMatch.mailing_city_state,
      mailing_zip: bestMatch.mailing_zip,
      bedrooms: bestMatch.bedrooms,
      bathrooms: bestMatch.bathrooms,
      building_sqft: bestMatch.building_sqft,
      year_built: bestMatch.year_built,
      assessed_land_value: bestMatch.assessed_land_value,
      assessed_improvement_value: bestMatch.assessed_improvement_value,
      total_assessed_value: bestMatch.total_assessed_value,
      match_score: bestScore,
      match_method: 'fuzzy_address'
    }
  }
  
  return null
}

/**
 * Batch lookup multiple properties
 */
export async function batchLookupKingCounty(
  properties: Array<{ address: string; parcelNumber?: string | null }>
): Promise<Map<string, KingCountyMatch>> {
  const results = new Map<string, KingCountyMatch>()
  
  for (const prop of properties) {
    const match = await lookupKingCounty(prop.address, prop.parcelNumber)
    if (match) {
      results.set(prop.address, match)
    }
  }
  
  return results
}
