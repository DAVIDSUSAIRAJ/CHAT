import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vbwxnytdfqwfboudpwub.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid3hueXRkZnF3ZmJvdWRwd3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTM5MjQsImV4cCI6MjA2MDI4OTkyNH0.BdTOR4WgdEPpJuAJPnVKUamJSL4kqfRkK0w88Wq9IwQ'

export const supabase = createClient(supabaseUrl, supabaseKey) 