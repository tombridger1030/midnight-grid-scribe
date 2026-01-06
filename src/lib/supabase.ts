import { createClient } from "@supabase/supabase-js";

// Replace these with your actual Supabase project URL and anon key
export const SUPABASE_URL = "https://ojwugyeyecddsoecpffs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qd3VneWV5ZWNkZHNvZWNwZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTExODUsImV4cCI6MjA2MjAyNzE4NX0.p0VBCQCRh57UbvJ8ydGliiD963kR_FsicC4DX5TcCYY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
