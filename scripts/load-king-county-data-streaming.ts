#!/usr/bin/env tsx
/**
 * Load King County Assessor data into Supabase (streaming version)
 * 
 * Uses streaming to handle large CSV files without running out of memory
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

async function createTable() {
  console.log('📋 Creating SQL migration file...')
  
  const schema = `
-- King County Assessor data table
CREATE TABLE IF NOT EXISTS king_county_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Parcel identification  
  parcel_number TEXT NOT NULL,
  major TEXT NOT NULL,
  minor TEXT NOT NULL,
  
  -- Property location
  property_address TEXT,
  zip_code TEXT,
  district_name TEXT,
  
  -- Owner mailing address
  mailing_address TEXT,
  mailing_city_state TEXT,
  mailing_zip TEXT,
  
  -- Property details
  property_type TEXT,
  zoning TEXT,
  present_use TEXT,
  lot_size_sqft INTEGER,
  
  -- Building details
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  building_sqft INTEGER,
  year_built INTEGER,
  
  -- Assessed values
  assessed_land_value INTEGER,
  assessed_improvement_value INTEGER,
  total_assessed_value INTEGER,
  
  -- For fuzzy matching
  normalized_address TEXT,
  
  UNIQUE(major, minor)
);

CREATE INDEX IF NOT EXISTS idx_kc_parcel_number ON king_county_owners(parcel_number);
CREATE INDEX IF NOT EXISTS idx_kc_district ON king_county_owners(district_name);
CREATE INDEX IF NOT EXISTS idx_kc_normalized_address ON king_county_owners(normalized_address);
CREATE INDEX IF NOT EXISTS idx_kc_zip ON king_county_owners(zip_code);
  `
  
  const migrationDir = path.join(__dirname, '../supabase/migrations')
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true })
  }
  
  fs.writeFileSync(path.join(migrationDir, '001_king_county_table.sql'), schema)
  console.log('✅ Migration file created: supabase/migrations/001_king_county_table.sql')
  console.log('\n⚠️  Please run this SQL in Supabase SQL Editor before continuing!\n')
}

async function loadSeattleData() {
  console.log('📊 Building lookups from CSV files (Seattle only)...\n')
  
  // Build account lookup (mailing addresses, values)
  console.log('Reading accounts...')
  const accountMap = new Map<string, any>()
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(path.join(DATA_DIR, 'EXTR_RPAcct_NoName.csv'))
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row: any) => {
        const key = `${row.Major}-${row.Minor}`
        accountMap.set(key, row)
      })
      .on('end', () => {
        console.log(`✅ Loaded ${accountMap.size} accounts`)
        resolve()
      })
      .on('error', reject)
  })
  
  // Build building lookup
  console.log('\nReading buildings...')
  const buildingMap = new Map<string, any>()
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(path.join(DATA_DIR, 'EXTR_ResBldg.csv'))
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row: any) => {
        const key = `${row.Major}-${row.Minor}`
        // If multiple buildings per parcel, keep first one
        if (!buildingMap.has(key)) {
          buildingMap.set(key, row)
        }
      })
      .on('end', () => {
        console.log(`✅ Loaded ${buildingMap.size} buildings`)
        resolve()
      })
      .on('error', reject)
  })
  
  // Now stream parcels and join Seattle properties
  console.log('\nProcessing Seattle parcels and inserting...')
  
  let totalProcessed = 0
  let seattleCount = 0
  let batch: any[] = []
  const BATCH_SIZE = 500
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(path.join(DATA_DIR, 'EXTR_Parcel.csv'))
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', async (parcel: any) => {
        totalProcessed++
        
        // Filter to Seattle only
        if (parcel.DistrictName?.trim() !== 'SEATTLE') {
          return
        }
        
        seattleCount++
        
        const key = `${parcel.Major}-${parcel.Minor}`
        const account = accountMap.get(key)
        const building = buildingMap.get(key)
        
        const propertyAddress = building?.Address || ''
        const zipCode = building?.ZipCode || account?.ZipCode || ''
        
        const record = {
          parcel_number: `${parcel.Major}${parcel.Minor}`,
          major: parcel.Major,
          minor: parcel.Minor,
          property_address: propertyAddress,
          zip_code: zipCode?.trim(),
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
        }
        
        batch.push(record)
        
        // Insert batch when full
        if (batch.length >= BATCH_SIZE) {
          const currentBatch = [...batch]
          batch = []
          
          const { error } = await supabase
            .from('king_county_owners')
            .upsert(currentBatch, {
              onConflict: 'major,minor',
              ignoreDuplicates: false
            })
          
          if (error) {
            console.error(`Error inserting batch:`, error)
          } else {
            console.log(`✅ Inserted ${seattleCount} Seattle properties so far...`)
          }
        }
      })
      .on('end', async () => {
        // Insert final batch
        if (batch.length > 0) {
          const { error } = await supabase
            .from('king_county_owners')
            .upsert(batch, {
              onConflict: 'major,minor',
              ignoreDuplicates: false
            })
          
          if (error) {
            console.error(`Error inserting final batch:`, error)
          }
        }
        
        console.log(`\n✅ Processed ${totalProcessed} total parcels`)
        console.log(`✅ Loaded ${seattleCount} Seattle properties`)
        resolve()
      })
      .on('error', reject)
  })
  
  console.log('\n🎉 Data load complete!')
}

async function main() {
  try {
    await createTable()
    
    console.log('\n⏸️  Waiting for you to run the migration in Supabase...')
    console.log('Press Enter when ready to load data...')
    
    await new Promise(resolve => {
      process.stdin.once('data', resolve)
    })
    
    await loadSeattleData()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
