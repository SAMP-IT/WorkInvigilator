import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

/**
 * Get the current user's ID and organization ID from the request
 * This assumes the user is authenticated and their token is in the Authorization header
 */
export async function getCurrentUserAndOrg(request: NextRequest): Promise<{
  userId: string | null
  organizationId: string | null
  error?: string
}> {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { userId: null, organizationId: null, error: 'No authorization header' }
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return { userId: null, organizationId: null, error: 'Invalid token' }
    }

    // Get user's profile with organization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { userId: user.id, organizationId: null, error: 'Profile not found' }
    }

    return {
      userId: user.id,
      organizationId: profile.organization_id
    }
  } catch (error) {
    return { userId: null, organizationId: null, error: 'Internal error' }
  }
}

/**
 * Simple version that just gets organization from a user ID
 */
export async function getOrganizationForUser(userId: string): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()

  return profile?.organization_id || null
}
