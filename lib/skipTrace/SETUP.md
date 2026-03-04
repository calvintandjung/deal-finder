# Skip Trace Module - Setup Guide

## Overview

The skip trace module finds owner contact information (phone, email) by aggregating public data sources before falling back to paid services.

**Strategy:** Free sources first → Low-cost APIs → Expensive skip trace services

**Expected Cost:** $0.03-0.05 per property (vs. $0.12-0.15 paid-only)

---

## Quick Start

### 1. Database Migration

Add the `sources_used` column to track which data sources worked:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE skip_trace_requests 
ADD COLUMN IF NOT EXISTS sources_used TEXT[];
```

### 2. Environment Variables (Optional)

Add to `.env.local` for paid service integrations:

```bash
# Whitepages Pro API (recommended fallback)
WHITEPAGES_API_KEY=your_api_key_here

# BatchLeads (final fallback - not implemented yet)
BATCHLEADS_API_KEY=your_api_key_here
```

### 3. Install Dependencies

Already included in package.json. If adding new scraping tools:

```bash
npm install cheerio
npm install puppeteer  # Optional, for JavaScript-heavy sites
```

---

## Data Source Setup

### Option 1: King County Bulk Data (Recommended for Production)

**Legal:** ✅ Compliant with RCW 42.56.070(9)  
**Cost:** Free  
**Update Frequency:** Quarterly

**Steps:**
1. Go to https://info.kingcounty.gov/assessor/datadownload/
2. Download these files:
   - Real Property Account
   - Parcel
   - Sales
3. Import CSV to Supabase:

```sql
-- Create import table
CREATE TABLE king_county_parcels (
  parcel_number TEXT PRIMARY KEY,
  taxpayer_name TEXT,
  taxpayer_address TEXT,
  situs_address TEXT,
  assessed_value INTEGER,
  land_value INTEGER,
  improvement_value INTEGER,
  tax_status TEXT,
  -- Add other columns as needed
);

-- Import using Supabase dashboard or psql
COPY king_county_parcels FROM '/path/to/Real_Property_Account.csv' CSV HEADER;
```

4. Update skip trace module to query this table:

```typescript
// In lib/skipTrace/index.ts
async function getCountyAssessorData(parcelNumber: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('king_county_parcels')
    .select('*')
    .eq('parcel_number', parcelNumber)
    .single()
  
  return data
}
```

---

### Option 2: WA Voter Registration Database (Optional)

**Legal:** ⚠️ Gray area for commercial real estate (not direct marketing)  
**Cost:** ~$5 for digital file  
**Update Frequency:** Monthly

**Steps:**
1. Fill out request form: https://www.sos.wa.gov/elections/vrdb/
2. Wait 3-5 business days for approval
3. Download file when ready
4. Import to database:

```sql
CREATE TABLE voter_registry (
  last_name TEXT,
  first_name TEXT,
  middle_name TEXT,
  residential_address TEXT,
  city TEXT,
  zip TEXT,
  phone TEXT,
  registration_date DATE,
  county TEXT,
  -- Composite index for fast lookup
  INDEX idx_voter_name_city (last_name, first_name, city)
);

COPY voter_registry FROM '/path/to/voter_export.csv' CSV HEADER;
```

5. Enable matching in skip trace module (see `scrapers.ts`)

**Legal Note:** RCW 29A.08.710 allows use for "political, research, or survey purposes" but prohibits "commercial purposes" (direct marketing). Real estate wholesaling outreach may be gray area. Consult attorney before using.

---

### Option 3: Whitepages Pro API (Recommended Fallback)

**Legal:** ✅ Fully compliant  
**Cost:** $0.05-0.10 per lookup  
**Quality:** ~75% success rate

**Steps:**
1. Sign up: https://pro.whitepages.com/
2. Choose "Person Search API"
3. Add API key to `.env.local`
4. Already integrated in `lib/skipTrace/index.ts`

**Usage Limits:**
- Free tier: 50 lookups/month
- Paid tier: $50/month = 500-1000 lookups

---

### Option 4: BatchLeads/SmartSkip (Manual Fallback)

**Cost:** $0.12-0.15 per lookup  
**Quality:** ~85% success rate

For properties where automated sources fail:

1. Export property list to CSV
2. Upload to BatchLeads/SmartSkip
3. Download results
4. Import back to database:

```sql
UPDATE properties 
SET owner_phone = '...', owner_email = '...'
WHERE parcel_number = '...';

