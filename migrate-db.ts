import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zbizgmrtbqdgnyfnfasl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function migrate() {
  console.log('Running migration: Add sources_used column...')
  
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: 'ALTER TABLE skip_trace_requests ADD COLUMN IF NOT EXISTS sources_used TEXT[];'
  })
  
  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
  
  console.log('✅ Migration complete!')
}

migrate()
