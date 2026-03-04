export type PropertyStatus = 'new' | 'researching' | 'contacted' | 'negotiating' | 'under-contract' | 'closed' | 'dead'
export type DealType = 'wholesaling' | 'adu' | 'teardown' | 'fix-flip'
export type AnalysisType = 'wholesaling' | 'adu-build' | 'teardown-rebuild' | 'fix-flip'
export type OutreachMethod = 'phone' | 'email' | 'mail' | 'door-knock' | 'text'
export type OutreachOutcome = 'no-answer' | 'not-interested' | 'interested' | 'appointment-set' | 'offer-made' | 'under-contract'
export type SkipTraceService = 'batchleads' | 'smartskip' | 'manual'
export type SkipTraceStatus = 'pending' | 'completed' | 'failed'

export interface Property {
  id: string
  created_at: string
  updated_at: string
  
  // Location
  address: string
  city: string
  state: string
  zip: string
  county?: string
  parcel_number?: string
  lat?: number
  lng?: number
  
  // Property Details
  lot_size_sqft?: number
  building_sqft?: number
  bedrooms?: number
  bathrooms?: number
  year_built?: number
  zoning?: string
  property_type?: string
  
  // ADU/DADU Feasibility
  is_corner_lot: boolean
  has_alley_access: boolean
  has_hoa: boolean
  adu_eligible?: boolean
  adu_notes?: string
  
  // Values & Assessment
  assessed_value?: number
  assessed_land_value?: number
  assessed_improvement_value?: number
  market_value?: number
  last_sale_price?: number
  last_sale_date?: string
  
  // Ownership
  owner_name?: string
  owner_mailing_address?: string
  owner_phone?: string
  owner_email?: string
  days_owned?: number
  
  // Distress Indicators
  is_absentee_owner: boolean
  tax_delinquent: boolean
  pre_foreclosure: boolean
  estate_sale: boolean
  divorce_filing: boolean
  code_violations: number
  vacant: boolean
  
  // Deal Scoring
  wholesaling_score?: number
  adu_score?: number
  overall_score?: number
  deal_type?: DealType
  
  // Status
  status: PropertyStatus
  
  // Source
  source?: string
  source_url?: string
  
  // Notes
  notes?: string
}

export interface ComparableSale {
  id: string
  created_at: string
  property_id: string
  
  address: string
  distance_miles?: number
  sale_price: number
  sale_date: string
  building_sqft?: number
  lot_size_sqft?: number
  bedrooms?: number
  bathrooms?: number
  year_built?: number
  price_per_sqft?: number
  
  condition_adjustment: number
  location_adjustment: number
  size_adjustment: number
  adjusted_price?: number
  
  source?: string
  source_url?: string
}

export interface DealAnalysis {
  id: string
  created_at: string
  updated_at: string
  property_id: string
  
  analysis_type: AnalysisType
  
  // Costs
  purchase_price?: number
  closing_costs?: number
  renovation_cost?: number
  adu_build_cost?: number
  demolition_cost?: number
  new_construction_cost?: number
  holding_costs?: number
  financing_costs?: number
  total_costs?: number
  
  // Revenue/ARV
  arv?: number
  rental_income_monthly?: number
  adu_rental_income_monthly?: number
  resale_value?: number
  
  // Returns
  profit?: number
  roi_percentage?: number
  cash_on_cash_return?: number
  cap_rate?: number
  
  notes?: string
  assumptions?: string
}

export interface OutreachRecord {
  id: string
  created_at: string
  property_id: string
  
  method: OutreachMethod
  attempted_at: string
  contacted: boolean
  
  message?: string
  response?: string
  interested?: boolean
  
  follow_up_date?: string
  follow_up_notes?: string
  
  outcome?: OutreachOutcome
}

export interface SkipTraceRequest {
  id: string
  created_at: string
  property_id: string
  
  service: SkipTraceService
  status: SkipTraceStatus
  
  phone_numbers?: string[]
  email_addresses?: string[]
  relatives?: string[]
  additional_addresses?: string[]
  
  cost?: number
  notes?: string
}

export interface PropertyWithRelations extends Property {
  comparable_sales?: ComparableSale[]
  deal_analyses?: DealAnalysis[]
  outreach_records?: OutreachRecord[]
  skip_trace_requests?: SkipTraceRequest[]
}

// Filter types for property search
export interface PropertyFilters {
  city?: string
  zip?: string
  minLotSize?: number
  maxLotSize?: number
  minPrice?: number
  maxPrice?: number
  isCornerLot?: boolean
  hasAlleyAccess?: boolean
  hasHoa?: boolean
  aduEligible?: boolean
  minScore?: number
  dealType?: DealType
  status?: PropertyStatus
  distressIndicators?: {
    absenteeOwner?: boolean
    taxDelinquent?: boolean
    preForeclosure?: boolean
    estateSale?: boolean
    divorceFiling?: boolean
    vacant?: boolean
  }
}
