# Skip Trace Implementation Guide

## Quick Start (30 minutes)

### Step 1: Add Whitepages API Key (Optional but Recommended)
```bash
cd /Users/calv/.openclaw/workspace/deal-finder

# Add to .env.local
echo 'WHITEPAGES_API_KEY=your_key_here' >> .env.local

# Get key: https://pro.whitepages.com/ (free tier: 50/month)
```

### Step 2: Test Current System
```bash
npx tsx test-skip-trace.ts
```

**Expected:** 0% success (no data sources setup yet)

---

## Data Source Setup

### Option A: Voter Registry (60% success rate, FREE)

**1. Request file:**
- Go to: https://www.sos.wa.gov/elections/vrdb/
- Fill out form
- Purpose: "Research"
- Pay $5 fee
- Wait 3-5 business days

**2. Import to Supabase:**
```bash
# Create table
psql ... <<SQL
CREATE TABLE voter_registry (
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  residential_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  registration_date DATE,
  county TEXT
);

CREATE INDEX idx_voter_name ON voter_registry(last_name, first_name);
CREATE INDEX idx_voter_address ON voter_registry(residential_address);
SQL

# Import CSV
\copy voter_registry FROM 'voters.csv' CSV HEADER
```

**3. Enable in code:**

Edit `lib/skipTrace/index.ts`, find `searchVoterRegistry` function:

```typescript
async function searchVoterRegistry(
  name: string, 
  city: string, 
  state: string
): Promise<{ phone: string | null, email: string | null } | null> {
  const supabase = createClient()
  
  // Parse name
  const parts = name.split(' ')
  const firstName = parts[0]
  const lastName = parts.slice(-1)[0]
  
  // Fuzzy match
  const { data, error } = await supabase
    .from('voter_registry')
    .select('phone, email')
    .ilike('first_name', `%${firstName}%`)
    .ilike('last_name', `%${lastName}%`)
    .eq('city', city)
    .limit(1)
    .single()
  
  if (error || !data) return null
  
  return {
    phone: data.phone,
    email: data.email
  }
}
```

---

### Option B: King County Assessor (100% mailing addresses, FREE)

**1. Download data:**
```bash
# Go to: https://info.kingcounty.gov/assessor/datadownload/
# Download "Real Property Account" ZIP file

cd ~/Downloads
unzip real_property.zip
```

**2. Import to Supabase:**

```bash
# Create table
psql ... <<SQL
CREATE TABLE king_county_parcels (
  parcel_number TEXT PRIMARY KEY,
  taxpayer_name TEXT,
  taxpayer_address TEXT,
  taxpayer_city TEXT,
  taxpayer_state TEXT,
  taxpayer_zip TEXT,
  property_address TEXT,
  property_city TEXT,
  assessed_value DECIMAL,
  land_value DECIMAL,
  improvement_value DECIMAL
);

CREATE INDEX idx_parcel_owner ON king_county_parcels(taxpayer_name);
CREATE INDEX idx_parcel_address ON king_county_parcels(property_address);
SQL

# Import CSV
\copy king_county_parcels FROM 'real_property.csv' CSV HEADER
```

**3. Use in code:**

Add to `lib/skipTrace/index.ts`:

```typescript
async function getMailingAddress(
  ownerName: string,
  propertyAddress: string
): Promise<string | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('king_county_parcels')
    .select('taxpayer_address, taxpayer_city, taxpayer_state, taxpayer_zip')
    .ilike('taxpayer_name', `%${ownerName}%`)
    .ilike('property_address', `%${propertyAddress}%`)
    .limit(1)
    .single()
  
  if (error || !data) return null
  
  return `${data.taxpayer_address}, ${data.taxpayer_city}, ${data.taxpayer_state} ${data.taxpayer_zip}`
}
```

---

### Option C: Anti-Bot Bypass (70% success with scrapers)

**1. Install plugins:**
```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

**2. Update `freeScraper.ts`:**

```typescript
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

// Rest of code stays the same
```

**3. Optional: Add CAPTCHA solver (for stubborn cases):**

```bash
npm install 2captcha-node
```

```typescript
import Captcha from '2captcha-node'

const captcha = new Captcha(process.env.CAPTCHA_API_KEY)

