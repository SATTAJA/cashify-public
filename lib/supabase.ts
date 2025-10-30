import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://oszhgauizwdppmprxqem.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zemhnYXVpendkcHBtcHJ4cWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwODgwNjgsImV4cCI6MjA3MzY2NDA2OH0.Ahod-4LFr2FZ0w2FAK-bM8lOc_voWnEl_uGzBE7HvWU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)