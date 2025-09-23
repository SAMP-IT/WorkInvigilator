// Dashboard configuration using Next.js environment variables
export const dashboardConfig = {
  // Supabase Configuration (handled in supabase.ts)

  // Dashboard Settings
  app: {
    name: process.env.NEXT_PUBLIC_DASHBOARD_NAME || 'Work Vigilator',
    version: process.env.NEXT_PUBLIC_DASHBOARD_VERSION || '2.0.0',
    description: process.env.NEXT_PUBLIC_DASHBOARD_DESCRIPTION || 'Professional Work Monitoring Dashboard',
    adminRole: 'admin',
    userRole: 'user',
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    environment: process.env.NODE_ENV || 'development'
  },

  // UI Configuration
  ui: {
    theme: 'modern',
    refreshInterval: parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '30000', 10),
    pagination: {
      usersPerPage: parseInt(process.env.NEXT_PUBLIC_USERS_PER_PAGE || '25', 10),
      recordsPerPage: parseInt(process.env.NEXT_PUBLIC_RECORDS_PER_PAGE || '50', 10)
    }
  },

  // Feature Flags
  features: {
    realTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES === 'true',
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    userManagement: process.env.NEXT_PUBLIC_ENABLE_USER_MANAGEMENT === 'true',
    reports: process.env.NEXT_PUBLIC_ENABLE_REPORTS === 'true',
    notifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === 'true'
  }
}

export default dashboardConfig