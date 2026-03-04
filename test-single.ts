/**
 * Quick test with a real person to verify scrapers work
 */

import { aggregateFreeSources } from './lib/skipTrace/freeScraper'

async function main() {
  console.log('Testing scrapers with a real person...\n')
  
  // Test with a common name in Seattle
  const result = await aggregateFreeSources(
    'John Smith',
    'Seattle',
    'WA'
  )
  
  console.log('\n✅ Results:')
  console.log(`   Phones: ${result.phones.length} found - ${result.phones.slice(0, 3).join(', ')}${result.phones.length > 3 ? '...' : ''}`)
  console.log(`   Emails: ${result.emails.length} found - ${result.emails.slice(0, 3).join(', ')}${result.emails.length > 3 ? '...' : ''}`)
  console.log(`   Relatives: ${result.relatives.length} found - ${result.relatives.slice(0, 5).join(', ')}${result.relatives.length > 5 ? '...' : ''}`)
  console.log(`   Addresses: ${result.addresses.length} found`)
  console.log(`   Sources: ${result.sources_used.join(', ')}`)
  
  console.log('\n🎯 Scraper test complete!')
}

main().catch(console.error)
