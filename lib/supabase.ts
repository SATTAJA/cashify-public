import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wzvllfomrhwvcjosaksy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmxsZm9tcmh3dmNqb3Nha3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDMyMjcsImV4cCI6MjA5MjE3OTIyN30.87D_bQhpEnB2KTIDtUi3cn1P61kcQglGL0f8k56qfQc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)