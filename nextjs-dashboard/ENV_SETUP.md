# Environment Variables Setup

To enable user creation functionality in the dashboard, you need to set up environment variables.

## Required Environment Variables

Create a `.env.local` file in the `nextjs-dashboard` directory with the following variables:

```bash
# Supabase Configuration (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://qqnmilkgltcooqzytkxy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbm1pbGtnbHRjb29xenl0a3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDYzODcsImV4cCI6MjA3NDE4MjM4N30.Et5msR4pTjO1jZdQ35pUeWYdXAdCbM8mjqSrzzaLAEs

# Service Role Key (CRITICAL - Get this from Supabase Dashboard)
# Go to: https://supabase.com/dashboard/project/qqnmilkgltcooqzytkxy/settings/api
# Copy the "service_role" key (NOT the anon key!)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional
NODE_ENV=development
```

## How to Get the Service Role Key

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `qqnmilkgltcooqzytkxy`
3. Go to Settings → API
4. Copy the **service_role** key (it's the secret one)
5. Paste it as `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` file

## Security Warning

- **NEVER** commit the `.env.local` file to git
- **NEVER** share the service role key publicly
- The service role key has full access to your database - keep it secure!

## Testing

After setting up the environment variables:
1. Restart your Next.js server: `npm run dev`
2. Try creating a new employee account in the dashboard
3. The API should now work and create users in Supabase
