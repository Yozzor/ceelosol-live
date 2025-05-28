import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://pqrwwbwvpzvgvylgurcs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnd3Ynd2cHp2Z3Z5bGd1cmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMzY2MDMsImV4cCI6MjA2MzkxMjYwM30.VImnfOI9zUSeYcBLrjM9YOIG1h7fNCaTMiTttgZZ080';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We don't need user authentication for this app
    autoRefreshToken: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export default supabase;
