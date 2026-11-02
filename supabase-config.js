const SUPABASE_URL = 'https://elekeujkqereslbntqyl.supabase.co';

const SUPABASE_KEY = 'sb_publishable_IPyk55CjzJpDqFmQp1-VqA_2gEbauTr';

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);