INSERT INTO skip_trace_requests (property_id, service, status, phone_numbers, cost)
VALUES ('...', 'batchleads', 'completed', ARRAY['...'], 0.12);
```

---

## Integration with App

### Single Property Skip Trace

Already integrated in property detail page (`app/properties/[id]/page.tsx`):

```tsx
import { SkipTraceButton } from '@/lib/skipTrace/SkipTraceButton'

// In component:
<SkipTraceButton 
  propertyId={property.id}
  ownerName={property.owner_name}
  hasContact={!!property.owner_phone || !!property.owner_email}
  onSuccess={(result) => {
    // Refresh property data
    window.location.reload()
  }}
/>
```

### Batch Skip Trace

Add to properties list page (`app/properties/page.tsx`):

```tsx
import { BatchSkipTrace } from '@/lib/skipTrace/SkipTraceButton'

// In component:
const selectedIds = properties
  .filter(p => !p.owner_phone && !p.owner_email)
  .map(p => p.id)

<BatchSkipTrace 
  propertyIds={selectedIds}
  onComplete={(results) => {
    console.log('Batch complete:', results)
  }}
/>
```

---

## Cost Analysis

### Expected Costs (Per Property)

| Scenario | Free Sources | Whitepages | BatchLeads | Total |
|----------|-------------|------------|------------|-------|
| **Best case** (free hit) | ✅ | - | - | $0.00 |
| **Medium case** (paid API) | ❌ | ✅ | - | $0.08 |
| **Worst case** (skip trace) | ❌ | ❌ | ✅ | $0.12 |

**Estimated Average:** $0.04 per property (assuming 60% free, 30% Whitepages, 10% manual)

### 50 Properties Cost Estimate

| Method | Cost |
|--------|------|
| BatchLeads only | $6.00 - $7.50 |
| **This module (hybrid)** | **$2.00 - $2.50** |
| **Savings** | **~$4.00 (60%)** |

---

## Legal Compliance Checklist

- ✅ Use bulk data downloads (not real-time scraping) for King County
- ✅ If using voter data, only for research/outreach (not direct marketing)
- ✅ Respect API rate limits (1 request/second)
- ✅ Provide opt-out mechanism if contacted
- ✅ Don't republish bulk data
- ❌ Don't scrape sites that prohibit automation (TruePeopleSearch, etc.)
- ❌ Don't use USPS forwarding data

**Disclaimer:** This is not legal advice. Consult an attorney for your specific use case.

---

## Testing

### Test Single Property

```bash
curl -X POST http://localhost:3000/api/skip-trace \
  -H "Content-Type: application/json" \
  -d '{"property_id": "your-property-id"}'
```

### Test Batch

```bash
curl -X PUT http://localhost:3000/api/skip-trace/batch \
  -H "Content-Type: application/json" \
  -d '{"property_ids": ["id1", "id2", "id3"]}'
```

---

## Monitoring

Track skip trace performance in Supabase:

```sql
-- Success rate by source
SELECT 
  service,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  ROUND(AVG(cost), 3) as avg_cost
FROM skip_trace_requests
GROUP BY service;

-- Cost analysis
SELECT 
  DATE(created_at) as date,
  COUNT(*) as requests,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost
FROM skip_trace_requests
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Troubleshooting

### "No results from free sources"
- **Solution:** Set up King County bulk data import
- **Workaround:** Use Whitepages API directly (add API key)

### "Whitepages API returns null"
- **Check:** API key configured in `.env.local`
- **Check:** API quota not exceeded
- **Solution:** Verify API key at https://pro.whitepages.com/

### "Property already has contact info"
- **Expected:** Skip trace skips properties with existing phone/email
- **Override:** Manually delete `owner_phone` in database to re-run

### Rate limiting errors
- **Solution:** Batch processes include 1-second delay between requests
- **Adjust:** Increase delay in `batchSkipTrace()` function

---

## Roadmap

**Phase 1 (Current):** ✅ Core module + API routes  
**Phase 2:** ⬜ King County bulk data import automation  
**Phase 3:** ⬜ Voter registry matching  
**Phase 4:** ⬜ WA SOS business entity scraper (puppeteer)  
**Phase 5:** ⬜ Machine learning matching improvements  
**Phase 6:** ⬜ Multi-county support (Pierce, Snohomish)  

---

## Support

Questions? Check:
- `RESEARCH.md` - Detailed data source analysis
- `scrapers.ts` - Implementation templates
- `index.ts` - Main orchestration logic

Created by: Cozy AI  
Last Updated: March 4, 2026
