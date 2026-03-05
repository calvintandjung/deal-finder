const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'
);

(async () => {
  const { data, error } = await supabase
    .from('king_county_owners')
    .select('id')
    .limit(1);
  
  if (error) {
    console.log('❌ Table does not exist:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Table exists!');
})();
