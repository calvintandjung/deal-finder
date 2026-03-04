/**
 * Skip Trace Module - YOLO Edition
 * 
 * Automated contact finding for property owners
 * Strategy: FREE scrapers first, paid fallback only if needed
 * 
 * Data flow:
 * 1. Free people search scrapers (TruePeopleSearch, FastPeopleSearch, ThatsThem)
 * 2. Business Entity Search (if LLC/Trust)
 * 3. Voter Registration (if available)
 * 4. Whitepages API (paid fallback - $0.08/lookup)
 * 
 * TOS WARNING: This violates TOS of various sites. Personal use only.
 */

import { createClient } from '@/lib/supabase/client'
import { aggregateFreeSources } from './freeScraper'

export interface SkipTraceResult {
  success: boolean
  phone_numbers: string[]
  email_addresses: string[]
  relatives: string[]
  additional_addresses: string[]
  sources_used: string[]
  cost: number
  confidence: 'high' | 'medium' | 'low'
  notes: string
}

export interface SkipTraceRequest {
  property_id: string
  owner_name: string
  property_address: string
  city: string
  state: string
  parcel_number?: string
}

/**
 * Main skip trace orchestrator
 * Tries free sources in sequence, falls back to paid if needed
 */
export async function runSkipTrace(request: SkipTraceRequest): Promise<SkipTraceResult> {
  const result: SkipTraceResult = {
    success: false,
    phone_numbers: [],
    email_addresses: [],
    relatives: [],
    additional_addresses: [],
    sources_used: [],
    cost: 0,
    confidence: 'low',
    notes: ''
  }

  try {
    // Phase 1: FREE SCRAPERS (YOLO!)
    result.notes += 'Starting FREE scraper aggregation...\n'
    
    const freeResults = await aggregateFreeSources(
      request.owner_name,
      request.city,
      request.state
    )
    
    // Add free scraper results
    result.phone_numbers.push(...freeResults.phones)
    result.email_addresses.push(...freeResults.emails)
    result.relatives.push(...freeResults.relatives)
    result.additional_addresses.push(...freeResults.addresses)
    result.sources_used.push(...freeResults.sources_used)
    
    if (freeResults.sources_used.length > 0) {
      result.notes += `✅ FREE sources worked! Used: ${freeResults.sources_used.join(', ')}\n`
    }

    // Phase 2: Check if we found contact info from free sources
    if (result.phone_numbers.length > 0 || result.email_addresses.length > 0) {
      result.success = true
      result.confidence = 'high'
      result.cost = 0 // FREE!
      result.notes += `SUCCESS: Found ${result.phone_numbers.length} phones, ${result.email_addresses.length} emails from FREE sources!\n`
      return result
    }

    // Phase 3: Business entity detection (for LLCs/Trusts)
    const entityInfo = detectBusinessEntity(request.owner_name)
    if (entityInfo.isEntity) {
      result.notes += `Detected ${entityInfo.entityType}: ${entityInfo.searchName}\n`
      
      // Search WA Secretary of State
      const businessData = await searchBusinessEntity(entityInfo.searchName)
      if (businessData) {
        result.additional_addresses.push(...businessData.addresses)
        result.notes += `Found registered agent: ${businessData.registeredAgent}\n`
        result.sources_used.push('wa-sos')
      }
    }

    // Phase 4: Voter registration (if available)
    const voterData = await searchVoterRegistry(request.owner_name, request.city, request.state)
    if (voterData) {
      if (voterData.phone) result.phone_numbers.push(voterData.phone)
      if (voterData.email) result.email_addresses.push(voterData.email)
      result.sources_used.push('voter-registry')
      result.notes += 'Found match in voter registration\n'
    }

    // Check again after entity/voter lookups
    if (result.phone_numbers.length > 0 || result.email_addresses.length > 0) {
      result.success = true
      result.confidence = 'medium'
      result.cost = 0
      result.notes += 'SUCCESS: Found contact info from secondary free sources\n'
      return result
    }

    // Phase 5: Paid fallback (Whitepages API) - last resort
    result.notes += '⚠️  Free sources failed, trying paid Whitepages API...\n'
    const whitepagesData = await searchWhitepages(request.owner_name, request.city, request.state)
    
    if (whitepagesData && whitepagesData.phones.length > 0) {
      result.phone_numbers.push(...whitepagesData.phones)
      result.email_addresses.push(...(whitepagesData.emails || []))
      result.relatives.push(...(whitepagesData.relatives || []))
      result.sources_used.push('whitepages-api')
      result.cost = 0.08 // Whitepages API cost
      result.confidence = 'high'
      result.success = true
      result.notes += 'SUCCESS: Found via Whitepages API (paid)\n'
      return result
    }

    // Phase 6: Complete failure
    result.notes += '❌ No results from free OR paid sources. Manual lookup needed.\n'
    result.confidence = 'low'
    
  } catch (error) {
    result.notes += `ERROR: ${error instanceof Error ? error.message : String(error)}\n`
  }

  return result
}

