"use strict";

const SUPABASE_URL = "https://nqvugwraqtcupntaujzn.supabase.co";
const SUPABASE_KEY = "sb_publishable_SAkrcfSVDPdkrqQV5A1AkA_fRNhDx1d";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});