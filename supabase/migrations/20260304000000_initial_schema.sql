-- Real Estate Deal Finder Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'WA',
  zip TEXT NOT NULL,
  county TEXT,
  parcel_number TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  
  -- Property Details
  lot_size_sqft INTEGER,
  building_sqft INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  year_built INTEGER,
  zoning TEXT,
  property_type TEXT, -- 'single-family', 'condo', 'townhouse', etc.
  
  -- ADU/DADU Feasibility
  is_corner_lot BOOLEAN DEFAULT FALSE,
  has_alley_access BOOLEAN DEFAULT FALSE,
  has_hoa BOOLEAN DEFAULT FALSE,
  adu_eligible BOOLEAN,
  adu_notes TEXT,
  
  -- Values & Assessment
  assessed_value INTEGER,
  assessed_land_value INTEGER,
  assessed_improvement_value INTEGER,
  market_value INTEGER,
  last_sale_price INTEGER,
  last_sale_date DATE,
  
  -- Ownership
  owner_name TEXT,
  owner_mailing_address TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  days_owned INTEGER,
  
  -- Distress Indicators
  is_absentee_owner BOOLEAN DEFAULT FALSE,
  tax_delinquent BOOLEAN DEFAULT FALSE,
  pre_foreclosure BOOLEAN DEFAULT FALSE,
  estate_sale BOOLEAN DEFAULT FALSE,
  divorce_filing BOOLEAN DEFAULT FALSE,
  code_violations INTEGER DEFAULT 0,
  vacant BOOLEAN DEFAULT FALSE,
  
  -- Deal Scoring
  wholesaling_score INTEGER, -- 0-100
  adu_score INTEGER, -- 0-100
  overall_score INTEGER, -- 0-100
  deal_type TEXT, -- 'wholesaling', 'adu', 'teardown', 'fix-flip'
  
  -- Status
  status TEXT DEFAULT 'new', -- 'new', 'researching', 'contacted', 'negotiating', 'under-contract', 'closed', 'dead'
  
  -- Source
  source TEXT, -- 'king-county', 'manual', 'zillow', etc.
  source_url TEXT,
  
  -- Notes
  notes TEXT
);

-- Create indexes
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_zip ON properties(zip);
CREATE INDEX idx_properties_lot_size ON properties(lot_size_sqft);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_deal_type ON properties(deal_type);
CREATE INDEX idx_properties_wholesaling_score ON properties(wholesaling_score);
CREATE INDEX idx_properties_adu_score ON properties(adu_score);
CREATE INDEX idx_properties_overall_score ON properties(overall_score);

-- Comparable sales table
CREATE TABLE comparable_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Comp details
  address TEXT NOT NULL,
  distance_miles DECIMAL(4, 2),
  sale_price INTEGER NOT NULL,
  sale_date DATE NOT NULL,
  building_sqft INTEGER,
  lot_size_sqft INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  year_built INTEGER,
  price_per_sqft DECIMAL(10, 2),
  
  -- Adjustments
  condition_adjustment INTEGER DEFAULT 0,
  location_adjustment INTEGER DEFAULT 0,
  size_adjustment INTEGER DEFAULT 0,
  adjusted_price INTEGER,
  
  -- Source
  source TEXT,
  source_url TEXT
);

CREATE INDEX idx_comps_property_id ON comparable_sales(property_id);
CREATE INDEX idx_comps_sale_date ON comparable_sales(sale_date);

-- Deal analysis table
CREATE TABLE deal_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Analysis type
  analysis_type TEXT NOT NULL, -- 'wholesaling', 'adu-build', 'teardown-rebuild', 'fix-flip'
  
  -- Costs
  purchase_price INTEGER,
  closing_costs INTEGER,
  renovation_cost INTEGER,
  adu_build_cost INTEGER,
  demolition_cost INTEGER,
  new_construction_cost INTEGER,
  holding_costs INTEGER,
  financing_costs INTEGER,
  total_costs INTEGER,
  
  -- Revenue/ARV
  arv INTEGER, -- After Repair Value
  rental_income_monthly INTEGER,
  adu_rental_income_monthly INTEGER,
  resale_value INTEGER,
  
  -- Returns
  profit INTEGER,
  roi_percentage DECIMAL(5, 2),
  cash_on_cash_return DECIMAL(5, 2),
  cap_rate DECIMAL(5, 2),
  
  -- Notes
  notes TEXT,
  assumptions TEXT
);

CREATE INDEX idx_analyses_property_id ON deal_analyses(property_id);
CREATE INDEX idx_analyses_type ON deal_analyses(analysis_type);

-- Outreach tracking table
CREATE TABLE outreach_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Outreach details
  method TEXT NOT NULL, -- 'phone', 'email', 'mail', 'door-knock', 'text'
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  contacted BOOLEAN DEFAULT FALSE,
  
  -- Communication
  message TEXT,
  response TEXT,
  interested BOOLEAN,
  
  -- Follow-up
  follow_up_date DATE,
  follow_up_notes TEXT,
  
  -- Outcome
  outcome TEXT -- 'no-answer', 'not-interested', 'interested', 'appointment-set', 'offer-made', 'under-contract'
);

CREATE INDEX idx_outreach_property_id ON outreach_records(property_id);
CREATE INDEX idx_outreach_attempted_at ON outreach_records(attempted_at);
CREATE INDEX idx_outreach_follow_up_date ON outreach_records(follow_up_date);

-- Skip trace requests table
CREATE TABLE skip_trace_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Request details
  service TEXT, -- 'batchleads', 'smartskip', 'manual'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  
  -- Results
  phone_numbers TEXT[], -- Array of phone numbers found
  email_addresses TEXT[], -- Array of emails found
  relatives TEXT[], -- Array of relative names
  additional_addresses TEXT[], -- Array of additional addresses
  
  -- Cost tracking
  cost DECIMAL(6, 2),
  
  -- Notes
  notes TEXT
);

CREATE INDEX idx_skip_trace_property_id ON skip_trace_requests(property_id);
CREATE INDEX idx_skip_trace_status ON skip_trace_requests(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deal_analyses_updated_at BEFORE UPDATE ON deal_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Enable for production
-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE comparable_sales ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deal_analyses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE outreach_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE skip_trace_requests ENABLE ROW LEVEL SECURITY;

-- Add RLS policies as needed for multi-user support
