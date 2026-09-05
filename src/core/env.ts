export interface Env {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  /** true when both Supabase vars are present; false means bots-only, fully local */
  online: boolean;
}

function read(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string | null {
  const raw: unknown = import.meta.env[name];
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

export const env: Env = (() => {
  const supabaseUrl = read('VITE_SUPABASE_URL');
  const supabaseAnonKey = read('VITE_SUPABASE_ANON_KEY');
  return { supabaseUrl, supabaseAnonKey, online: supabaseUrl !== null && supabaseAnonKey !== null };
})();
