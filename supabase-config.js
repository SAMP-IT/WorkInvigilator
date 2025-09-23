// Supabase Configuration for Work Vigilator Extension
// Configuration is hardcoded in manifest.json for Chrome extensions

// Get configuration from manifest.json
async function getSupabaseConfigFromManifest() {
  try {
    const manifest = chrome.runtime.getManifest();
    if (manifest.supabase_config) {
      return {
        url: manifest.supabase_config.url,
        anonKey: manifest.supabase_config.anon_key
      };
    }
  } catch (error) {
    console.warn('Could not read from manifest:', error);
  }

  // Fallback configuration
  return {
    url: 'https://qqnmilkgltcooqzytkxy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbm1pbGtnbHRjb29xenl0a3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDYzODcsImV4cCI6MjA3NDE4MjM4N30.Et5msR4pTjO1jZdQ35pUeWYdXAdCbM8mjqSrzzaLAEs'
  };
}

// Initialize configuration
let SUPABASE_CONFIG = null;

// Initialize config immediately
(async function initConfig() {
  SUPABASE_CONFIG = await getSupabaseConfigFromManifest();
  console.log('🔧 Extension Supabase Config Loaded');
})();

// Initialize Supabase client
let supabase = null;

function initializeSupabase() {
  if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return supabase;
  }
  return null;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPABASE_CONFIG, initializeSupabase };
}

// For browser environment
if (typeof window !== 'undefined') {
  window.SupabaseConfig = { SUPABASE_CONFIG, initializeSupabase };
}
