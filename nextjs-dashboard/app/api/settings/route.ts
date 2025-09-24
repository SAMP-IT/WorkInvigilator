import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get current user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get organization stats
    const { count: totalEmployees } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')

    const { count: activeEmployees } = await supabase
      .from('recording_sessions')
      .select('user_id', { count: 'exact', head: true })
      .is('session_end_time', null)

    // Return user settings and organization info
    const settingsData = {
      currentUser: {
        id: profile.id,
        name: profile.name || 'Unknown User',
        email: profile.email,
        role: profile.role.toUpperCase(),
        organization: 'WorkInvigilator Corp',
        department: profile.department || 'General',
        joinDate: new Date(profile.created_at).toLocaleDateString('en-GB'),
        lastLogin: new Date().toLocaleString('en-GB'),
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        avatar: (profile.name || profile.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      },
      organizationSettings: {
        name: 'WorkInvigilator Corp',
        industry: 'Employee Monitoring',
        timezone: 'UTC+00:00 (GMT)',
        workingHours: '09:00 - 17:00',
        workingDays: 'Monday - Friday',
        screenshotInterval: '5 minutes',
        dataRetention: '90 days',
        autoDelete: true
      }
    }

    return NextResponse.json(settingsData)

  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, name, email, department } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Update user profile
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        name,
        email,
        department,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      profile: updatedProfile,
      message: 'Settings updated successfully'
    })

  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}