import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zbizgmrtbqdgnyfnfasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaXpnbXJ0YnFkZ255Zm5mYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQxODAsImV4cCI6MjA4ODI0MDE4MH0.Q0HKsPnskg7cvzrPhAz4EcJvsK-H1OH_JH017Iu_KF4'
)

async function checkProperties() {
  const { data, error, count } = await supabase
    .from('properties')
    .select('id, address, city, owner_name, parcel_number', { count: 'exact' })
    .limit(10)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Total properties: ${count}`)
  console.log('\nFirst 10 properties:')
  console.log(JSON.stringify(data, null, 2))
}

checkProperties()
