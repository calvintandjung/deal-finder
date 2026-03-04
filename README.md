# Deal Finder - Real Estate Investment Platform

A comprehensive platform for finding and analyzing real estate investment opportunities, specifically designed for:

- **Wholesaling**: Find distressed properties under market value
- **ADU/DADU Plays**: Identify properties with ADU development potential  
- **Deal Underwriting**: Analyze comparable sales and investment returns

## Features

### 🏠 Property Management
- Property database with comprehensive filtering
- Automated deal scoring (0-100)
- ADU eligibility detection
- Distress indicator tracking
- Status workflow management

### 📊 Deal Analysis
- **Wholesaling Calculator**: Calculate MAO (Maximum Allowable Offer) using the 70% rule
- **ADU/DADU Calculator**: Full proforma analysis with cash flow projections
- Comparable sales tracking
- ROI and cap rate calculations

### 📞 Outreach Tracking
- Contact attempt logging
- Follow-up scheduling
- Response tracking
- Outcome management

### 🔍 Skip Tracing Integration
- Track skip trace requests
- Store contact information
- Cost tracking per property

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd deal-finder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Set up the database:
- Go to your Supabase project
- Open the SQL Editor
- Run the contents of `supabase-schema.sql`

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

The platform uses 5 main tables:

- **properties**: Core property data, scoring, and status
- **comparable_sales**: Comp sales for each property
- **deal_analyses**: Financial analysis and underwriting
- **outreach_records**: Contact attempts and follow-ups
- **skip_trace_requests**: Skip tracing service records

See `supabase-schema.sql` for the complete schema.

## Usage Guide

### Adding Properties

1. Go to **Properties** > **Add Property**
2. Enter property details (address, lot size, owner info, etc.)
3. System auto-calculates scoring based on:
   - Distress indicators
   - ADU eligibility
   - Property characteristics

### Using the Calculator

#### Wholesaling Calculator
1. Enter **ARV** (After Repair Value)
2. Enter **Estimated Repairs**
3. Enter **Wholesale Fee**
4. Get MAO (Maximum Allowable Offer)

Formula: `MAO = (ARV × 70%) - Repairs - Wholesale Fee`

#### ADU Calculator
1. Enter **Purchase Price**
2. Enter **Current Market Value**
3. Enter **Lot Size**
4. Enter **City**
5. View complete proforma with:
   - Build costs
   - Projected value
   - Monthly cash flow
   - Cash-on-cash return
   - Cap rate

### Managing Outreach

1. Go to **Outreach** tab
2. Log contact attempts
3. Track responses
4. Schedule follow-ups
5. Update deal status

## Deal Scoring System

### Wholesaling Score (0-100)
- **Distress indicators** (40 pts): Tax delinquent, foreclosure, estate sale, etc.
- **Days owned** (20 pts): Long-term ownership indicates higher motivation
- **Property age** (15 pts): Older properties may need more work
- **Value considerations** (25 pts): Undervalued properties

### ADU Score (0-100)
- **Lot size** (30 pts): Minimum 6,000 sq ft required
- **Access** (35 pts): Corner lot or alley access preferred
- **Location/Zoning** (20 pts): ADU-friendly cities like Seattle
- **Property value** (15 pts): Higher values = better rental returns

## Data Sources

### King County Assessor
- Bulk data downloads available at: https://info.kingcounty.gov/assessor/datadownload/
- Includes ownership, values, sales history

### ADU Resources
- Seattle ADU Universe: https://aduniverse-seattlecitygis.hub.arcgis.com/
- ADU regulations by city

### Skip Tracing Services
- BatchLeads: https://batchleads.io/
- SmartSkip: https://smartskip.io/

## Deployment

### Vercel Deployment

1. Push code to GitHub:
```bash
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. Import project in Vercel:
- Go to [vercel.com](https://vercel.com)
- Click "Add New" > "Project"
- Import your GitHub repository

3. Configure environment variables in Vercel:
- Add `NEXT_PUBLIC_SUPABASE_URL`
- Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Deploy!

### Manual Deployment
```bash
npm run build
vercel --prod
```

## Business Models

### 1. Wholesaling
- Find distressed properties under market value
- Target motivated sellers (not MLS listed)
- Get under contract, assign to investor for fee
- **WA State Note**: Rescission clause and value assessment requirements apply

### 2. ADU/DADU Plays
- Find properties in ADU-friendly cities
- Requirements:
  - 6,000+ sq ft lot
  - Corner lot or alley access
  - No HOA
- Underwrite: Current value vs post-ADU value
- Build costs: ~$180k-$200k in Seattle area

### 3. Fix & Flip
- Buy distressed, renovate, resell
- Target 70% ARV rule
- Track renovation costs
- Hold time: 3-6 months typical

## Roadmap

- [ ] Zillow API integration for comps
- [ ] Automated property imports from King County
- [ ] Email/SMS outreach campaigns
- [ ] Document generation (contracts, offers)
- [ ] Mobile app
- [ ] Multi-user support with teams
- [ ] Automated valuation models (AVM)

## Contributing

Contributions welcome! Please open an issue or submit a PR.

## License

MIT License - feel free to use for your own real estate investing.

## Support

For questions or issues, please open a GitHub issue.

---

**Built for real estate investors who want to systematically find and analyze deals.**
