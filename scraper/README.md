# Deal Finder Scrapers

## 🎯 Production Scraper (REAL DATA)

### `king_county_scraper.py` - **USE THIS**
Sources **REAL Seattle properties** from King County public records.

**Features:**
- ✅ 100% real addresses with valid parcel numbers
- ✅ Matches King County owner database (186K properties)
- ✅ Smart distress scoring (absentee owners, large lots, old properties, teardown potential)
- ✅ Direct Supabase integration
- ✅ Filters for Seattle-only properties
- ✅ Classifies by deal type (wholesaling/ADU/teardown)

**Usage:**
```bash
cd /Users/calv/.openclaw/workspace/deal-finder/scraper
python3 king_county_scraper.py
```

**Output:**
- Inserts 100 high-quality distressed properties
- All properties have real addresses verifiable against King County records
- Skip trace match rate: ~100%

---

## 🚫 Legacy Scrapers (DEPRECATED - FAKE DATA)

### `complete_scraper.py` - **DO NOT USE**
Generates fake/simulated properties. Replaced by `king_county_scraper.py`.

### `offmarket_scraper.py` - **DO NOT USE**
Generates fake distress signals. Replaced by `king_county_scraper.py`.

### `seattle_scraper.py` - **DO NOT USE**
Original prototype with fake data. Replaced by `king_county_scraper.py`.

---

## Data Pipeline

1. **Source:** `king_county_owners` table (186K real Seattle properties)
2. **Filter criteria:**
   - District: SEATTLE
   - Lot size: >= 4000 sqft
   - Year built: >= 1900
   - Has mailing address
3. **Scoring:**
   - Absentee owner: +20 points
   - Large lot (6000+ sqft): +15 points
   - Old property (50+ years): +15 points
   - Low improvement/land ratio: +20 points
4. **Selection:** Top 100 by distress score
5. **Output:** Insert into `properties` table

---

## Verification

After running scraper, verify data quality:

```bash
cd /Users/calv/.openclaw/workspace/deal-finder
npx tsx scripts/check-match-rate-v2.ts
```

**Expected:** 95%+ match rate with King County records.

---

## Next Steps

Future enhancements:
- [ ] MLS integration for price-reduced listings
- [ ] Foreclosure notice scraping (King County records)
- [ ] GIS integration for corner lot / alley access detection
- [ ] Automated weekly refresh of properties
