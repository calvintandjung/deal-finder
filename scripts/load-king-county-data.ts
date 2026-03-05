#!/usr/bin/env tsx
/**
 * Load King County Assessor data into Supabase
 * 
 * This script:
 * 1. Creates king_county_owners table if needed
 * 2. Parses CSV files from King County Assessor
 * 3. Loads parcel, owner, and building data
 * 4. Indexes for fast lookups
 */

import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'
)

const DATA_DIR = path.join(__dirname, '../data/king-county')

interface ParcelData {
  Major: string
  Minor: string
  DistrictName: string
  PropType: string
  CurrentZoning: string
  PresentUse: string
  SqFtLot: string
}

interface AccountData {
  Major: string
  Minor: string
  AddrLine: string
  CityState: string
  ZipCode: string
  ApprLandVal: string
  ApprImpsVal: string
}

interface BuildingData {
  Major: string
  Minor: string
  Address: string
  ZipCode: string
  Bedrooms: string
  BathFullCount: string
  SqFtTotLiving: string
  YrBuilt: string
}

async function createKingCountyTable() {
  console.log('Creating king_county_owners table...')
  
  const { error } = await supabase.rpc('exec_sql', {
    query: `
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
  })
  
  if (error) {
    console.error('Table creation failed:', error)
    // Try direct SQL instead
    await createTableDirect()
  } else {
    console.log('✅ Table created successfully')
  }
}

async function createTableDirect() {
  console.log('Trying direct SQL...')
  
  // We'll use a migration file instead
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
  
  fs.writeFileSync(path.join(__dirname, '../supabase/migrations/king_county_table.sql'), schema)
  console.log('✅ Migration file created at supabase/migrations/king_county_table.sql')
  console.log('Please run this SQL in your Supabase SQL editor')
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

async function loadData() {
  console.log('\n📊 Loading King County data files...')
  
  // Load parcel data
  console.log('\nReading EXTR_Parcel.csv...')
  const parcelCsv = fs.readFileSync(path.join(DATA_DIR, 'EXTR_Parcel.csv'), 'utf-8')
  const parcelData: ParcelData[] = parse(parcelCsv, { 
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  })
  console.log(`✅ Loaded ${parcelData.length} parcels`)
  
  // Load account data (with mailing addresses)
  console.log('\nReading EXTR_RPAcct_NoName.csv...')
  const accountCsv = fs.readFileSync(path.join(DATA_DIR, 'EXTR_RPAcct_NoName.csv'), 'utf-8')
  const accountData: AccountData[] = parse(accountCsv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  })
  console.log(`✅ Loaded ${accountData.length} accounts`)
  
  // Load residential building data
  console.log('\nReading EXTR_ResBldg.csv...')
  const buildingCsv = fs.readFileSync(path.join(DATA_DIR, 'EXTR_ResBldg.csv'), 'utf-8')
  const buildingData: BuildingData[] = parse(buildingCsv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  })
  console.log(`✅ Loaded ${buildingData.length} buildings`)
  
  // Create lookup maps for efficient joining
  const accountMap = new Map<string, AccountData>()
  accountData.forEach(acc => {
    const key = `${acc.Major}-${acc.Minor}`
    accountMap.set(key, acc)
  })
  
  const buildingMap = new Map<string, BuildingData>()
  buildingData.forEach(bldg => {
    const key = `${bldg.Major}-${bldg.Minor}`
    buildingMap.set(key, bldg)
  })
  
  console.log('\n🔗 Joining data...')
  
  // Filter to Seattle properties only and join all data
  const seattleData = parcelData
    .filter(p => p.DistrictName?.trim() === 'SEATTLE')
    .map(parcel => {
      const key = `${parcel.Major}-${parcel.Minor}`
      const account = accountMap.get(key)
      const building = buildingMap.get(key)
      
      const propertyAddress = building?.Address || ''
      const zipCode = building?.ZipCode || account?.ZipCode || ''
      
      return {
        parcel_number: `${parcel.Major}${parcel.Minor}`,
        major: parcel.Major,
        minor: parcel.Minor,
        property_address: propertyAddress,
        zip_code: zipCode?.trim(),
        district_name: parcel.DistrictName?.trim(),
        mailing_address: account?.AddrLine?.trim(),
        mailing_city_state: account?.CityState?.trim(),
        mailing_zip: account?.ZipCode?.trim(),
        property_type: parcel.PropType?.trim(),
        zoning: parcel.CurrentZoning?.trim(),
        present_use: parcel.PresentUse?.trim(),
        lot_size_sqft: parcel.SqFtLot ? parseInt(parcel.SqFtLot) : null,
        bedrooms: building?.Bedrooms ? parseInt(building.Bedrooms) : null,
        bathrooms: building?.BathFullCount ? parseFloat(building.BathFullCount) : null,
        building_sqft: building?.SqFtTotLiving ? parseInt(building.SqFtTotLiving) : null,
        year_built: building?.YrBuilt ? parseInt(building.YrBuilt) : null,
        assessed_land_value: account?.ApprLandVal ? parseInt(account.ApprLandVal) : null,
        assessed_improvement_value: account?.ApprImpsVal ? parseInt(account.ApprImpsVal) : null,
        total_assessed_value: (account?.ApprLandVal ? parseInt(account.ApprLandVal) : 0) + (account?.ApprImpsVal ? parseInt(account.ApprImpsVal) : 0),
        normalized_address: normalizeAddress(propertyAddress)
      }
    })
  
  console.log(`✅ Prepared ${seattleData.length} Seattle properties`)
  
  // Insert in batches
  console.log('\n💾 Inserting into database...')
  const BATCH_SIZE = 1000
  
  for (let i = 0; i < seattleData.length; i += BATCH_SIZE) {
    const batch = seattleData.slice(i, i + BATCH_SIZE)
    
    const { error } = await supabase
      .from('king_county_owners')
      .upsert(batch, { 
        onConflict: 'major,minor',
        ignoreDuplicates: false 
      })
    
    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error)
    } else {
      console.log(`✅ Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} records)`)
    }
  }
  
  console.log('\n🎉 Data load complete!')
}

async function main() {
  try {
    await createKingCountyTable()
    await loadData()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
