/**
 * Test script for skip trace module
 * Tests on 5 real properties from database
 */

import { createClient } from '@supabase/supabase-js'
import { runSkipTrace, type SkipTraceRequest, type SkipTraceResult } from './lib/skipTrace'

const SUPABASE_URL = 'https://zbizgmrtbqdgnyfnfasl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Save skip trace results directly (bypassing browser client)
 */
async function saveResults(propertyId: string, result: SkipTraceResult) {
  const { error } = await supabase
    .from('skip_trace_requests')
    .insert({
      property_id: propertyId,
      service: result.sources_used.join(', ') || 'none',
      status: result.success ? 'completed' : 'failed',
      phone_numbers: result.phone_numbers,
      email_addresses: result.email_addresses,
      relatives: result.relatives,
      additional_addresses: result.additional_addresses,
      cost: result.cost,
      notes: result.notes,
      // sources_used: result.sources_used, // Column not in DB yet - add via dashboard
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

async function main() {
  console.log('🔍 YOLO Skip Trace - Test Run\n')
  console.log('Fetching 5 test properties...\n')

  // Fetch 5 properties without contact info
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, owner_name, address, city, state, parcel_number')
    .or('owner_phone.is.null,owner_email.is.null')
    .limit(5)

  if (error) {
    console.error('Database error:', error)
    return
  }

  if (!properties || properties.length === 0) {
    console.log('No properties found without contact info')
    return
  }

  console.log(`Found ${properties.length} properties to test:\n`)
  properties.forEach((p, i) => {
    console.log(`${i + 1}. ${p.owner_name} - ${p.address}, ${p.city}, ${p.state}`)
  })
  console.log('\n' + '='.repeat(80) + '\n')

  // Test each property
  const results = []
  
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i]
    console.log(`\n[${ i + 1}/${properties.length}] Testing: ${property.owner_name}`)
    console.log(`Address: ${property.address}, ${property.city}, ${property.state}`)
    console.log('─'.repeat(80))

    const request: SkipTraceRequest = {
      property_id: property.id,
      owner_name: property.owner_name || 'Unknown',
      property_address: property.address,
      city: property.city,
      state: property.state,
      parcel_number: property.parcel_number || undefined,
    }

    try {
      const result = await runSkipTrace(request)
      
      console.log(`\n✅ Result:`)
      console.log(`   Success: ${result.success}`)
      console.log(`   Confidence: ${result.confidence}`)
      console.log(`   Cost: $${result.cost.toFixed(2)}`)
      console.log(`   Phones: ${result.phone_numbers.length} found - ${result.phone_numbers.join(', ')}`)
      console.log(`   Emails: ${result.email_addresses.length} found - ${result.email_addresses.join(', ')}`)
      console.log(`   Relatives: ${result.relatives.length} found - ${result.relatives.join(', ')}`)
      console.log(`   Sources: ${result.sources_used.join(', ')}`)
      console.log(`\n   Notes:`)
      console.log(`   ${result.notes.split('\n').join('\n   ')}`)

      // Save to database
      await saveResults(property.id, result)
      console.log(`   💾 Saved to database`)

      results.push({
        property: property.owner_name,
        success: result.success,
        phones: result.phone_numbers.length,
        emails: result.email_addresses.length,
        cost: result.cost,
        sources: result.sources_used,
      })

      // Rate limit: wait 3 seconds between requests
      if (i < properties.length - 1) {
        console.log(`\n   ⏳ Waiting 3 seconds before next request...\n`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

    } catch (error) {
      console.error(`\n   ❌ Error:`, error)
      results.push({
        property: property.owner_name,
        success: false,
        phones: 0,
        emails: 0,
        cost: 0,
        sources: [],
      })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('\n📊 SUMMARY\n')
  
  const totalSuccess = results.filter(r => r.success).length
  const totalCost = results.reduce((sum, r) => sum + r.cost, 0)
  const totalPhones = results.reduce((sum, r) => sum + r.phones, 0)
  const totalEmails = results.reduce((sum, r) => sum + r.emails, 0)
  const allSources = [...new Set(results.flatMap(r => r.sources))]

  console.log(`Properties tested: ${results.length}`)
  console.log(`Successful: ${totalSuccess} (${((totalSuccess / results.length) * 100).toFixed(1)}%)`)
  console.log(`Total phones found: ${totalPhones}`)
  console.log(`Total emails found: ${totalEmails}`)
  console.log(`Total cost: $${totalCost.toFixed(2)} (avg $${(totalCost / results.length).toFixed(2)}/property)`)
  console.log(`Sources used: ${allSources.join(', ')}`)
  
  console.log('\n✅ Test complete!\n')
}

main().catch(console.error)
