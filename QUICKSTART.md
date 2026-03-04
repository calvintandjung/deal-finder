# Quick Start Guide

Get your Deal Finder platform running in 10 minutes.

## Step 1: Set Up Supabase (5 minutes)

1. Go to https://supabase.com
2. Click "Start your project"
3. Create a new project:
   - Name: `deal-finder`
   - Database Password: (create a strong password, save it)
   - Region: Choose closest to you
   - Click "Create new project"

4. Wait for project to initialize (~2 minutes)

5. Set up database:
   - Click "SQL Editor" in left sidebar
   - Click "New query"
   - Open `supabase-schema.sql` from this repo
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run" button
   - You should see "Success. No rows returned"

6. Get your credentials:
   - Click "Project Settings" (gear icon) in left sidebar
   - Click "API" section
   - Copy these two values:
     - **Project URL** (looks like `https://abcdefghij.supabase.co`)
     - **anon public** key (long string starting with `eyJ...`)

## Step 2: Deploy to Vercel (3 minutes)

1. Go to https://vercel.com/new

2. Connect GitHub (if not already):
   - Click "Continue with GitHub"
   - Authorize Vercel

3. Import project:
   - Search for `deal-finder` in your repositories
   - Click "Import"

4. Configure project:
   - Framework Preset: Next.js (should auto-detect)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)

5. Add Environment Variables:
   Click "Environment Variables" section, add:
   
   **Key**: `NEXT_PUBLIC_SUPABASE_URL`  
   **Value**: (paste your Supabase Project URL)
   
   **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   **Value**: (paste your Supabase anon public key)

6. Click "Deploy"

7. Wait for deployment (~2 minutes)

8. Click "Visit" to see your live site!

## Step 3: Add Your First Property (2 minutes)

1. On your deployed site, click "Add Property"

2. Fill in basic info:
   ```
   Address: 123 Example St
   City: Seattle
   State: WA
   ZIP: 98103
   Lot Size: 7500
   Building: 1800
   Bedrooms: 3
   Bathrooms: 2
   Year Built: 1960
   Market Value: 750000
   ```

3. Check some boxes:
   - Corner Lot: ✓
   - Has Alley Access: ✓
   - Tax Delinquent: ✓

4. Click "Save Property"

5. Watch it automatically calculate scores!

## Step 4: Try the Calculator

1. Click "Calculator" in nav

2. **Wholesaling Calculator**:
   - ARV: 500000
   - Repairs: 30000
   - Wholesale Fee: 10000
   - See MAO instantly!

3. Switch to **ADU Calculator**:
   - Purchase Price: 700000
   - Current Value: 750000
   - Lot Size: 7500
   - City: Seattle
   - See complete proforma!

## You're Done! 🎉

Your real estate deal finding platform is now live and ready to use.

## Next Steps

- Add more properties
- Try filtering and searching
- Log some outreach attempts
- Explore the active deals page
- Customize scoring parameters in Settings

## Troubleshooting

**Build failed?**
- Check environment variables are set correctly in Vercel
- Verify Supabase URL starts with `https://`
- Make sure anon key was copied fully

**Database errors?**
- Verify SQL schema was run successfully in Supabase
- Check Supabase project is active (not paused)
- Try refreshing the SQL Editor and re-running schema

**Can't add properties?**
- Open browser console (F12) and check for errors
- Verify environment variables are set
- Check Supabase connection in Settings page

## Need Help?

- Check `README.md` for full documentation
- Review `DEPLOYMENT.md` for detailed deployment steps
- See `PROJECT_SUMMARY.md` for architecture overview

---

**Total time: 10 minutes** ⏱️
