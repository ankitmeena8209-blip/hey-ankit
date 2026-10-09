import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://cttyettsvdofdzgkklqp.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dHlldHRzdmRvZmR6Z2trbHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MjQ0NjYsImV4cCI6MjEwNzEwMDQ2Nn0._lYZObYRR5Zrz5ONGK1HAhcLoOOg9MYf2aOt9JUC0_Q';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseUrl =
  rawUrl && rawUrl !== 'https://your-project-id.supabase.co' ? rawUrl : DEFAULT_SUPABASE_URL;

export const supabaseAnonKey =
  rawAnonKey && rawAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here'
    ? rawAnonKey
    : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