/**
 * Detect if owner name is a business entity
 */
export function detectBusinessEntity(ownerName: string): {
  isEntity: boolean
  entityType: string | null
  searchName: string
} {
  const patterns: Record<string, RegExp> = {
    'LLC': /\b(LLC|L\.L\.C\.)\b/i,
    'Trust': /\bTRUST\b/i,
    'Corporation': /\b(CORP|CORPORATION|INC)\b/i,
    'Partnership': /\b(LP|L\.P\.|LTD|LIMITED PARTNERSHIP)\b/i
  }

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(ownerName)) {
      // Clean entity suffix for search
      const searchName = ownerName
        .replace(/\s+(LLC|L\.L\.C\.|TRUST|INC|CORP|LP|LTD|LIMITED PARTNERSHIP).*$/i, '')
        .trim()
      
      return {
        isEntity: true,
        entityType: type,
        searchName
      }
    }
  }

  return {
    isEntity: false,
    entityType: null,
    searchName: ownerName
  }
}

/**
 * Search WA Secretary of State business registry
 * Note: This would need actual implementation with web scraping or API
 */
async function searchBusinessEntity(businessName: string): Promise<{
  registeredAgent: string
  addresses: string[]
} | null> {
  // TODO: Implement WA SOS scraping
  // For now, return null (not implemented)
  return null
}

/**
 * Search voter registration database
 * Note: Requires pre-downloaded voter file imported to database
 */
async function searchVoterRegistry(
  name: string, 
  city: string, 
  state: string
): Promise<{ phone: string | null, email: string | null } | null> {
  // TODO: Implement voter DB lookup
  // Would query local table: SELECT phone, email FROM voter_registry WHERE name ILIKE '%name%' AND city = city
  return null
}

/**
 * Whitepages API integration
 * Cost: ~$0.08 per lookup
 */
async function searchWhitepages(
  name: string,
  city: string,
  state: string
): Promise<{
  phones: string[]
  emails: string[]
  relatives: string[]
} | null> {
  // This is a placeholder - would need actual Whitepages Pro API key
  // API docs: https://pro.whitepages.com/developer/documentation/
  
  const apiKey = process.env.WHITEPAGES_API_KEY
  if (!apiKey) {
    console.log('Whitepages API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://proapi.whitepages.com/3.1/person?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}&state_code=${state}&api_key=${apiKey}`
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    // Parse Whitepages response
    const phones = data.phones?.map((p: any) => p.phone_number) || []
    const emails = data.emails?.map((e: any) => e.email_address) || []
    const relatives = data.associated_people?.map((p: any) => p.name) || []

    return { phones, emails, relatives }
  } catch (error) {
    console.error('Whitepages API error:', error)
    return null
  }
}

/**
 * Save skip trace results to database
 */
export async function saveSkipTraceResults(
  propertyId: string,
  result: SkipTraceResult
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('skip_trace_requests')
    .insert({
      property_id: propertyId,
      service: result.sources_used.join(', '),
      status: result.success ? 'completed' : 'failed',
      phone_numbers: result.phone_numbers,
      email_addresses: result.email_addresses,
      relatives: result.relatives,
      additional_addresses: result.additional_addresses,
      cost: result.cost,
      notes: result.notes
    })

  if (error) {
    console.error('Failed to save skip trace results:', error)
    throw error
  }

  // Update property record with contact info if found
  if (result.success && (result.phone_numbers.length > 0 || result.email_addresses.length > 0)) {
    const updateData: any = {}
    
    if (result.phone_numbers.length > 0) {
      updateData.owner_phone = result.phone_numbers[0]
    }
    
    if (result.email_addresses.length > 0) {
      updateData.owner_email = result.email_addresses[0]
    }

    await supabase
      .from('properties')
      .update(updateData)
      .eq('id', propertyId)
  }
}

/**
 * Get skip trace history for a property
 */
export async function getSkipTraceHistory(propertyId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('skip_trace_requests')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch skip trace history:', error)
    return []
  }

  return data
}

/**
 * Batch skip trace multiple properties
 */
export async function batchSkipTrace(propertyIds: string[]): Promise<Map<string, SkipTraceResult>> {
  const results = new Map<string, SkipTraceResult>()
  
  // Rate limiting: 1 request per second to avoid overwhelming services
  for (const propertyId of propertyIds) {
    // Fetch property details
    const supabase = createClient()
    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    if (error || !property) {
      console.error(`Property ${propertyId} not found`)
      continue
    }

    // Skip if already has contact info
    if (property.owner_phone || property.owner_email) {
      console.log(`Property ${propertyId} already has contact info, skipping`)
      continue
    }

    // Run skip trace
    const request: SkipTraceRequest = {
      property_id: propertyId,
      owner_name: property.owner_name || 'Unknown',
      property_address: property.address,
      city: property.city,
      state: property.state,
      parcel_number: property.parcel_number
    }

    const result = await runSkipTrace(request)
    await saveSkipTraceResults(propertyId, result)
    results.set(propertyId, result)

    // Rate limit: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return results
}
