#!/usr/bin/env tsx
/**
 * Load King County Assessor data - Simplified version
 * Run with: node --max-old-space-size=4096 -r tsx/register scripts/load-king-county-simple.ts
 */

import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'
)

const DATA_DIR = path.join(__dirname, '../data/king-county')

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

async function loadData() {
  console.log('📊 Loading King County Data (Seattle only)\n')
  
  // Check table exists
  const { error: checkError } = await supabase
    .from('king_county_owners')
    .select('id')
    .limit(1)
  
  if (checkError) {
    console.error('❌ Table does not exist! Please run the migration SQL first.')
    console.error('See data/king-county/README.md for instructions.')
    process.exit(1)
  }
  
  console.log('✅ Table exists\n')
  
  // Load accounts (lighter memory footprint)
  console.log('1/3 Loading accounts...')
  const accountMap = new Map<string, any>()
  
  await new Promise<void>((resolve, reject) => {
    let count = 0
    fs.createReadStream(path.join(DATA_DIR, 'EXTR_RPAcct_NoName.csv'))
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row: any) => {
        accountMap.set(`${row.Major}-${row.Minor}`, row)
        count++
        if (count % 100000 === 0) process.stdout.write(`  ${count.toLocaleString()}...\r`)
      })
      .on('end', () => {
        console.log(`  ✅ ${accountMap.size.toLocaleString()} accounts loaded`)
        resolve()
      })
      .on('error', reject)
  })
  
  // Load buildings
  console.log('\n2/3 Loading buildings...')
  const buildingMap = new Map<string, any>()
  
  await new Promise<void>((resolve, reject) => {
    let count = 0
    fs.createReadStream(path.join(DATA_DIR, 'EXTR_ResBldg.csv'))
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row: any) => {
        const key = `${row.Major}-${row.Minor}`
        if (!buildingMap.has(key)) {
          buildingMap.set(key, row)
        }
        count++
        if (count % 100000 === 0) process.stdout.write(`  ${count.toLocaleString()}...\r`)
      })
      .on('end', () => {
        console.log(`  ✅ ${buildingMap.size.toLocaleString()} buildings loaded`)
        resolve()
      })
      .on('error', reject)
  })
  
  // Process parcels (Seattle only)
  console.log('\n3/3 Processing Seattle parcels...')
  
  let totalProcessed = 0
  let seattleCount = 0
  let batch: any[] = []
  const BATCH_SIZE = 500
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(path.join(DATA_DIR, 'EXTR_Parcel.csv'))
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', async (parcel: any) => {
        totalProcessed++
        
        if (totalProcessed % 50000 === 0) {
          process.stdout.write(`  Processed ${totalProcessed.toLocaleString()}, found ${seattleCount.toLocaleString()} Seattle parcels...\r`)
        }
        
        if (parcel.DistrictName?.trim() !== 'SEATTLE') return
        
        seattleCount++
        
        const key = `${parcel.Major}-${parcel.Minor}`
        const account = accountMap.get(key)
        const building = buildingMap.get(key)
        
        const propertyAddress = building?.Address || ''
        
        batch.push({
          parcel_number: `${parcel.Major}${parcel.Minor}`,
          major: parcel.Major,
          minor: parcel.Minor,
          property_address: propertyAddress,
          zip_code: (building?.ZipCode || account?.ZipCode || '').trim(),
          district_name: 'SEATTLE',
          mailing_address: account?.AddrLine?.trim(),
          mailing_city_state: account?.CityState?.trim(),
          mailing_zip: account?.ZipCode?.trim(),
          property_type: parcel.PropType?.trim(),
          zoning: parcel.CurrentZoning?.trim(),
          present_use: parcel.PresentUse?.trim(),
          lot_size_sqft: parseInt(parcel.SqFtLot) || null,
          bedrooms: parseInt(building?.Bedrooms) || null,
          bathrooms: parseFloat(building?.BathFullCount) || null,
          building_sqft: parseInt(building?.SqFtTotLiving) || null,
          year_built: parseInt(building?.YrBuilt) || null,
          assessed_land_value: parseInt(account?.ApprLandVal) || null,
          assessed_improvement_value: parseInt(account?.ApprImpsVal) || null,
          total_assessed_value: (parseInt(account?.ApprLandVal) || 0) + (parseInt(account?.ApprImpsVal) || 0),
          normalized_address: normalizeAddress(propertyAddress)
        })
        
        if (batch.length >= BATCH_SIZE) {
          const currentBatch = [...batch]
          batch = []
          
          const { error } = await supabase
            .from('king_county_owners')
            .upsert(currentBatch, { onConflict: 'major,minor' })
          
          if (error) {
            console.error(`\n❌ Error inserting:`, error.message)
          } else {
            process.stdout.write(`  ✅ Inserted ${seattleCount.toLocaleString()} Seattle properties so far...\r`)
          }
        }
      })
      .on('end', async () => {
        // Insert final batch
        if (batch.length > 0) {
          await supabase
            .from('king_county_owners')
            .upsert(batch, { onConflict: 'major,minor' })
        }
        
        console.log(`\n  ✅ Total parcels processed: ${totalProcessed.toLocaleString()}`)
        console.log(`  ✅ Seattle properties loaded: ${seattleCount.toLocaleString()}`)
        resolve()
      })
      .on('error', reject)
  })
  
  console.log('\n🎉 Data load complete!\n')
}

loadData().catch(console.error)
