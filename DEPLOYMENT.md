# Deployment Guide

## Prerequisites

1. **Supabase Account**: https://supabase.com
2. **Vercel Account**: https://vercel.com
3. **GitHub Account**: https://github.com (✅ Done - repo created)

## Step 1: Set Up Supabase Database

1. Go to https://supabase.com and create a new project
   - Project name: `deal-finder`
   - Database password: (save this securely)
   - Region: Choose closest to your target market

2. Once the project is created, go to the SQL Editor

3. Copy and paste the entire contents of `supabase-schema.sql` and run it

4. Verify tables were created:
   - properties
   - comparable_sales
   - deal_analyses
   - outreach_records
   - skip_trace_requests

5. Get your Supabase credentials:
   - Go to Project Settings > API
   - Copy the **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - Copy the **anon public** key

## Step 2: Deploy to Vercel

### Option A: Vercel Web UI (Recommended)

1. Go to https://vercel.com/new

2. Import your GitHub repository:
   - Search for `deal-finder`
   - Click "Import"

3. Configure environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. Click "Deploy"

5. Wait for deployment to complete (~2-3 minutes)

6. Visit your deployed site!

### Option B: Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   cd /Users/calv/.openclaw/workspace/deal-finder
   vercel
   ```

3. Follow prompts:
   - Link to existing project or create new
   - Add environment variables when prompted

4. Deploy to production:
   ```bash
   vercel --prod
   ```

## Step 3: Add Environment Variables (if using Vercel CLI)

1. Go to Vercel dashboard > Your project > Settings > Environment Variables

2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Redeploy to pick up the new variables

## Step 4: Test the Deployment

1. Visit your Vercel URL (e.g., `deal-finder.vercel.app`)

2. Test adding a property:
   - Go to Properties > Add Property
   - Fill in the form
   - Click Save
   - Verify it appears in the properties list with a calculated score

3. Test the calculator:
   - Go to Calculator
   - Try both wholesaling and ADU calculators

## Custom Domain (Optional)

1. In Vercel dashboard, go to Settings > Domains

2. Add your custom domain (e.g., `dealfinder.com`)

3. Update DNS records as instructed by Vercel

## Post-Deployment

### Recommended Next Steps

1. **Add sample data** to test all features:
   - Add 5-10 properties with different characteristics
   - Test the scoring system
   - Try the calculators
   - Create some outreach records

2. **Customize for your market**:
   - Update ADU build costs in `lib/scoring.ts` if not in Seattle
   - Adjust rent estimates for your market
   - Update wholesaling parameters

3. **Set up data import**:
   - Download King County assessor data
   - Create import script (see `IMPORT.md` - TBD)

4. **Optional API integrations**:
   - BatchLeads for skip tracing
   - SmartSkip for additional data
   - Zillow API for comps (requires approval)

### Monitoring

- Check Vercel logs for errors
- Monitor Supabase usage (free tier: 500MB database, 2GB bandwidth)
- Set up alerts for critical errors

## Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Verify Supabase credentials
- Check build logs in Vercel

### Database Connection Errors
- Verify Supabase project is active
- Check API keys are correct
- Ensure RLS (Row Level Security) is disabled for now (or policies are set)

### Scoring Not Working
- Check that all number fields are properly parsed
- Verify `lib/scoring.ts` logic
- Check browser console for errors

## Security Notes

- [ ] Enable Row Level Security (RLS) in Supabase for production use
- [ ] Add authentication if sharing with team
- [ ] Keep your Supabase service role key private (don't commit it!)
- [ ] Consider adding rate limiting for API routes

## Next Phase: Data Import

See `DATA_IMPORT.md` (to be created) for:
- King County assessor data import
- Zillow scraping (within ToS)
- Bulk property uploads
