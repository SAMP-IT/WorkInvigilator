export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  },
  dashboard: {
    name: import.meta.env.VITE_DASHBOARD_NAME || 'Work Invigilator',
    version: import.meta.env.VITE_DASHBOARD_VERSION || '2.0.0',
    description: import.meta.env.VITE_DASHBOARD_DESCRIPTION || 'Professional Work Monitoring Dashboard',
  },
  features: {
    realTimeUpdates: import.meta.env.VITE_ENABLE_REAL_TIME_UPDATES === 'true',
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    userManagement: import.meta.env.VITE_ENABLE_USER_MANAGEMENT === 'true',
    reports: import.meta.env.VITE_ENABLE_REPORTS === 'true',
    notifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
  },
  ui: {
    refreshInterval: parseInt(import.meta.env.VITE_REFRESH_INTERVAL || '30000'),
    usersPerPage: parseInt(import.meta.env.VITE_USERS_PER_PAGE || '25'),
    recordsPerPage: parseInt(import.meta.env.VITE_RECORDS_PER_PAGE || '50'),
  },
  dev: {
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  },
} as const;
