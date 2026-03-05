
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
  