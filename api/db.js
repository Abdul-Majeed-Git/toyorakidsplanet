const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client if environment variables are available
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase client initialized successfully.');
} else {
  console.warn('Supabase credentials not found. Operating in local-fallback mode.');
}

module.exports = { supabase };