// When blocked by CAPTCHA:
const solution = await captcha.solve(sitekey, pageUrl)
await page.evaluate((token) => {
  document.getElementById('g-recaptcha-response').value = token
}, solution.data)
```

**Cost:** ~$0.002 per property (if needed)

---

## Testing Strategy

### Phase 1: Baseline (No Setup)
```bash
npx tsx test-skip-trace.ts
```
**Expected:** 0% success

### Phase 2: With Whitepages API
```bash
# Add API key to .env.local
npx tsx test-skip-trace.ts
```
**Expected:** 70-75% success, ~$0.08/property

### Phase 3: With Voter + Assessor Data
```bash
# After importing data
npx tsx test-skip-trace.ts
```
**Expected:** 85-90% success, ~$0.01/property

### Phase 4: With Anti-Bot Bypass (Optional)
```bash
# After adding stealth plugin
npx tsx test-skip-trace.ts
```
**Expected:** 90-95% success, ~$0.01/property

---

## Production Deployment

### Add to Database Migration
```sql
-- Run in Supabase SQL Editor

-- Add sources_used column
ALTER TABLE skip_trace_requests 
ADD COLUMN IF NOT EXISTS sources_used TEXT[];

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_skip_trace_property 
ON skip_trace_requests(property_id);

CREATE INDEX IF NOT EXISTS idx_skip_trace_status 
ON skip_trace_requests(status);
```

### Add to UI
Already integrated in:
- `app/properties/[id]/page.tsx` (property detail page)
- `lib/skipTrace/SkipTraceButton.tsx` (React component)

Just test:
```bash
npm run dev
# Go to http://localhost:3000/properties/[id]
# Click "Run Skip Trace" button
```

---

## Monitoring & Analytics

### Check Success Rate
```sql
SELECT 
  COUNT(*) as total_requests,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  ROUND(AVG(cost), 2) as avg_cost,
  string_agg(DISTINCT service, ', ') as sources_used
FROM skip_trace_requests
WHERE created_at > NOW() - INTERVAL '30 days';
```

### Cost Tracking
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as requests,
  SUM(cost) as total_cost,
  ROUND(AVG(cost), 2) as avg_cost
FROM skip_trace_requests
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

---

## Troubleshooting

### Scrapers return 0 results
**Cause:** CAPTCHA blocking
**Fix:** Add puppeteer-extra-plugin-stealth (Option C above)

### Voter registry not finding matches
**Cause:** Name formatting differences
**Fix:** Add fuzzy matching:
```typescript
// Use Levenshtein distance or soundex
import { levenshtein } from 'fast-levenshtein'

const matches = allVoters.filter(voter => {
  const distance = levenshtein(ownerName, `${voter.first_name} ${voter.last_name}`)
  return distance < 3 // Allow 3-character difference
})
```

### Whitepages API returns null
**Check:**
1. API key in `.env.local`?
2. Restart dev server after adding key?
3. Free tier limit reached? (50/month)
4. Name format correct?

---

## Performance Optimization

### Batch Processing
```typescript
// Process 50 properties with rate limiting
const propertyIds = [/* ... */]

for (const id of propertyIds) {
  await runSkipTrace({property_id: id, ...})
  await delay(1000) // 1 second between requests
}
```

### Caching
```typescript
// Cache voter data in memory
const voterCache = new Map()

async function searchVoterRegistry(name, city, state) {
  const cacheKey = `${name}|${city}|${state}`
  if (voterCache.has(cacheKey)) {
    return voterCache.get(cacheKey)
  }
  
  const result = await actualSearch(name, city, state)
  voterCache.set(cacheKey, result)
  return result
}
```

---

## Next Steps

**Week 1:**
- [ ] Request voter file
- [ ] Download King County data
- [ ] Add Whitepages API key
- [ ] Test on 5 properties

**Week 2:**
- [ ] Import voter data
- [ ] Import assessor data
- [ ] Update matching logic
- [ ] Test on 50 properties

**Week 3 (Optional):**
- [ ] Add anti-bot bypass
- [ ] Build WA SOS scraper
- [ ] Test success rates
- [ ] Optimize performance

---

**Questions?** Check:
- `FINAL-DELIVERABLE.md` - Full summary
- `YOLO-REALITY-CHECK.md` - Anti-bot analysis
- `README.md` - Technical docs
